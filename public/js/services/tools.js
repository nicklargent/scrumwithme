/**
 * Created by Nick Largent on 5/23/14.
 */

angular.module('ScrumWithMe').factory('tools', function ($rootScope, $location) {

    return {
        generateSessionId: function(){
            var dict = "abcdefghjklmnpqrstuvwxyz0123456789";
            var guid = 'xxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random()*dict.length;
                return dict.charAt(r);
            });
            return guid;
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

});