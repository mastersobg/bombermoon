import express = module("express"); /// <reference path="declarations/express.d.ts" />
import Game = module("../lib/js/Game");
import http = module("http");
import io = module("socket.io"); /// <reference path="declarations/socket.io.d.ts" />
import events = module("events");

var refreshTime = 333;

var app = express();
app.disable('x-powered-by');
app.use(express.static(__dirname + "/../com"));
app.use(express.bodyParser());

var server = http.createServer(app);
var websocket = io.listen(server);
server.listen(3010);

class Room {
    serverInterval = 0;
    gs: Game.GameState = new Game.GameState(true);
    start() {
        this.serverInterval = setInterval(() => {
            this.gs.gameLoop();
        }, refreshTime);
    }
    stop() {
        clearInterval(this.serverInterval);
    }
    countOfPlayers(): number {
        return this.gs.server.observers.length;
    }

    inBuffer = new Game.ArrBuffer([]);
    join(socket) {
        var inBuffer = this.inBuffer;
        var gs = this.gs;
        var observer = new Game.Observer();
        console.log("connection");
        observer.sessionInSocket++;
        gs.server.addObserver(observer);
        socket.on('orders', function (bufArr) {
            inBuffer.source = bufArr;
            observer.decode(inBuffer);
        }).on('disconnect', function () {
        });
        observer.sendBuf = (buf: Game.Buffer) => {
            if (socket.disconnected) {
                return false;
            }
            console.log("sending data");
            socket.emit('game', (<Game.ArrBuffer>buf).source);
            return true;
        };
    }
}

var rooms: Room[] = [];

websocket.sockets.on('connection', function (socket) {
    for (var i = 0; i < rooms.length; i++) {
        if (rooms[i].countOfPlayers() < 4) {
            rooms[i].join(socket);
            return;
        }
    }
    var room = new Room();
    room.start();
    room.join(socket);
    rooms.push(room);
});

setInterval(function () {
    var j = 0;
    for (var i = 0; i < rooms.length; i++)
        if (rooms[i].countOfPlayers() != 0)
            rooms[j++] = rooms[i];
    while (rooms.length > j) {
        rooms.pop().stop();
    }
}, 1000);