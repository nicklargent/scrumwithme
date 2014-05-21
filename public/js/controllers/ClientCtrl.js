/**
 * Created by Nick Largent on 5/19/14.
 */

angular.module('ScrumWithMe').controller('ClientCtrl', function ($scope, $location, $cookieStore, socket) {

    var model = {
        sessionName: $location.search().session,
        newUsername: '',
        connected: false,
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