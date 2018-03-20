var express = require('express')();
var http = require('http');
var server = http.Server(express);
var Player = require('./player.js');
var io = require('socket.io')(server, {pingTimeout: 30000});


server.listen(8080, function () {
    console.log('listening on *:8082');
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

    socket.on('chat message', function (msg) {
        console.log('message: ' + msg);
        io.emit('chat message', msg);
    });
});
