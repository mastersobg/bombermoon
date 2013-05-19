var express = require("express")
var Game = require("../lib/js/Game")
var http = require("http")
var io = require("socket.io")

var gs = new Game.GameState(true);
var serverInterval = 0;
var refreshTime = 333;
function startServer() {
    if(serverInterval != 0) {
        clearInterval(serverInterval);
    }
    serverInterval = setInterval(function () {
        gs.gameLoop();
    }, refreshTime);
}
startServer();
var app = express();
app.disable('x-powered-by');
app.use(express.static(__dirname + "/../com"));
app.use(express.bodyParser());
var server = http.createServer(app);
var websocket = io.listen(server);
server.listen(3010);
var inBuffer = new Game.ArrBuffer([]);
websocket.sockets.on('connection', function (socket) {
    var observer = new Game.Observer();
    console.log("connection");
    observer.sessionInSocket++;
    gs.server.addObserver(observer);
    socket.on('orders', function (bufArr) {
        inBuffer.source = bufArr;
        observer.decode(inBuffer);
    }).on('disconnect', function () {
        observer.sessionInSocket++;
    });
    observer.sendBuf = function (buf) {
        if(socket.disconnected) {
            return false;
        }
        console.log("sending data");
        socket.emit('game', (buf).source);
    };
});
