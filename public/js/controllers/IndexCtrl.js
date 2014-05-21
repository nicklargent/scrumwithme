/**
 * Created by nslargent on 5/20/14.
 */

angular.module('ScrumWithMe').controller('IndexCtrl', ['$scope', '$window', function ($scope, $window) {

    $scope.sessionid = '';

    $scope.host = function() {
        $window.location = "/host";
    }

    $scope.join = function() {
        $window.location = "/join?session=" + $scope.sessionid.toLowerCase();
    }

}]);