var express = require('express')();
var http = require('http');
var server = http.Server(express);
var Player = require('./player.js');
var io = require('socket.io')(server, {pingTimeout: 2000});

var connected = 0;

express.get('/', function (req, res) {
	    res.sendFile('/var/www/angelescott.com/public_html/jamchat/index.html');
});

server.listen(8080, function () {
    console.log('listening on *:8080');
});

var player = new Player(express);

io.on('connection', function (socket) {
    connected++;
    console.log('a user connected');
    io.emit('usersOnline', connected);
    socket.on('disconnect', function () {
        connected--;
        console.log('a user disconnected');
        io.emit('usersOnline', connected);
    });

    socket.on('chat message', function (id, msg) {
        console.log('message: ' + msg);
        io.emit('chat message', id, msg);
    });
});
