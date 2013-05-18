var express = require('express')
var app = express();
app.disable('x-powered-by');
app.use(express.static(__dirname + "/../lib"));
app.use(express.static(__dirname + "/../com"));
app.use(express.bodyParser());
app.listen(3000);
console.log("local.bombermine.com:3000 root " + __dirname + "/..");
