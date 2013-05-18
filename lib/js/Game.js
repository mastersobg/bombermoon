var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var canvas;
var GameApp = (function () {
    function GameApp() {
        canvas = document.getElementById("canvas0");
    }
    GameApp.prototype.setKeys = function (side) {
        if(this.gs.client.mainCharacter) {
            this.gs.client.mainCharacter.keys = side;
        }
    };
    GameApp.prototype.startGame = function () {
        var _this = this;
        this.gs = new Game.GameState(false);
        setInterval(function () {
            _this.gs.gameLoop();
            _this.draw();
        }, 333);
    };
    GameApp.prototype.draw = function () {
        var zoom = 32;
        var borderW = 0, borderH = 0;
        var context = canvas.getContext("2d");
        context.save();
        context.translate(borderW, borderH);
        context.scale(zoom, zoom);
        var w = this.gs.map.w, h = this.gs.map.h;
        for(var x = 0; x < w; x++) {
            for(var y = 0; y < h; y++) {
                var tile = this.gs.map.get(x, y);
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
        context.fillStyle = "green";
        for(var i = 0; i < this.gs.units.list.length; i++) {
            var unit = this.gs.units.list[i];
            if(unit) {
                context.fillRect(unit.x + 0.2, unit.y + 0.2, 0.6, 0.6);
            }
        }
        context.restore();
    };
    return GameApp;
})();
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
        Units.prototype.nowTick = function () {
            for(var i = 0; i < this.list.length; i++) {
                if(this.list[i]) {
                    this.list[i].nowTick();
                }
            }
        };
        Units.prototype.afterTick = function () {
            var j = 0;
            for(var i = 0; i < this.list.length; i++) {
                if(this.list[i] == null) {
                } else {
                    this.list[j] = this.list[i];
                    this.list[j].index = j;
                    j++;
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
                    if(x % 2 == 1 && y % 2 == 1) {
                        this.set(x, y, Game.tile_unbreakable);
                    } else {
                        this.set(x, y, Math.random() * 2 | 0);
                    }
                }
            }
        };
        Map.prototype.get = function (x, y) {
            if(x < 0 || y < 0 || x >= this.w || y >= this.h) {
                return Game.tile_unbreakable;
            }
            return this.field[x + y * this.w];
        };
        Map.prototype.set = function (x, y, value) {
            if(x < 0 || y < 0 || x >= this.w || y >= this.h) {
                return;
            }
            this.field[x + y * this.w] = value;
        };
        Map.prototype.findFreePlace = function () {
            return {
                x: 1,
                y: 1
            };
        };
        return Map;
    })(State);
    Game.Map = Map;    
    var GameState = (function (_super) {
        __extends(GameState, _super);
        function GameState(isServer) {
                _super.call(this);
            this.server = null;
            this.client = null;
            this.childs = [];
            this.map = new Map(this, 13, 9);
            this.units = new Units(this);
            if(isServer) {
                this.server = new GameServer(this);
            } else {
                this.client = new GameClient(this);
            }
        }
        GameState.prototype.beforeTick = function () {
            for(var i = 0; i < this.childs.length; i++) {
                this.childs[i].beforeTick();
            }
        };
        GameState.prototype.nowTick = function () {
            for(var i = 0; i < this.childs.length; i++) {
                this.childs[i].nowTick();
            }
        };
        GameState.prototype.afterTick = function () {
            for(var i = 0; i < this.childs.length; i++) {
                this.childs[i].afterTick();
            }
        };
        GameState.prototype.gameLoop = function () {
            this.beforeTick();
            this.nowTick();
            this.afterTick();
        };
        return GameState;
    })(State);
    Game.GameState = GameState;    
    var GameServer = (function (_super) {
        __extends(GameServer, _super);
        function GameServer(gs) {
                _super.call(this);
            this.gs = gs;
            gs.childs.push(this);
        }
        return GameServer;
    })(State);
    Game.GameServer = GameServer;    
    var GameClient = (function (_super) {
        __extends(GameClient, _super);
        function GameClient(gs) {
                _super.call(this);
            this.gs = gs;
            this.mainCharacter = null;
            gs.childs.push(this);
        }
        GameClient.prototype.nowTick = function () {
            if(this.mainCharacter == null) {
                var c = new Character();
                this.mainCharacter = c;
                var point = this.gs.map.findFreePlace();
                c.x = point.x;
                c.y = point.y;
                this.gs.units.add(c);
            }
        };
        return GameClient;
    })(State);
    Game.GameClient = GameClient;    
    var Character = (function (_super) {
        __extends(Character, _super);
        function Character() {
                _super.call(this);
            this.keys = 0;
        }
        Character.KEY_RIGHT = 1;
        Character.KEY_DOWN = 2;
        Character.KEY_LEFT = 3;
        Character.KEY_UP = 4;
        Character.dx = [
            0, 
            1, 
            0, 
            -1, 
            0
        ];
        Character.dy = [
            0, 
            0, 
            1, 
            0, 
            -1
        ];
        Character.prototype.nowTick = function () {
            if(this.keys != 0) {
                var x1 = this.x + Character.dx[this.keys];
                var y1 = this.y + Character.dy[this.keys];
                if(this.gs.map.get(x1, y1) != Game.tile_unbreakable) {
                    this.x = x1;
                    this.y = y1;
                }
            }
        };
        return Character;
    })(Unit);
    Game.Character = Character;    
})(Game || (Game = {}));
