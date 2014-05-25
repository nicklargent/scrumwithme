/**
 * Created by Nick Largent on 5/19/14.
 */
'use strict';

angular.module('ScrumWithMe').controller('ServerCtrl', function ($scope, $location, $timeout, $cookieStore, socket, tools) {

    $scope.newSession = function() {
        sid = tools.generateSessionId();
        window.location = tools.buildHostUrl(sid);
    }

    var sid =  $location.search().session;

    if (sid == null) {
        $scope.newSession();
    }

    var model = {
        sid: sid,
        joinUrl: tools.buildJoinUrl(sid),
        qrcodeUrl: 'http://chart.apis.google.com/chart?cht=qr&chs=150x150&chl=' + encodeURIComponent(tools.buildJoinUrl(sid)),
        cardBackImage: '/cardback-gear.jpg',
        users: [],
        allIn: false
    };
    $scope.model = model;

    $scope.reset = function() {
        socket.emit("reset");
    }

    $scope.kick = function(user) {
        socket.emit("kick", user.uid);
    }

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


    var timer = null;

    socket.on('dump', function(data) {
        var allIn = !data.users.some(function(u) { return u.vote == null });

        if (timer != null) {
            $timeout.cancel(timer);
            timer = null;
        }

        if (model.allIn == allIn) {
            model.users = data.users;
        }
        else if (model.allIn) {
            model.allIn = allIn;
            timer = $timeout(function() {
                timer = null;
                model.users = data.users;
            }, 550);
        }
        else if (!model.allIn) {
            model.users = data.users;
            timer = $timeout(function() {
                timer = null;
                model.allIn = allIn;
            }, 50);
        }

    });

    socket.on('ping', function(data){
        socket.emit('pong', data);
    });

});