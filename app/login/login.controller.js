angular.module('daybook').controller('loginController',['$scope','$http','$state',function($scope,$http,$state){
    // console.log("controller loaded...");

    $scope.tokenlogin = function(){
        $state.go('activity',{token:$scope.logintoken})
    }

}]);