let express     = require('express');
let path        = require('path');
let app         = express(); 
let bodyParser  = require('body-parser');
let fs          = require('fs');
let db          = require('diskdb');
let _           = require('lodash');

app.set('port', (process.env.PORT || 9000));


db.connect('data/', ['activity']); // connect db and load collection

// mongoose 4.3.x
let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let ActivitySchema = new Schema({
    "token":String,
    "type":String,
    "date":String,
	"timestamp":Date,
	"category":String,
	"amount":Number,
    "items":[String],
	"for":String,
	"in":String,
	"by":String,
	"at":String
});

let Activity = mongoose.model('Activity',ActivitySchema);

// mongo db connection
let options = { server: { socketOptions: { keepAlive: 300000, connectTimeoutMS: 30000 } }, 
                replset: { socketOptions: { keepAlive: 300000, connectTimeoutMS : 30000 } } };       
let mongodbUri = 'mongodb://localhost:27017/daybook';

mongoose.connect(mongodbUri, options);
let conn = mongoose.connection;             
conn.on('error', console.error.bind(console, 'connection error:'));  
conn.once('open', function() {
  // Wait for the database connection to establish, then start the app.       
    bootstrapApp();
    // initDummyData();
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

    let router = express.Router();              // get an instance of the express Router

    router.get('/activity/fortypes',function(req, res){
        Activity.find({token:req.query.token}).select('for').exec((err, fortypes) => {
            if (err) return console.error(err);
            let for_types = _.chain(fortypes).map('for').uniq().sort().value();
            res.json(for_types || []);
        })
    });

    router.get('/activity/intypes',function(req, res){
        Activity.find({token:req.query.token}).select('in').exec((err, intypes) => {
            if (err) return console.error(err);
            let in_types = _.chain(intypes).map('in').uniq().sort().value();
            res.json(in_types || []);
        })
    });


    router.get('/activity/summary/:date', (req, res) => {
        let token = req.query.token;
        let fdate = req.params.date;
        let period = req.query.period;

        let dt = new Date();
        dt.setHours(0,0,0,0);
        dt.setDate(parseInt(fdate.slice(0,2)));
        dt.setMonth(parseInt(fdate.slice(2,4))-1);
        dt.setYear(parseInt(fdate.slice(4)));
        let dtvalue = dt.getTime() - dt.getTimezoneOffset();
        
        let dayStart = new Date(dtvalue);
        let dayEnd = new Date(dtvalue);
        dayEnd.setHours(23,59,59,0);


        let weekStart = new Date(dtvalue);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        let weekEnd= new Date(dtvalue);
        weekEnd.setDate(weekStart.getDate() + 7);

        let monthStart = new Date(dtvalue);
        monthStart.setDate(1);
        let monthEnd = new Date(dtvalue);
        monthEnd.setDate(
            (new Date(monthStart.getFullYear(), monthStart.getMonth()+1, 0)).getDate()
        );

        let yearStart = new Date(dtvalue);
        yearStart.setMonth(0);
        yearStart.setDate(1);
        let yearEnd = new Date(dtvalue);
        yearEnd.setMonth(11);
        yearEnd.setDate(31);

        let endDate = null;
        let startDate = null;

        switch (period){
            case 'day':
                startDate = dayStart;
                endDate = dayEnd;
                break;
            case 'week':
                startDate = weekStart;
                endDate = weekEnd;
                break;
            case 'month':
                startDate = monthStart;
                endDate = monthEnd;
                break;
            case 'year':
                startDate  = yearStart;
                endDate = yearEnd;
                break;
        }

        let aggs = [];
        agg_match = {};
        agg_match['$match'] =  {};
        agg_match['$match']['token'] = token;
        agg_match['$match']['timestamp'] = {};
        agg_match['$match']['timestamp']['$lt'] = endDate;
        agg_match['$match']['timestamp']['$gt'] = startDate;
        // agg_match['$match']['category']= 'Received';
        aggs.push(agg_match);

        agg_group = {};
        agg_group['$group'] = {};
        agg_group['$group']["docs"] = {"$push": "$$ROOT"}
        agg_group['$group']['_id'] = {};
        agg_group['$group']['_id']['category'] = "$category";
        agg_group['$group']['_id']['for'] = "$for";
        agg_group['$group']['total'] = {};
        agg_group['$group']['total']['$sum'] = "$amount";
        agg_group['$group']['count'] = {};
        agg_group['$group']['count']['$sum'] = 1;

        aggs.push(agg_group);

        agg_group_1 = {
            $group:{
                _id:{
                    category:"$_id.category"
                },
                total:{$sum:"$total"},
                for_summary:{
                    $push:'$$ROOT'
                },
                items:{
                    $push:"$docs"
                }
            }
        };

        aggs.push(agg_group_1);

        Activity.aggregate(aggs, function (err, result) {
            if (err) {
                console.log(err);
                return;
            }

            let all_summary = {};
            all_summary.opening_balance = 0;
            all_summary.closing_balance = 0;
            all_summary.spent = 0;
            all_summary.received = 0;

            let spent_summary = {};

            let received_summary = {};

            let responseData = {
                status:'success',
                payload:{
                    activities:result,
                    all_summary:all_summary,
                    spent_summary:spent_summary,
                    received_summary:received_summary

                }
            };
            res.json(responseData || []);
        });

    });

    router.get('/activity/:token', function(req, res) {
        Activity.find({token:req.params.token}).sort('timestamp').exec((err, activities) => {
            if (err) return console.error(err);
            res.json(activities || []);
        });
    });

    router.get('/activity/:date', function(req, res) {
        Activity.find({token:req.query.token}).sort('-timestamp').exec((err, activities) => {
            if (err || !req.params.date) return console.error(err);
            let activities_by_date = _.filter(activities,_.matchesProperty('date',req.params.date));
            let activities_on_spent = _.filter(activities_by_date,_.matchesProperty('category','Spent'));
            let activities_on_received = _.filter(activities_by_date,_.matchesProperty('category','Received'));


            let fdate = req.params.date;
            let dt = new Date();
            dt.setHours(0,0,0,0);
            dt.setDate(parseInt(fdate.slice(0,2)));
            dt.setMonth(parseInt(fdate.slice(2,4))-1);
            dt.setYear(parseInt(fdate.slice(4)));
            let dtvalue = dt.getTime() + dt.getTimezoneOffset();
            
            let ltCurrentDate = function(obj){
                return obj.timestamp < dtvalue;
            };
            
            let all_summary = {};
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


            let spent_summary = _.chain(activities_on_spent)
                                .groupBy(function(obj){
                                    return obj.for;
                                }).reduce(function(result,arr,key){
                                    let sObj = {};
                                    sObj.title = key;
                                    sObj.amount = _.reduce(arr,function(sum,obj){
                                        return sum + obj.amount;
                                    },0)
                                    sObj.percent = _.ceil(_.multiply(_.divide(sObj.amount,all_summary.spent),100),1);
                                    result.push(sObj);
                                    return result;
                                },[]).sortBy('amount').reverse().value();

            let received_summary = _.chain(activities_on_received)
                                .groupBy(function(obj){
                                    return obj.for;
                                }).reduce(function(result,arr,key){
                                    let sObj = {};
                                    sObj.title = key;
                                    sObj.amount = _.reduce(arr,function(sum,obj){
                                        return sum + obj.amount;
                                    },0)
                                    sObj.percent = _.ceil(_.multiply(_.divide(sObj.amount,all_summary.received),100),1);
                                    result.push(sObj);
                                    return result;
                                },[]).sortBy('amount').reverse().value();

            let responseData = {
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
        let activity = new Activity(req.body);
        activity.save(function (err) {
            if (err) {
                // console.log("error");
                return console.error(err);
            }
            // console.log("activity saved!");
            // let result  = db.activity.save(req.body);
            res.json({"status":"success"});  
        });
 
    });

    router.post('/activity/update',function(req, res){
        let activity = req.body;
        let data = req.body;
        Activity.update({_id:activity._id},activity,{multi:false,upsert:true},function(err,numaff){

            res.json({"status":"success","data":numaff}); 
        });

    });

    // router.post('/activity/update/:id',function(req, res){
    //     let data = req.body;
    //     let result  = db.activity.update({_id:req.params.id || data._id},data,{multi:false,upsert:true});
    //     res.json({"status":"success","data":result});  
    // });

    router.post('/activity/delete',function(req, res){
        let data = req.body;
        Activity.findByIdAndRemove(req.params.id || data._id, function (err, activity) {  
            let response = {
                message: "success",
                id: activity._id
            };
            res.send(response);
        });
    });

    router.post('/activity/delete/:id',function(req, res){
        let data = req.body;
        Activity.findByIdAndRemove(req.params.id || data._id, function (err, activity) {  
            let response = {
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




function formatDate(date) {
  let mm = date.getMonth() + 1; // getMonth() is zero-based
  let dd = date.getDate();

  return [
            (dd>9 ? '' : '0') + dd,
            (mm>9 ? '' : '0') + mm,
            date.getFullYear()
        ].join('');
};

function initDummyData(){

    let sampleData = {
        "category":[
            {
                "title":"Spent",
                "for_types":[
                    'Food',
                    'Snacks',
                    'Fish',
                    'Chicken',
                    'Meat',
                    'Groceries',
                    'Vegetables',
                    'Fruits',
                    'Transport',
                    'Household',
                    'Utility',
                    'Electronics',
                    'Lifestyle',
                    'Medical',
                    'Loan',
                    'Other',
                    'Misc'
                ]
            },
            {
                "title":"Received",
                "for_types":[
                    'Profit',
                    'Gift',
                    'Advance',
                    'Loan',
                    'Salary',
                    'Misc',
                    'Other'
                ]
            }
        ],
        "payment_types":[
            'Cash',
            'Card',
            'E-Cash',
            'Cheque'            
        ],
        "food_items":[
            "dosai",
            "idly",
            "chappathi",
            "biriyani",
            "idiyappam",
            "meals",
            "noodles"
        ],
        "groceries_items":[
            "coconut",
            "milk",
            "sugar",
            "rice",
            "oil"
        ]
    };
    
    let sdtObj = new Date();
    _.times(100,(n)=>{
        let dtObj = new Date(sdtObj.getTime() + (1000*60*60*24*30) - (1000*60*60*24*(_.random(0,50))))
        dtObj.setHours(_.random(8,20),_.random(0,50));
        let category = _.sample(sampleData.category);
        let amount = 0;
        if(category.title == 'Spent'){
            amount = _.random(5,300);
        }else{
            amount = _.sample(['200','500','150','1050','2000','1300','1850']);
        }
        let for_type = _.sample(category.for_types);
        let items = [];
        if(for_type == 'Food'){
            items = _.sample(sampleData.food_items,_.random(1,3));
        }else if(for_type == 'Groceries'){
            items = _.sample(sampleData.groceries_items,_.random(1,3));
        }

        let activity = new Activity({
            "timestamp": dtObj,
            "category": category.title,
            "amount": _.round(amount,1),
            "for": for_type,
            "in": "ABC",
            "by": _.sample(sampleData.payment_types),
            "at": "",
            "token": "demo",
            "date": formatDate(dtObj),
            "items": items
        });
        activity.save( (err) => {
            if (err) {
                // console.log("error");
                return console.error(err);
            }
            console.log("document saved..."+n);
        });
    })



}









