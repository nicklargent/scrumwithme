/**
 * Created by Nick Largent on 5/23/14.
 */

String.prototype.repeat = function( num )
{
    return new Array( num + 1 ).join( this );
};

angular.module('ScrumWithMe').factory('tools', ['$rootScope', '$location', function ($rootScope, $location) {

    return {

        generateRandomString: function(length){
            var dict = "abcdefghjklmnpqrstuvwxyz0123456789";
            var str = 'x'.repeat(length).replace(/[xy]/g, function(c) {
                var r = Math.random()*dict.length;
                return dict.charAt(r);
            });
            return str;
        },

        generateSessionId: function() {
            return this.generateRandomString(6);
        },

        generateUserId: function() {
            return this.generateRandomString(32);
        },

        buildHostUrl: function(uuid) {
            var url = window.location.protocol + "//" + window.location.host;
            url += "/host?session=" + uuid;
            return url;
        },

        buildJoinUrl: function(uuid) {
            var url = window.location.protocol + "//" + window.location.host;
            url += "/join?session=" + uuid;
            return url;
        }
    };

}]);