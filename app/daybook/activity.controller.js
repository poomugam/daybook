angular.module('daybook').controller('activityController',
                                    ['$scope','$http','$filter','$stateParams','$timeout',
                                    function($scope,$http,$filter,$stateParams, $timeout){
    // console.log("controller loaded...");

    $scope.history_period = 'day';
    $scope.currency = "$";
    $scope.init = function(){
        
        $scope.categories = [
            'Spent',
            'Received',
        ];
        $scope.default_for_types = [
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
            'Profit',
            'Gift',
            'Advance',
            'Salary',
            'Misc',
            'Other'
        ];
        $scope.payment_types = [
            'Cash',
            'Card',
            'E-Cash',
            'Cheque'
        ];

        if($stateParams.token){
            $scope.token = $stateParams.token;
        }
        $scope.getActivities(new Date());

        $timeout(function(){
            $('#activity_type,#activity_by').material_select();
        },100);
    };
	
    $scope.getActivityForTypes = function(){
        var token = $scope.token || 'demo';
        $http.get('/api/activity/fortypes?token='+token).then(function(response){
            var for_types = {};
            if(response.data){
                angular.forEach(response.data.concat($scope.default_for_types), function(value, key) {
                    this[value] = null;
                }, for_types);
            }
            $('#activity_for').siblings().remove();
            $('#activity_for').autocomplete({
                data: for_types
            });
        }, function(err){});
    };

    $scope.getActivityInTypes = function(){
        var token = $scope.token || 'demo';
        $http.get('/api/activity/intypes?token='+token).then(function(response){
            var in_types = {};
            if(response.data){
                angular.forEach(response.data, function(value, key) {
                    this[value] = null;
                }, in_types);
            }
            $('#activity_in').siblings().remove();
            $('#activity_in').autocomplete({
                data: in_types
            });
        }, function(err){});
    };

    $scope.resetActivityEntry = function(date){
        $scope.activity = {
            "timestamp": date,
            "category": "Spent",
            "amount": undefined,
            "for": "",
            "in": "",
            "by": "Cash",
            "at": "",
        };
        $scope.activitydate = $scope.activity.timestamp;
        $scope.activities = [];

        $('#activity_items').material_chip({
            data:[],
            placeholder: '+Items [Enter]',
            secondaryPlaceholder: '+Item [Enter]',
        });
    }

    $scope.getActivities = function(date,period){
        date = date || $scope.activitydate || new Date();
        $scope.history_period = period || 'day'
        $scope.resetActivityEntry(date);
        // var datevalue = $filter('date')($scope.activitydate,'ddMMyyyy');
        var token = $scope.token || 'demo';
        $http.get('/api/activity/summary/'+ token + "?period="+$scope.history_period +"&timestamp="+date.getTime()).then(function(response){
            if(response.data && response.data.payload){
                $scope.activities = response.data.payload.activities;
                $scope.activity_summary = response.data.payload.all_summary;
                $scope.activity_spent_summary = response.data.payload.spent_summary;
                $scope.activity_received_summary = response.data.payload.received_summary;
            }
            $scope.getActivityForTypes();
            $scope.getActivityInTypes();
            $timeout(function(){
                $('#activity_type,#activity_by').material_select('destroy');
                $('#activity_type,#activity_by').material_select();
            },100);
        }, function(err){});
    };

    $scope.getActivityLog = function(activity){
        var activitystring = activity.category + " " +
                $scope.currency + " " +
                activity.amount + " by " +
                activity.by + " " +
                (activity.for ? (activity.category == 'Spent' ? 'for ' : 'as ' ) : '') +
                activity.for + " " +
                (activity.in ? (activity.category == 'Spent' ? 'in ' : 'from ') : '') + 
                (activity.in ? activity.in +'. ' : '.' ) ;

        return activitystring;
    };

	$scope.addActivity = function(){
        if($scope.activity && $scope.activity.amount){
            var activity = angular.copy($scope.activity);
            activity.token = $scope.token || 'demo';
            activity.timestamp = $scope.activity.timestamp.getTime();
            activity.date = $filter('date')($scope.activitydate,'ddMMyyyy') ;

            var items = $('#activity_items').material_chip('data');
            activity.items = items.map(function(obj){
                return obj.tag;
            });

            var apiurl = '/api/activity/add';
            if($scope.activity._id){
                apiurl = '/api/activity/update';
            }
            $http.post(apiurl,activity).then(function(response){                
                $scope.getActivities();
            }, function(err){});
        }
    };

	$scope.updateActivityDate = function (newdate) {
		$scope.activity.timestamp = newdate;
        $scope.setActivityDate();
	};

    $scope.setActivityDate = function(){
        if($filter('date')($scope.activitydate,'ddMMyyyy') != $filter('date')($scope.activity.timestamp,'ddMMyyyy')){
            $scope.activitydate = $scope.activity.timestamp;
            $scope.getActivities($scope.activity.timestamp);
        }else{
            $scope.activitydate = $scope.activity.timestamp;
        }
    };

    $scope.editActivity = function(activity){
        // console.log(activity);
        $scope.activity = angular.copy(activity);
        $scope.activity.timestamp = new Date(activity.timestamp);
        $scope.updateActivityDate($scope.activity.timestamp);

        var tags = [];
        if(activity.items){
            activity.items.forEach(function(value,index){
                tags.push({
                    tag:value
                });
            });
        }
        $('#activity_items').material_chip({
            data:tags,
            placeholder: '+Items [Enter]',
            secondaryPlaceholder: '+Item [Enter]',
        });
        
        $timeout(function(){
            $('#activity_type,#activity_by').material_select('destroy');
            $('#activity_type,#activity_by').material_select();
            $('#activity_amount').focus();
        },10);
    };

    $scope.deleteActivity = function(activity){
        $http.post('/api/activity/delete',activity).then(function(response){        
            $scope.getActivities();
        }, function(err){});
    };

    $scope.showActivityDetails = function(categorySummary){
        $scope.activities = categorySummary.items;
    }

}])