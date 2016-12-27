var express     = require('express');
var path        = require('path');
var app         = express(); 
var bodyParser  = require('body-parser');
var fs          = require('fs');
var db          = require('diskdb');

app.set('port', (process.env.PORT || 9000));


db.connect('data/', ['activity']); // connect db and load collection

app.use(express.static(__dirname));

app.get('/', function(request, response) {
  response.sendFile(path.join(__dirname + '/app/index.html'));
});

var router = express.Router();              // get an instance of the express Router

router.get('/activity', function(req, res) {
    var result = db.activity.find();   
    res.json(result || {})
});

router.get('/activity/:id', function(req, res) {
    var result = db.activity.findOne({_id:req.params.id});
    res.json(result || {});
});

router.post('/activity/add', function(req, res) {
    var result  = db.activity.save(req.body);
    res.json({"status":"success","data":result});   
});

router.post('/activity/update',function(req, res){
    var data = req.body;
    var result  = db.activity.update({_id:data._id},data,{multi:false,upsert:true});
    res.json({"status":"success","data":result});  
});

router.post('/activity/update/:id',function(req, res){
    var data = req.body;
    var result  = db.activity.update({_id:req.params.id || data._id},data,{multi:false,upsert:true});
    res.json({"status":"success","data":result});  
});

router.post('/activity/delete',function(req, res){
    var data = req.body;
    var result = db.activity.remove({_id:data._id},false);
    res.json({"status":"success","data":result})
});

router.post('/activity/delete/:id',function(req, res){
    var data = req.body;
    var result = db.activity.remove({_id:req.params.id || data._id},false);
    res.json({"status":"success","data":result})
});

app.use('/api',router);

// middleware to redirect to index.html for any request for handle client side routing
// app.use(function(request, response) {
//   response.sendFile(path.join(__dirname + '/app/index.html'));
// });

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});







