angular.module('ScrumWithMe').factory('socket', function ($rootScope, $location) {
    //console.log($location);
    var socketUrl = $location.protocol() + "://" + $location.host() + ":4000";
    var socket = io.connect(socketUrl);
    return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            })
        }
    };
});