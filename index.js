var express     = require('express');
var path        = require('path');
var app         = express(); 
var bodyParser  = require('body-parser');
var fs          = require('fs');
var db          = require('diskdb');
var _           = require('lodash');

app.set('port', (process.env.PORT || 9000));


db.connect('data/', ['activity']); // connect db and load collection

// mongoose 4.3.x
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ActivitySchema = new Schema({
    "token":String,
    "type":String,
    "date":String,
	"timestamp":Number,
	"category":String,
	"amount":Number,
    "items":[String],
	"for":String,
	"in":String,
	"by":String,
	"at":String
});

var Activity = mongoose.model('Activity',ActivitySchema);

// mongo db connection
var options = { server: { socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 } }, 
                replset: { socketOptions: { keepAlive: 300000, connectTimeoutMS : 30000 } } };       
var mongodbUri = 'mongodb://heroku_zjzb59nk:llsgih1ktiqta1h77n5dg11vkr@ds145138.mlab.com:45138/heroku_zjzb59nk';
mongoose.connect(mongodbUri, options);
var conn = mongoose.connection;             
conn.on('error', console.error.bind(console, 'connection error:'));  
conn.once('open', function() {
  // Wait for the database connection to establish, then start the app.       
    bootstrapApp();
}.bind(this));
// mongo db connection

// bootstrapApp(); //need to comment above mongo db code

function bootstrapApp(){


    console.log("Mongodb connection established...");   

    app.use(express.static(__dirname));
    app.use(bodyParser.urlencoded());
    app.use(bodyParser.json());

    app.get('/', function(request, response) {
        response.sendFile(path.join(__dirname + '/index.html'));
    });

    var router = express.Router();              // get an instance of the express Router

    router.get('/activity/fortypes',function(req, res){
        Activity.find({token:req.query.token}).select('for').exec((err, fortypes) => {
            if (err) return console.error(err);
            var for_types = _.chain(fortypes).map('for').uniq().sort().value();
            res.json(for_types || []);
        })
    });

    router.get('/activity/intypes',function(req, res){
        Activity.find({token:req.query.token}).select('in').exec((err, intypes) => {
            if (err) return console.error(err);
            var in_types = _.chain(intypes).map('in').uniq().sort().value();
            res.json(in_types || []);
        })
    });

    router.get('/activity/:date', function(req, res) {
        Activity.find({token:req.query.token}).sort('-timestamp').exec((err, activities) => {
            if (err || !req.params.date) return console.error(err);
            var activities_by_date = _.filter(activities,_.matchesProperty('date',req.params.date));
            var activities_on_spent = _.filter(activities_by_date,_.matchesProperty('category','Spent'));
            var activities_on_received = _.filter(activities_by_date,_.matchesProperty('category','Received'));


            var fdate = req.params.date;
            var dt = new Date();
            dt.setHours(0,0,0,0);
            dt.setDate(parseInt(fdate.slice(0,2)));
            dt.setMonth(parseInt(fdate.slice(2,4))-1);
            dt.setYear(parseInt(fdate.slice(4)));
            var dtvalue = dt.getTime() + dt.getTimezoneOffset();
            
            var ltCurrentDate = function(obj){
                return obj.timestamp < dtvalue;
            };
            
            var all_summary = {};
            all_summary.opening_balance = _.filter(activities, ltCurrentDate)
                                            .reduce(function(sum,obj){
                                                return sum + (obj.category == 'Received' ? obj.amount : (0-obj.amount));
                                            },0);
                                            
            all_summary.spent = _.reduce(activities_on_spent,function(sum,obj){
                                    return sum + obj.amount;
                                },0);
            all_summary.received = _.reduce(activities_on_received,function(sum,obj){
                                        return sum + obj.amount;
                                    },0);
            all_summary.closing_balance = all_summary.opening_balance + all_summary.received - all_summary.spent;


            var spent_summary = _.chain(activities_on_spent)
                                .groupBy(function(obj){
                                    return obj.for;
                                }).reduce(function(result,arr,key){
                                    var sObj = {};
                                    sObj.title = key;
                                    sObj.amount = _.reduce(arr,function(sum,obj){
                                        return sum + obj.amount;
                                    },0)
                                    sObj.percent = _.ceil(_.multiply(_.divide(sObj.amount,all_summary.spent),100),1);
                                    result.push(sObj);
                                    return result;
                                },[]).sortBy('amount').reverse().value();

            var received_summary = _.chain(activities_on_received)
                                .groupBy(function(obj){
                                    return obj.for;
                                }).reduce(function(result,arr,key){
                                    var sObj = {};
                                    sObj.title = key;
                                    sObj.amount = _.reduce(arr,function(sum,obj){
                                        return sum + obj.amount;
                                    },0)
                                    sObj.percent = _.ceil(_.multiply(_.divide(sObj.amount,all_summary.received),100),1);
                                    result.push(sObj);
                                    return result;
                                },[]).sortBy('amount').reverse().value();

            var responseData = {
                status:'success',
                payload:{
                    activities:activities_by_date,
                    all_summary:all_summary,
                    spent_summary:spent_summary,
                    received_summary:received_summary

                }
            };


            res.json(responseData || []);
        })
    });

    // router.get('/activity/:id', function(req, res) {
    //     Activity.findOne({_id:req.params.id}).exec((err,activity)=>{
    //         res.json(activity || {});
    //     });
    // });

    router.post('/activity/add', function(req, res) {
        var activity = new Activity(req.body);
        activity.save(function (err) {
            if (err) {
                // console.log("error");
                return console.error(err);
            }
            // console.log("activity saved!");
            // var result  = db.activity.save(req.body);
            res.json({"status":"success"});  
        });
 
    });

    // router.post('/activity/update',function(req, res){
    //     var data = req.body;
    //     var result  = db.activity.update({_id:data._id},data,{multi:false,upsert:true});
    //     res.json({"status":"success","data":result});  
    // });

    // router.post('/activity/update/:id',function(req, res){
    //     var data = req.body;
    //     var result  = db.activity.update({_id:req.params.id || data._id},data,{multi:false,upsert:true});
    //     res.json({"status":"success","data":result});  
    // });

    router.post('/activity/delete',function(req, res){
        var data = req.body;
        Activity.findByIdAndRemove(req.params.id || data._id, function (err, activity) {  
            var response = {
                message: "success",
                id: activity._id
            };
            res.send(response);
        });
    });

    router.post('/activity/delete/:id',function(req, res){
        var data = req.body;
        Activity.findByIdAndRemove(req.params.id || data._id, function (err, activity) {  
            var response = {
                message: "success",
                id: activity._id
            };
            res.send(response);
        });
    });

    app.use('/api',router);

    // middleware to redirect to index.html for any request for handle client side routing
    // app.use(function(request, response) {
    //   response.sendFile(path.join(__dirname + '/app/index.html'));
    // });

    app.listen(app.get('port'), function() {
        console.log('Node app is running on port', app.get('port'));
    });
}
// Mongoose connection













