var express = require("express")
var Game = require("../lib/js/Game")
var gs = new Game.GameState(true);
var app = express();
app.disable('x-powered-by');
app.use(express.static(__dirname + "/../com"));
app.use(express.bodyParser());
app.listen(3000);
console.log("local.bombermine.com:3000 root " + __dirname + "/..");
app.listen(3010);
