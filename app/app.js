angular
	.module('daybook',[])
	.controller('activityController',['$scope','$http',function($scope,$http){
	console.log("controller loaded...");
	
		$('.dropdown-content li').click(function(eObj){
        console.log(eObj.currentTarget);
        var selectedVal = $(eObj.currentTarget).text();
        var targetElement = $(eObj.currentTarget).parent().siblings('a');

        $(targetElement).text(selectedVal);
    });
		
		
		$scope.activities = [1,2,3,4,5];
		
		
		
}]);