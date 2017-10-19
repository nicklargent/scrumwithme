var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server, { log: false }),
    path = require('path'),
    proxy = require('express-http-proxy')
    ;

server.listen(process.env.PORT || 4000);

app.use(express.static(path.resolve(path.join(__dirname, '/../public'))));
app.get('/', function (req, res) { res.sendfile(path.resolve(__dirname + '/../public/index.html')); });
app.get('/host', function (req, res) { res.sendfile(path.resolve(__dirname + '/../public/server-flip1.html')); });
app.get('/join', function (req, res) { res.sendfile(path.resolve(__dirname + '/../public/client.html')); });
app.get('/systeminfo', function (req, res) {
    res.json({
        upTimeHours: Math.round(((new Date()) - startTime) / 3600000),
        numberOfSessions: Object.keys(sessions).length,
        numberOfSockets: io.sockets.clients().length,
        sessionStats: sessionStats
    });
});

app.use('/qrcode', proxy('chart.apis.google.com', {
    forwardPath: function(req, res) {
        var url = req.query.url;
        var size = req.query.size;
        var url_path = "/chart?cht=qr&chs=" + size + "x" + size + "&chld=L|0&chl=" + url;
        return url_path;
    }
}));


setInterval(function() {janitor();}, 3600000); // run every hour

var startTime = new Date();
var oldestSession = null;
var sessionStats = {
    averageUsersPerSession: 0,
    maxUsersPerSession: 0,
    oldestSession: null
};
var sessions = {};


io.sockets.on('connection', function (socket) {

    console.log(" ================================================");
    console.log("connection: " + socket.id);


    socket.on('bindHost', function (data) {
        console.log(" ================================================");
        console.log("bindHost: " + data.sid);
        socket.sid = data.sid;
        socket.uid = "HOST";
        socket.join(data.sid);

        if (!(data.sid in sessions)) {
            console.log("creating new session: " + data.sid);
            sessions[data.sid] = {
                sid: data.sid,
                activity: new Date(),
                users: {},
                roomType: 'planning_poker',  // planning_poker, tshirt_sizing, relative_sizing, value_pointing, multiple_choice, fist_of_five
                hostSocket: null
            };
        }
        else {
            console.log("resuming old session: " + data.sid);
        }

        sessions[data.sid].hostSocket = socket;
        sendDumpToHost(data.sid);
    });

    socket.on('bindUser', function(data) {
        console.log(" ================================================");
        console.log("bindUser: " + data.username + " to session: " + data.sid);
        socket.sid = data.sid;
        socket.uid = data.uid;
        socket.join(data.sid);

        if (!sessions[data.sid]) {
            console.log("Invalid sessionId")
            socket.emit('failure', 'Invalid Session')
            return;
        }

        var session = sessions[data.sid];

        if (!(data.uid in session.users)) {
            console.log("creating new user: " + data.username);
            session.users[data.uid] = {
                uid: data.uid,
                username: data.username,
                orgVote: null,
                vote: null,
                socket: null
            };
        }
        else {
            console.log("resuming old user: " + data.username);
            session.users[data.uid].username = data.username;
        }

        var u = session.users[data.uid];
        console.log(u);
        u.socket = socket;

        socket.emit('loggedIn');
        socket.emit('roomUpdate', {roomType: session.roomType});

        sendDumpToHost(data.sid);
    });

    socket.on('disconnect', function() {
        console.log(" ================================================");
        console.log("disconnect: " + socket.uid);

        if (sessions[socket.sid]) {
            if (sessions[socket.sid].users[socket.uid] && sessions[socket.sid].users[socket.uid].socket == socket) {
                sessions[socket.sid].users[socket.uid].socket = null;
            }
            else if (socket == sessions[socket.sid].hostSocket) {
                sessions[socket.sid].hostSocket = null;
            }
        }

        sendDumpToHost(socket.sid);
    });

    var reset = function() {
        if (sessions[socket.sid]) {
            for (var uid in sessions[socket.sid].users) {
                sessions[socket.sid].users[uid].orgVote = null;
                sessions[socket.sid].users[uid].vote = null;
            }

            io.sockets.in(socket.sid).emit('reset');
            sendDumpToHost(socket.sid);
        }
    };

    socket.on("reset", function() {
        console.log(" ================================================");
        console.log("reset: " + socket.sid);
        reset();
    });

    socket.on("vote", function(value) {
        console.log(" ================================================");
        console.log("vote: " + socket.uid);

        if (sessions[socket.sid] && sessions[socket.sid].users[socket.uid]) {
            sessions[socket.sid].users[socket.uid].vote = value;
            if (sessions[socket.sid].users[socket.uid].orgVote == null)
                sessions[socket.sid].users[socket.uid].orgVote = value;
            sendDumpToHost(socket.sid);
        }
    });

    socket.on("leave", function() {
        console.log(" ================================================");
        console.log("leave: " + socket.uid);

        if (sessions[socket.sid] && sessions[socket.sid].users[socket.uid]) {
            delete sessions[socket.sid].users[socket.uid];
            sendDumpToHost(socket.sid);
        }
    });

    socket.on("kick", function(uid) {
        console.log(" ================================================");
        console.log("kick: " + uid);

        if (sessions[socket.sid] && sessions[socket.sid].users[uid]) {
            if (sessions[socket.sid].users[uid].socket)
                sessions[socket.sid].users[uid].socket.emit('failure', 'You have been kicked');
            delete sessions[socket.sid].users[uid];
            sendDumpToHost(socket.sid);
        }
    });

    socket.on("setRoomType", function(roomType) {
        console.log(" ================================================");
        console.log("setRoomType: " + roomType);

        if (sessions[socket.sid]) {
            sessions[socket.sid].roomType = roomType;

            io.sockets.in(socket.sid).emit('roomUpdate', {roomType: sessions[socket.sid].roomType});
            reset();
            sendDumpToHost(socket.sid);
        }
    });

    var sendDumpToHost = function(sid) {
        var s = sessions[sid];
        if (s && s.hostSocket != null) {
            s.activity = new Date();

            var dump = {
                sid: s.sid,
                roomType: s.roomType,
                users: []
            }

            for (var uid in s.users) {
                dump.users.push({
                    uid: uid,
                    username: s.users[uid].username,
                    orgVote: s.users[uid].orgVote,
                    vote: s.users[uid].vote,
                    connected: s.users[uid].socket != null
                });
            }

            console.log(dump);
            s.hostSocket.emit('dump', dump);
        }
    }
});


/*
 w:604800000,
 d:86400000,
 h:3600000,
 n:60000,
 s:1000
 */

var janitor = function() {
    var d = new Date();
    sessionStats = {
        averageUsersPerSession: 0,
        maxUsersPerSession: 0,
        oldestSession: null
    };

    var totalUsers = 0;

    for (var sid in sessions) {
        var s = sessions[sid];
        if (sessionStats.oldestSession == null || s.activity < oldestSession)
            sessionStats.oldestSession = s.activity;
        var hoursOld = (d - s.activity) / 3600000;
        if (hoursOld > 3) { // cleanup
            console.log("Deleting inactive session " + sid);
            var clients = io.sockets.clients(sid);
            for (var i in clients) {
                clients[i].disconnect();
            }
            delete sessions[sid];
        } else { // add to stats
            var c = Object.keys(s.users).length;
            if (c > sessionStats.maxUsersPerSession)
                sessionStats.maxUsersPerSession = c;

            totalUsers += c;
        }
    }

    sessionStats.averageUsersPerSession = totalUsers / Object.keys(sessions).length;
}