var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
function draw() {
    var gs = new Game.GameState(), canvas = document.getElementById("canvas0");
    var zoom = 32;
    var borderW = 0, borderH = 0;
    var context = canvas.getContext("2d");
    context.save();
    context.translate(borderW, borderH);
    context.scale(zoom, zoom);
    var w = gs.map.w, h = gs.map.h;
    for(var x = 0; x < w; x++) {
        for(var y = 0; y < h; y++) {
            var tile = gs.map.get(x, y);
            if(tile == Game.tile_floor) {
                context.fillStyle = "white";
            }
            if(tile == Game.tile_wall) {
                context.fillStyle = "gray";
            }
            if(tile == Game.tile_unbreakable) {
                context.fillStyle = "black";
            }
            context.fillRect(x, y, 1, 1);
        }
    }
    context.restore();
}
var Game;
(function (Game) {
    Game.tile_floor = 1;
    Game.tile_wall = 0;
    Game.tile_unbreakable = 2;
    var State = (function () {
        function State() { }
        State.prototype.beforeTick = function () {
        };
        State.prototype.nowTick = function () {
        };
        State.prototype.afterTick = function () {
        };
        State.prototype.decodeBoot = function () {
        };
        State.prototype.decode = function () {
        };
        State.prototype.encodeBoot = function () {
        };
        State.prototype.encode = function () {
        };
        State.prototype.hasChanges = function () {
            return false;
        };
        return State;
    })();
    Game.State = State;    
    var Unit = (function (_super) {
        __extends(Unit, _super);
        function Unit() {
            _super.apply(this, arguments);

            this.id = 0;
            this.index = 0;
            this.test = 0;
            this.gs = null;
        }
        Unit.prototype.joinGameState = function (gs) {
            this.gs = gs;
        };
        Unit.prototype.leaveGameState = function () {
            this.gs = null;
        };
        Unit.prototype.inGame = function () {
            return this.gs != null;
        };
        return Unit;
    })(State);
    Game.Unit = Unit;    
    var Units = (function (_super) {
        __extends(Units, _super);
        function Units(gs) {
                _super.call(this);
            this.gs = gs;
            this.byId = [];
            this.list = [];
            this.prevListSize = 0;
            this.counterId = 1;
            gs.childs.push(this);
        }
        Units.prototype.add = function (unit) {
            unit.id = this.counterId++;
            this.byId[unit.id] = unit;
            this.list.push(unit);
            unit.index = this.list.length - 1;
            unit.joinGameState(this.gs);
        };
        Units.prototype.remove = function (unit) {
            this.list[unit.index] = null;
            unit.leaveGameState();
        };
        Units.prototype.afterTick = function () {
            var j = 0;
            for(var i = 0; i < this.list.length; i++) {
                if(this.list[i] == null) {
                } else {
                    this.list[j] = this.list[i];
                    this.list[j].index = j;
                }
            }
            while(this.list.length > j) {
                this.list.pop();
            }
            this.prevListSize = 0;
        };
        return Units;
    })(State);
    Game.Units = Units;    
    var Map = (function (_super) {
        __extends(Map, _super);
        function Map(gs, w, h) {
                _super.call(this);
            this.gs = gs;
            this.w = w;
            this.h = h;
            this.field = [];
            gs.childs.push(this);
            for(var i = 0; i < w * h; i++) {
                this.field.push(Game.tile_floor);
            }
            this.generate();
        }
        Map.prototype.generate = function () {
            for(var x = 0; x < this.w; x++) {
                for(var y = 0; y < this.h; y++) {
                    if((x + y) % 2 == 1) {
                        this.set(x, y, Game.tile_unbreakable);
                    } else {
                        this.set(x, y, Math.random() * 2 | 0);
                    }
                }
            }
        };
        Map.prototype.get = function (x, y) {
            if(x < 0 || y < 0 || x >= this.w || y >= this.h) {
                return Game.tile_wall;
            }
            return this.field[x + y * this.w];
        };
        Map.prototype.set = function (x, y, value) {
            if(x < 0 || y < 0 || x >= this.w || y >= this.h) {
                return;
            }
            this.field[x + y * this.w] = value;
        };
        return Map;
    })(State);
    Game.Map = Map;    
    var GameState = (function (_super) {
        __extends(GameState, _super);
        function GameState() {
                _super.call(this);
            this.childs = [];
            this.map = new Map(this, 13, 9);
            this.units = new Units(this);
        }
        GameState.prototype.beforeTick = function () {
            for(var i = 0; i < this.childs.length; i++) {
                this.childs[i].nowTick();
            }
        };
        GameState.prototype.nowTick = function () {
            for(var i = 0; i < this.childs.length; i++) {
                this.childs[i].nowTick();
            }
        };
        GameState.prototype.afterTick = function () {
            for(var i = 0; i < this.childs.length; i++) {
                this.childs[i].nowTick();
            }
        };
        return GameState;
    })(State);
    Game.GameState = GameState;    
})(Game || (Game = {}));
