var express     = require('express');
var path        = require('path');
var app         = express(); 
var bodyParser  = require('body-parser');
var fs          = require('fs');
var db          = require('diskdb');

app.set('port', (process.env.PORT || 9000));


db.connect('data/', ['activity']); // connect db and load collection

// mongoose 4.3.x
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ActivitySchema = new Schema({
	"timestamp":Number,
	"category":String,
	"amount":Number,
	"for":String,
	"in":String,
	"by":String,
	"at":String
});

var Activity = mongoose.model('Activity',ActivitySchema);


var options = { server: { socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 } }, 
                replset: { socketOptions: { keepAlive: 300000, connectTimeoutMS : 30000 } } };       
var mongodbUri = 'mongodb://heroku_zjzb59nk:llsgih1ktiqta1h77n5dg11vkr@ds145138.mlab.com:45138/heroku_zjzb59nk';
mongoose.connect(mongodbUri, options);
var conn = mongoose.connection;             
conn.on('error', console.error.bind(console, 'connection error:'));  
conn.once('open', function() {
  // Wait for the database connection to establish, then start the app.       

    console.log("Mongodb connection established...");   

    app.use(express.static(__dirname));
    app.use(bodyParser.urlencoded());
    app.use(bodyParser.json());

    app.get('/', function(request, response) {
        response.sendFile(path.join(__dirname + '/index.html'));
    });

    var router = express.Router();              // get an instance of the express Router

    router.get('/activity', function(req, res) {
        Activity.find().sort('-timestamp').exec((err, activities) => {
            if (err) return console.error(err);
            console.log(activities);
            res.json(activities || []);
        })
    });

    router.get('/activity/:id', function(req, res) {
        Activity.findOne({_id:req.params.id}).exec((err,activity)=>{
            res.json(activity || {});
        });
    });

    router.post('/activity/add', function(req, res) {
        var activity = new Activity(req.body);

        activity.save(function (err) {
            if (err) {
                console.log("error");
                return console.error(err);
            }
            console.log("activity saved!");

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

    // router.post('/activity/delete',function(req, res){
    //     var data = req.body;
    //     var result = db.activity.remove({_id:data._id},false);
    //     res.json({"status":"success","data":result})
    // });

    // router.post('/activity/delete/:id',function(req, res){
    //     var data = req.body;
    //     var result = db.activity.remove({_id:req.params.id || data._id},false);
    //     res.json({"status":"success","data":result})
    // });

    app.use('/api',router);

    // middleware to redirect to index.html for any request for handle client side routing
    // app.use(function(request, response) {
    //   response.sendFile(path.join(__dirname + '/app/index.html'));
    // });

    app.listen(app.get('port'), function() {
        console.log('Node app is running on port', app.get('port'));
    });

}.bind(this));

// Mongoose connection













