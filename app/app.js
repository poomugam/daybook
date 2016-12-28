angular.module('daybook',[])
.controller('activityController',['$scope','$http',function($scope,$http){
    console.log("controller loaded...");


    
    $scope.getCurrentDate = function(){
        return (new Date()).getTime();
    }

    $scope.init = function(){
        
        $scope.categories = ['Spent','Received'];
        $scope.for_types = ['Food','Groceries','Transport','Utility','Household','Lifestyle','Medical','Gift','Misc'];
        $scope.payment_types = ['Cash','Card','Other'];

        $scope.activity = {
            "timestamp": new Date(),
            "category": "Spent",
            "amount": undefined,
            "for": "Food",
            "in": "",
            "by": "Cash",
            "at": "",
        };


        $scope.activities = [];
        $http.get('/api/activity').then(function(response){
            $scope.activities = response.data;
        }, function(err){});
    }
	
	$scope.addActivity = function(){
        if($scope.activity && $scope.activity.amount){
            var activity = angular.copy($scope.activity);
            activity.timestamp = $scope.activity.timestamp.getTime();
            $http.post('/api/activity/add',activity).then(function(response){        
                $http.get('/api/activity').then(function(response){
                    $scope.activities = response.data;

                    $scope.activity = {
                        "timestamp": new Date(),
                        "category": "Spent",
                        "amount": undefined,
                        "for": "Food",
                        "in": "",
                        "by": "Cash",
                        "at": "",
                    };

                }, function(err){});
            }, function(err){});


        }
    }
		
}]);