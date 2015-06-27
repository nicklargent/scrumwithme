/**
 * Created by Nick Largent on 5/19/14.
 */

angular.module('ScrumWithMe').controller('ServerCtrl', ['$scope', '$location', '$timeout', '$cookieStore', 'socket', 'tools', function ($scope, $location, $timeout, $cookieStore, socket, tools) {

    $scope.newSession = function() {
        sid = tools.generateSessionId();
        window.location = tools.buildHostUrl(sid);
    };

    var sid =  $location.search().session;

    if (!sid) {
        sid = tools.generateSessionId();
        $location.search("session", sid);
    }
    else {
        sid = sid.toLowerCase();
    }

    var model = {
        sid: sid,
        joinUrl: tools.buildJoinUrl(sid),
        showConnectCode: true,
        qrcodeUrl: '/qrcode?size=100&url=' + encodeURIComponent(tools.buildJoinUrl(sid)),
        qrcodeUrlBig: '/qrcode?size=500&url=' + encodeURIComponent(tools.buildJoinUrl(sid)),
        users: [],
        allIn: false
    };
    $scope.model = model;

    $scope.reset = function() {
        socket.emit("reset");
    };

    $scope.kick = function(user) {
        socket.emit("kick", user.uid);
    };

    $scope.showConnectCode = function() {
        model.showConnectCode = !model.showConnectCode;
    };

    /*  This is needed for the basic (non flipping) view
    $scope.getCardClass = function(user) {
        if (model.allIn && user.vote >= 0) {
            return 'visible';
        }
        else if (!model.allIn && user.vote >= 0) {
            return 'hidden';
        }
        else {
            return 'unknown';
        }
    }
    */

    socket.on('connect', function(){
        socket.emit('bindHost', {sid: model.sid});
    });

    socket.on('reset', function(mode) {
        model.showConnectCode = false;
    });

    socket.on('dump', function(data) {
        var tmpUsers = {};
        for (var i in model.users) {
            tmpUsers[model.users[i].uid] = model.users[i];
        }

        for (i in data.users) {
            var user = data.users[i];
            var existing = tmpUsers[user.uid];
            if (!existing) {
                //console.log("Adding User");
                //console.log(user);
                model.users.push(user);
            }
            else {
                //console.log("Updating User");
                //console.log(user);
                tmpUsers[user.uid].username = user.username;
                tmpUsers[user.uid].orgVote = user.orgVote;
                tmpUsers[user.uid].vote = user.vote;
                tmpUsers[user.uid].connected = user.connected;
                delete tmpUsers[user.uid];
            }
        }

        // delete missing users
        for (var uid in tmpUsers) {
            //console.log("Removing User");
            //console.log(tmpUsers[uid]);
            i = model.users.indexOf(tmpUsers[uid]);
            model.users.splice(i, 1);
        }

        model.users.sort(function(a, b) {
            return a.username > b.username;
        });

        model.allIn = !model.users.some(function(u) { return u.vote === null; });

        if (model.users.length === 0)
            model.showConnectCode = true;

        if (model.users.some(function(u) { return u.vote !== null; }))
            model.showConnectCode = false;

    });

}]);