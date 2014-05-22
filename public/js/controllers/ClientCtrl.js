/**
 * Created by Nick Largent on 5/19/14.
 */

angular.module('ScrumWithMe').controller('ClientCtrl', function ($scope, $location, $cookieStore, socket) {

    var model = {
        sessionName: $location.search().session,
        newUsername: '',
        connected: false,
        loggedIn: false,
        username: $cookieStore.get('username') || '',
        isLoggedIn: function() {
            return this.username != null && this.username.length > 0;
        },
        vote: -1
    };
    $scope.model = model;

    $scope.vote = function(value) {
        model.vote = value;
        socket.emit('vote', value);
    }

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
    }

    $scope.logout = function() {
        $cookieStore.put('username', null);
        window.location.reload();
    }

    $scope.join = function() {
        model.username = model.newUsername;
        $cookieStore.put('username', model.newUsername);
        doJoin();
    }

    $scope.connectedIcon = function() {
        if (model.loggedIn)
            return "LED_on.png";
        else
            return "LED_off.png";
    }

    var doJoin = function() {
        if (model.connected && model.username) {
            socket.emit('bindUser', {sessionid: model.sessionName, username: model.username});
        }
    }

    socket.on('ping', function(data){
        console.log('ping: ' + data);
        socket.emit('pong', data);
    });
});