var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    path = require('path'),
    qr = require('qr-image')
    ;

const {Server} = require("socket.io");
const io = new Server(server, {});

const PORT = process.env.PORT || 4000;
console.log("Listening on port " + PORT);
server.listen(PORT);

app.use(express.static(path.resolve(path.join(__dirname, '/../public'))));
app.get('/', function (req, res) { res.sendFile(path.resolve(__dirname + '/../public/index.html')); });
app.get('/host', function (req, res) { res.sendFile(path.resolve(__dirname + '/../public/server-flip1.html')); });
app.get('/join', function (req, res) { res.sendFile(path.resolve(__dirname + '/../public/client.html')); });
app.get('/systeminfo', function (req, res) {
    res.json({
        upTimeHours: Math.round(((new Date()) - startTime) / 3600000),
        numberOfSessions: Object.keys(sessions).length,
        numberOfSockets: io.sockets.sockets.size,
        sessionStats: sessionStats
    });
});

app.use('/qrcode', function (req, res) {
    if (req.query.size > 50)
        return res.end("Error");
    var code = qr.image(req.query.url, {type: 'png', ec_level: 'L', size: parseInt(req.query.size), margin: 1});
    code.pipe(res);
});


setInterval(function() {janitor();}, 3600000); // run every hour

var startTime = new Date();
var oldestSession = null;
var sessionStats = {
    averageUsersPerSession: 0,
    maxUsersPerSession: 0,
    oldestSession: null
};
var sessions = {};

function log(socket, msg) {
    if (socket) {
        if (socket.sid) {
            if (socket.username) {
                console.log(`Session ${socket.sid}: <${socket.username}> ${msg}`);
            } else {
                console.log(`Session ${socket.sid}: ${msg}`);
            }
        } else {
            console.log(`** SOCKET ${socket.id}: ${msg}`);
        }
    } else {
        console.log(msg);
    }
}

io.sockets.on('connection', function (socket) {
    log(socket, 'connected');

    socket.on('bindHost', function (data) {
        log(socket, `bindHost to session ${data.sid}`);
        socket.sid = data.sid;
        socket.uid = "HOST";
        socket.username = "HOST";
        socket.join(data.sid);

        if (!(data.sid in sessions)) {
            log(socket, "starting new session");
            sessions[data.sid] = {
                sid: data.sid,
                activity: new Date(),
                users: {},
                roomType: 'planning_poker',  // planning_poker, tshirt_sizing, relative_sizing, value_pointing, multiple_choice, fist_of_five
                hostSocket: null
            };
        }
        else {
            log(socket, "resuming old session");
        }

        if (sessions[data.sid].hostSocket) {
            log(socket, `<< kicking old host ${sessions[data.sid].hostSocket.id}`);
            sessions[data.sid].hostSocket.emit('failure', 'You have been replaced by a new host');
        }
        sessions[data.sid].hostSocket = socket;

        sendDumpToHost(data.sid);
    });

    socket.on('bindUser', function(data) {
        log(socket, `bindUser ${data.username} to session ${data.sid} with uid ${data.uid}`);
        if (!sessions[data.sid]) {
            log(socket, `Invalid sessionId ${data.sid}`);
            socket.emit('failure', 'Invalid Session')
            return;
        }

        socket.sid = data.sid;
        socket.uid = data.uid;
        socket.username = data.username;
        socket.join(data.sid);

        var session = sessions[data.sid];

        if (!(data.uid in session.users)) {
            log(socket, `new user joined`);
            session.users[data.uid] = {
                uid: data.uid,
                username: data.username,
                orgVote: null,
                vote: null,
                socket: null
            };
        }
        else {
            log(socket, `old user joined: ${data.uid} (${session.users[data.uid].username})`);
            session.users[data.uid].username = data.username;
        }

        var u = session.users[data.uid];
        //console.log(" User:", u);
        u.socket = socket;        

        socket.emit('loggedIn');
        socket.emit('roomUpdate', {roomType: session.roomType});

        sendDumpToHost(data.sid);
    });

    socket.on('disconnect', function() {
        log(socket, `disconnected`);

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
        log(socket, `reset`);
        reset();
    });

    socket.on("vote", function(value) {        
        log(socket, `vote ${value}`);
        if (sessions[socket.sid] && sessions[socket.sid].users[socket.uid]) {
            let user = sessions[socket.sid].users[socket.uid];
            user.vote = value;
            if (user.orgVote == null)
                user.orgVote = value;
            sendDumpToHost(socket.sid);
        }
    });

    socket.on("leave", function() {
        log(socket, `leaves`);

        if (sessions[socket.sid] && sessions[socket.sid].users[socket.uid]) {
            delete sessions[socket.sid].users[socket.uid];
            sendDumpToHost(socket.sid);
        }
    });

    socket.on("kick", function(uid) {
        log(socket, `kick ${uid}`);

        if (sessions[socket.sid] && sessions[socket.sid].users[uid]) {
            if (sessions[socket.sid].users[uid].socket)
                sessions[socket.sid].users[uid].socket.emit('failure', 'You have been kicked');
            delete sessions[socket.sid].users[uid];
            sendDumpToHost(socket.sid);
        }
    });

    socket.on("setRoomType", function(roomType) {
        log(socket, `setRoomType ${roomType}`);

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

            //console.log("HOST Dump:", dump);
            log(s.hostSocket, `<< dumping update to socket ${s.hostSocket.id}`);
            s.hostSocket.emit('dump', dump);
        } else {
            log(s, `No host for dump`);
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
            console.log("## Deleting inactive session " + sid);
            //var clients = io.sockets.clients(sid);
            var clients = io.sockets.adapter.rooms[sid];
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