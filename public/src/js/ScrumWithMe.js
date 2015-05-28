/**
 * Created by Nick Largent on 5/19/14.
 */
var app = angular.module('ScrumWithMe', ['ngCookies']);

app.config(['$locationProvider', function($locationProvider) {
    $locationProvider.html5Mode(true);

}]);

app.run(['$rootScope', function($rootScope) {
    $rootScope.appName = "scrumwith.me";
    $rootScope.appVersion = "{{APP.VERSION}}";
}]);