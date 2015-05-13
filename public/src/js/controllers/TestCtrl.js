/**
 * Created by nslargent on 5/20/14.
 */

angular.module('ScrumWithMe').controller('TestCtrl', ['$scope', function ($scope) {

    $scope.username = 'World';

    $scope.sayHello = function() {
        $scope.greeting = 'Hello ' + $scope.username + '!';
    };

}]);