var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server, { log: false }),
    path = require('path')
    ;

server.listen(4000);

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', function (req, res) { res.sendfile(__dirname + '/index.html'); });
app.get('/host', function (req, res) { res.sendfile(__dirname + '/server-flip1.html'); });
app.get('/join', function (req, res) { res.sendfile(__dirname + '/client.html'); });

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
                users: {},
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

    socket.on("reset", function() {
        console.log(" ================================================");
        console.log("reset: " + socket.sid);

        if (sessions[socket.sid]) {
            for (var uid in sessions[socket.sid].users) {
                sessions[socket.sid].users[uid].vote = null;
            }

            io.sockets.in(socket.sid).emit('reset');
            sendDumpToHost(socket.sid);
        }
    });

    socket.on("vote", function(value) {
        console.log(" ================================================");
        console.log("vote: " + socket.uid);

        if (sessions[socket.sid] && sessions[socket.sid].users[socket.uid]) {
            sessions[socket.sid].users[socket.uid].vote = value;
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

    var sendDumpToHost = function(sid) {
        var s = sessions[sid];
        if (s && s.hostSocket != null) {
            var dump = {
                sid: s.sid,
                users: []
            }

            for (var uid in s.users) {
                dump.users.push({
                    uid: uid,
                    username: s.users[uid].username,
                    vote: s.users[uid].vote,
                    connected: s.users[uid].socket != null
                });
            }

            dump.users.sort(function(a, b) {
                return a.username > b.username;
            });

            console.log(dump);
            s.hostSocket.emit('dump', dump);
        }
    }
});

setInterval(function() {
    io.sockets.emit('ping', new Date());
}, 15000);
