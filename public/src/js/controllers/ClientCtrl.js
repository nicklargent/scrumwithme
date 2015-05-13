/**
 * Created by Nick Largent on 5/19/14.
 */

angular.module('ScrumWithMe').controller('ClientCtrl', ['$scope', '$location', '$cookieStore', 'socket', 'tools', function ($scope, $location, $cookieStore, socket, tools) {

    var getUser = function() {
        var uid = $cookieStore.get('uid');
        if (uid)
            return uid;
        uid = tools.generateUserId();
        $cookieStore.put('uid', uid);
        return uid;
    };

    var model = {
        uid: getUser(),
        sid: $location.search().session,
        showSettings: false,
        newUsername: '',
        connected: false,
        loggedIn: false,
        username: $cookieStore.get('username') || '',
        isLoggedIn: function() {
            return this.username && this.username.length > 0;
        },
        vote: -1
    };
    $scope.model = model;

    $scope.vote = function(value) {
        if (value == model.vote)
            value = null;
        model.vote = value;
        socket.emit('vote', value);
    };

    $scope.showSettings = function() {
        model.newUsername = model.username;
        model.showSettings = true;
    };

    $scope.saveSettings = function() {
        $scope.join();
        model.showSettings = false;
    };

    $scope.cancelSettings = function() {
        model.showSettings = false;
    };

    socket.on('connect', function(){
        model.connected = true;
        doJoin();
    });

    socket.on('disconnect', function() {
        model.connected = false;
        model.loggedIn = false;
    });

    socket.on('failure', function(reason) {
        model.connected = false;
        model.loggedIn = false;
        console.log(reason);
        alert(reason);
    });

    socket.on('loggedIn', function() {
        model.loggedIn = true;
    });

    socket.on('reset', function(mode) {
        model.vote = -1;
    });

    $scope.reset = function() {
        socket.emit("reset");
    };

    $scope.leave = function() {
        socket.emit("leave");
        window.location = "/";
    };

    $scope.join = function() {
        model.username = model.newUsername;
        $cookieStore.put('username', model.newUsername);
        doJoin();
    };

    $scope.connectedIcon = function() {
        if (model.loggedIn)
            return "LED_on.png";
        else
            return "LED_off.png";
    };

    var doJoin = function() {
        if (model.connected && model.username) {
            socket.emit('bindUser', {sid: model.sid, uid: model.uid, username: model.username});
        }
    };
}]);