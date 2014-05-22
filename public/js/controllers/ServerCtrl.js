/**
 * Created by Nick Largent on 5/19/14.
 */
'use strict';

angular.module('ScrumWithMe').controller('ServerCtrl', function ($scope, $location, $timeout, $cookieStore, socket) {

    var generateSessionId = function(){
        var dict = "abcdefghjklmnpqrstuvwxyz0123456789";
        var guid = 'xxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*dict.length;
            return dict.charAt(r);
        });
        $cookieStore.put('sessionid', guid);
        return guid;
    };

    var buildJoinUrl = function(uuid) {
        console.log(window.location);
        return "/join?session=" + uuid;
    }

    var sessionId = $cookieStore.get('sessionid') || generateSessionId();

    var model = {
        sessionId: sessionId,
        joinUrl: buildJoinUrl(sessionId),
        qrcodeUrl: 'http://chart.apis.google.com/chart?cht=qr&chs=150x150&chl=' + encodeURIComponent(buildJoinUrl(sessionId)),
        cardBackImage: '/cardback-gear.jpg',
        users: [],
        allIn: false
    };
    $scope.model = model;

    $scope.reset = function() {
        socket.emit("reset");
    }

    $scope.newSession = function() {
        $cookieStore.put('sessionid', null);
        window.location.reload();
    }

    $scope.kick = function(user) {
        socket.emit("kick", user.name);
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
        socket.emit('bindHost', {sessionid: model.sessionId});
    });

    socket.on('dump', function(data) {
        model.users = data.users;
        var allIn = data.users.reduce(function(total, user) { return total + (user.vote >= 0 ? 1 : 0)}, 0) == data.users.length;

        if (model.allIn != allIn) {
            $timeout(function() {
                model.allIn = allIn;
            }, 50);
        }

    });

    socket.on('ping', function(data){
        console.log('ping: ' + data);
        socket.emit('pong', data);
    });

});