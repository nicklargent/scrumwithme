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
        roomType: "unknown",
        winningText: "",
        voteStatistics: [],
        qrcodeUrl: '/qrcode?size=3&url=' + encodeURIComponent(tools.buildJoinUrl(sid)),
        qrcodeUrlBig: '/qrcode?size=20&url=' + encodeURIComponent(tools.buildJoinUrl(sid)),
        users: [],
        votedUserCount: 0,
        allIn: false,
        bigRoomMode: 'auto',
        transport: 'unknown',
    };
    $scope.model = model;
    setInterval(function(){
        $scope.$apply(function() {model.transport = socket.transport();});
    }, 1000);

    $scope.reset = function() {
        socket.emit("reset");
    };

    $scope.kick = function(user) {
        socket.emit("kick", user.uid);
    };

    $scope.setRoomType = function(roomType) {
        socket.emit("setRoomType", roomType);
    };

    $scope.showConnectCode = function() {
        model.showConnectCode = !model.showConnectCode;
    };

    $scope.isBigRoom = function() {

        switch (model.bigRoomMode) {
            case 'auto':
                return model.users.length > 10;
            case 'off':
                return false;
            case 'on':
                return true;
        }
    };

    $scope.getCardContainerStyle = function() {
        return {'width': (model.users.length * 200) + 'px'};
    };

    var calc_mean = function(list) {
        var total = 0;
        for (var i in list) {
            total += list[i];
        }
        return total / list.length;
    };

    var calc_mode = function(list) {
        var maxValue = "None";
        var maxCount = 0;
        var tieCount = 0;

        for (var i in list) {
            if (list[i] != maxValue) {
                var ct = 0;
                for (var j in list) {
                    if (list[i] == list[j]) {
                        ct++;
                    }
                }

                if (ct > maxCount) {
                    maxCount = ct;
                    maxValue = list[i];
                    tieCount = 0;
                }
                else if (ct == maxCount) {
                    tieCount++;
                }
            }
        }

        return tieCount > 0 ? "Tie" : maxValue;
    };

    var calc_median = function(list) {
        return list[0];
    };

    var getWinningText = function() {
        if (model.allIn) {
            switch (model.roomType) {
                case "planning_poker":
                    break;
                case "tshirt_sizing":
                    break;
                case "relative_sizing":
                    break;
                case "value_pointing":
                    var list = model.users.map(function (u) {
                        return parseInt(u.vote);
                    });
                    var mean = calc_mean(list);
                    return "Average: " + Math.round(mean * 10.0) / 10.0;
                case "multiple_choice":
                    /*list = model.users.map(function (u) {
                        return u.vote;
                    });
                    var mode = calc_mode(list);
                    return "Winner: " + mode;*/
					break;
				case "fist_of_five":
					break;
            }
        }
        return "";
    };

    var getVoteStatistics = function() {
        var counts = {};

        for (var i in model.users) {
            var vote = model.users[i].vote;
            if (vote !== null) {
                counts[vote] = counts[vote] ? counts[vote]+1 : 1;
            }
        }

        var countList = [];
        for (var j in counts) {
            countList.push({vote: j, count: counts[j], percent: Math.round(counts[j] * 100 / model.users.length)});
        }

        countList.sort(function(a, b) {
            return b.count - a.count;
        });

        return countList;
    };

    socket.on('connect', function(){
        socket.emit('bindHost', {sid: model.sid});
    });

    socket.on('failure', function(reason) {
        console.log(reason);
        alert(reason);
    });

    socket.on('reset', function(mode) {
        model.showConnectCode = false;
    });

    socket.on('dump', function(data) {
        model.roomType = data.roomType;

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
            if(a.username < b.username) return -1;
            if(a.username > b.username) return 1;
            return 0;
        });

        model.allIn = !model.users.some(function(u) { return u.vote === null; });
        model.votedUserCount = model.users.reduce(function(total, x) {return x.vote === null ? total : total + 1;}, 0);
        model.winningText = getWinningText();
        model.voteStatistics = getVoteStatistics();

        if (model.users.length === 0)
            model.showConnectCode = true;

        if (model.users.some(function(u) { return u.vote !== null; }))
            model.showConnectCode = false;
    });

}]);