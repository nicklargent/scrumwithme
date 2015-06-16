angular.module('ScrumWithMe').factory('socket', ['$rootScope', '$location', function ($rootScope, $location) {
    //console.log($location);
    var socketUrl = $location.protocol() + "://" + $location.host();
    var socket = io.connect(socketUrl);

    return {
        transport: function() {
            if (socket.socket.transport)
                return socket.socket.transport.name;
            else
                return "unknown";
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