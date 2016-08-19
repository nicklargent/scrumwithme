var io = require('socket.io-client');

var generateRandomString = function(length, includeLetters, includeNumbers){
    var dict = "";
    if (includeLetters)
        dict += "abcdefghjklmnpqrstuvwxyz";
    if (includeNumbers)
        dict += "123456789";
    var str = 'x'.repeat(length).replace(/[xy]/g, function(c) {
        var r = Math.random()*dict.length;
        return dict.charAt(r);
    });

    return str;
};

var generateUserId = function() {
    return generateRandomString(32, true, true);
};

var testClient = function(sessionId, username) {

    var model = {
        uid: generateUserId(),
        sid: sessionId,
        qrcodeUrl: '',
        showSettings: false,
        showConnectCode: false,
        newUsername: '',
        connected: false,
        loggedIn: false,
        roomType: 'unknown',
        transport: 'unknown',
        username: username,
        isLoggedIn: function () {
            return this.username && this.username.length > 0;
        },
        vote: null
    };

    var log = function(msg) {
        console.log(model.username + "> " + msg);
    };

    log("uid: " + model.uid);

    log('connecting');
    var socket = io('http://localhost:4000');

    socket.on('connect', function () {
        log('connect');
        model.connected = true;
        //model.transport = socket.transport();
        doJoin();
    });

    var doJoin = function() {
        if (model.connected && model.username) {
            socket.emit('bindUser', {sid: model.sid, uid: model.uid, username: model.username});
        }
    };

    socket.on('disconnect', function () {
        log('disconnect');
        model.connected = false;
        model.loggedIn = false;
    });

    socket.on('failure', function(reason) {
        model.connected = false;
        model.loggedIn = false;
        log(reason);
    });

    socket.on('loggedIn', function() {
        log('loggedIn');
        model.loggedIn = true;
    });

    socket.on('roomUpdate', function(room) {
        log('roomUpdate');
        model.roomType = room.roomType;
    });

    socket.on('reset', function(mode) {
        log('reset');
        model.vote = null;

        setTimeout(function() {
            log('voting...');
            var choices = new Array(1, 2,2,2, 3,3,3,3,3, 5,5,5,5, 8, 13, 20, 40, 100);
            //var choices = new Array(-5, -5, -3, -3, -3, -3, -3, -3 -1, -1,-1, 0, +1, +3, +5);
            model.vote = choices[ Math.floor(Math.random()*choices.length)];
            socket.emit('vote', model.vote);
        }, (Math.random() * 3000) + 1500);
    });

    return {
        leave: function() {
            log("leave");
            socket.emit("leave");
        }
    };
};


function getSillyName() {
    var firstName = ["Runny", "Buttercup", "Dinky", "Stinky", "Crusty",
        "Greasy", "Gidget", "Cheesypoof", "Lumpy", "Wacky", "Tiny", "Flunky",
        "Fluffy", "Zippy", "Doofus", "Gobsmacked", "Slimy", "Grimy", "Salamander",
        "Oily", "Burrito", "Bumpy", "Loopy", "Snotty", "Irving", "Egbert"];

    var lastName1 = ["Snicker", "Buffalo", "Gross", "Bubble", "Sheep",
        "Corset", "Toilet", "Lizard", "Waffle", "Kumquat", "Burger", "Chimp", "Liver",
        "Gorilla", "Rhino", "Emu", "Pizza", "Toad", "Gerbil", "Pickle", "Tofu",
        "Chicken", "Potato", "Hamster", "Lemur", "Vermin"];

    var name = firstName[ Math.floor(Math.random()*firstName.length)] + " " + lastName1[ Math.floor(Math.random()*lastName1.length)];
    return name;
}


var clients = [];
var nextIndex = 0;
var startNextClient = function() {
    clients.push(testClient('721458', getSillyName()));
    nextIndex++;
    if (nextIndex < 100)
        setTimeout(startNextClient, 1);
};
startNextClient();

var closeNextClient = function() {
    if (clients.length > 0) {
        clients.shift().leave();
        setTimeout(closeNextClient, 1);
    }
};


var stdin = process.openStdin();
stdin.on("data", function(text) {
    console.log("Shutting down....");
    closeNextClient();
});