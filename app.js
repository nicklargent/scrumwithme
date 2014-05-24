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
        console.log("bindHost: " + data.sessionid);
        socket.sessionid = data.sessionid;
        socket.username = "HOST";
        socket.join(data.sessionid);

        if (!(data.sessionid in sessions)) {
            console.log("creating new session: " + data.sessionid);
            sessions[data.sessionid] = {
                id: data.sessionid,
                users: {},
                hostSocket: null
            };
        }
        else {
            console.log("resuming old session: " + data.sessionid);
        }

        sessions[data.sessionid].hostSocket = socket;
        sendDumpToHost(data.sessionid);
    });

    socket.on('bindUser', function(data) {
        console.log(" ================================================");
        console.log("bindUser: " + data.username + " to session: " + data.sessionid);
        socket.sessionid = data.sessionid;
        socket.username = data.username;
        socket.join(data.sessionid);

        if (!sessions[data.sessionid]) {
            console.log("Invalid sessionId")
            socket.emit('failure', 'Invalid Session')
            return;
        }

        var session = sessions[data.sessionid];

        if (!(data.username in session.users)) {
            console.log("creating new user: " + data.username);
            session.users[data.username] = {
                username: data.username,
                vote: null,
                socket: null
            };
        }
        else {
            console.log("resuming old user: " + data.username);
        }

        var u = session.users[data.username];
        console.log(u);
        u.socket = socket;

        socket.emit('loggedIn');
        sendDumpToHost(data.sessionid);
    });

    socket.on('disconnect', function() {
        console.log(" ================================================");
        console.log("disconnect: " + socket.username);

        if (sessions[socket.sessionid]
            && sessions[socket.sessionid].users[socket.username]
            && sessions[socket.sessionid].users[socket.username].socket == socket) {
            delete sessions[socket.sessionid].users[socket.username];
            if (socket == sessions[socket.sessionid].hostSocket) {
                sessions[socket.sessionid].hostSocket = null;
            }
        }

        sendDumpToHost(socket.sessionid);
    });

    socket.on("reset", function() {
        console.log(" ================================================");
        console.log("reset: " + socket.sessionid);

        if (sessions[socket.sessionid]) {
            for (var key in sessions[socket.sessionid].users) {
                sessions[socket.sessionid].users[key].vote = null;
            }

            io.sockets.in(socket.sessionid).emit('reset');
            sendDumpToHost(socket.sessionid);
        }
    });

    socket.on("vote", function(value) {
        console.log(" ================================================");
        console.log("vote: " + socket.username);

        if (sessions[socket.sessionid] && sessions[socket.sessionid].users[socket.username]) {
            sessions[socket.sessionid].users[socket.username].vote = value;
            sendDumpToHost(socket.sessionid);
        }
    });

    socket.on("kick", function(username) {
        console.log(" ================================================");
        console.log("kick: " + username);

        if (sessions[socket.sessionid] && sessions[socket.sessionid].users[username]) {
            sessions[socket.sessionid].users[username].socket.emit('failure', 'You have been kicked');
            delete sessions[socket.sessionid].users[username];
            sendDumpToHost(socket.sessionid);
        }
    });

    var sendDumpToHost = function(sessionid) {
        var s = sessions[sessionid];
        if (s && s.hostSocket != null) {
            var dump = {
                id: s.id,
                users: []
            }

            for (var key in s.users) {
                dump.users.push({
                    name: s.users[key].username,
                    vote: s.users[key].vote
                });
            }

            dump.users.sort(function(a, b) {
                return a.name > b.name;
            });

            console.log(dump);
            s.hostSocket.emit('dump', dump);
        }
    }
});

setInterval(function() {
    io.sockets.emit('ping', new Date());
}, 15000);
