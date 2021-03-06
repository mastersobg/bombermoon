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
var websocket = io.listen(server, { log: false });
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
        observer.sessionInSocket++;
        gs.server.addObserver(observer);
        socket.on('orders', function (bufArr) {
            inBuffer.source = bufArr;
            observer.decode(inBuffer);
        }).on('disconnect', function () {
            players--;
        });
        observer.sendBuf = (buf: Game.Buffer) => {
            if (socket.disconnected) {
                return false;
            }
            socket.emit('game', (<Game.ArrBuffer>buf).source);
            return true;
        };
    }
}

var rooms: Room[] = [];
var players = 0;

websocket.sockets.on('connection', function (socket) {
    players++;
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

var pp = 0, pr = 0;

setInterval(function () {
    var j = 0;
    for (var i = 0; i < rooms.length; i++)
        if (rooms[i].countOfPlayers() != 0) {
            rooms[j++] = rooms[i];
        }
    while (rooms.length > j) {
        rooms.pop().stop();
    }
    if (pp != players || pr != rooms.length) {
        console.log("total players: " + players + " rooms: " + rooms.length);
        pp = players;
        pr = rooms.length;
    }
}, 1000);