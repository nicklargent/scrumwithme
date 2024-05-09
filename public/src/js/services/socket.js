angular.module('ScrumWithMe').factory('socket', ['$rootScope', '$location', function ($rootScope, $location) {
    //console.log($location);
    //var socketUrl = $location.protocol() + "://" + $location.host() + ":4000";
    //var socket = io.connect(socketUrl);
    var socket = io.connect();

    return {
        transport: function() {
            if (socket.io.engine.transport)
                return socket.io.engine.transport.name;
            else
                return "UNKNOWN";
        },
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
            });
        }
    };
}]);
