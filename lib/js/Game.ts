var canvas : HTMLCanvasElement;

class GameApp {
    constructor () {
        canvas = <HTMLCanvasElement>document.getElementById("canvas0");
    }

    public gs: Game.GameState;

    setKeys(side) {
        if (this.gs.client.mainCharacter)
            this.gs.client.mainCharacter.keys = side;
    }

    startGame() {
        this.gs = new Game.GameState(false);
        setInterval(() => {
            this.gs.gameLoop();
            this.draw();
        }, 333);
    }

    draw() {
        var zoom = 32;
        var borderW = 0, borderH = 0;
        var context = canvas.getContext("2d");
        context.save();
        context.translate(borderW, borderH);
        context.scale(zoom, zoom);
        var w = this.gs.map.w, h = this.gs.map.h;
        for (var x=0; x<w; x++)
            for (var y=0; y<h; y++)
            {
                var tile = this.gs.map.get(x, y);
                if (tile==Game.tile_floor)
                    context.fillStyle = "white";
                if (tile==Game.tile_wall)
                    context.fillStyle = "gray";
                if (tile==Game.tile_unbreakable)
                    context.fillStyle = "black";
                context.fillRect(x, y, 1, 1);
            }
        context.fillStyle="green";
        for (var i=0; i<this.gs.units.list.length; i++) {
            var unit = this.gs.units.list[i];
            if (unit) {
                context.fillRect(unit.x + 0.2, unit.y + 0.2, 0.6, 0.6);
            }
        }
        context.restore();
    }
}

module Game {

    export var tile_floor = 1, tile_wall = 0, tile_unbreakable = 2;

    export class State {
        beforeTick(): void {
        }
        nowTick(): void {
        }
        afterTick(): void {
        }
        decodeBoot(): void {
        }
        decode(): void {
        }
        encodeBoot(): void {
        }
        encode(): void {
        }
        hasChanges(): bool {
            return false;
        }
    }

    export class Unit extends State {
        id: number = 0;
        index: number = 0;
        test: number = 0;
        gs: GameState = null;

        x: number;
        y: number;

        joinGameState(gs): void {
            this.gs = gs;
        }

        leaveGameState(): void {
            this.gs = null;
        }

        inGame(): bool {
            return this.gs != null;
        }
    }

    export class Units extends State {
        constructor (public gs: GameState) {
            super();
            gs.childs.push(this);
        }

        byId: Unit[] = [];
        list: Unit[] = [];
        prevListSize: number = 0;
        counterId : number = 1;

        add(unit: Unit): void {
            unit.id = this.counterId++;
            this.byId[unit.id] = unit;
            this.list.push(unit);
            unit.index = this.list.length-1;
            unit.joinGameState(this.gs);
        }

        remove(unit: Unit): void {
            this.list[unit.index] = null
            unit.leaveGameState()
        }

        nowTick(): void{
            for (var i=0; i<this.list.length; i++)
                if (this.list[i])
                    this.list[i].nowTick();
        }

        afterTick(): void {
            var j = 0;
            for (var i=0; i<this.list.length; i++)
                if (this.list[i]==null) {

                } else {
                    this.list[j] = this.list[i];
                    this.list[j].index = j;
                    j++;
                }
            while (this.list.length>j)
                this.list.pop();
            this.prevListSize = 0;
        }
    }

    export class Map extends State {
        constructor (public gs: GameState, public w: number, public h: number) {
            super();
            gs.childs.push(this);
            for (var i=0; i<w*h; i++)
                this.field.push(tile_floor);
            this.generate();
        }

        generate(): void {
        for (var x=0; x<this.w; x++)
            for(var y=0; y<this.h; y++)
                if (x%2==1 && y%2==1)
                    this.set(x, y, tile_unbreakable);
                else this.set(x, y, Math.random()*2|0);
    }

        field: number[] = [];

        get(x: number, y: number): number {
            if (x<0 || y<0 || x>=this.w || y>=this.h)
                return tile_unbreakable;
            return this.field[x + y*this.w];
        }

        set(x: number, y: number, value: number) {
            if (x<0 || y<0 || x>=this.w || y>=this.h)
                return;
            this.field[x+y*this.w] = value;
        }

        findFreePlace() {
            return {x:1, y:1};
        }
    }

    export class GameState extends State {
        server: GameServer = null;
        client: GameClient = null;
        childs: State[] = [];
        units: Units;
        map: Map;

        constructor (isServer: bool) {
            super();
            this.map = new Map(this, 13, 9);
            this.units = new Units(this);
            if (isServer)
                this.server = new GameServer(this);
            else this.client = new GameClient(this);
        }

        beforeTick(): void{
            for (var i=0; i<this.childs.length; i++)
                this.childs[i].beforeTick();
        }

        nowTick(): void{
            for (var i=0; i<this.childs.length; i++)
                this.childs[i].nowTick();
        }

        afterTick(): void{
            for (var i=0; i<this.childs.length; i++)
                this.childs[i].afterTick();
        }

        gameLoop() {
            this.beforeTick();
            this.nowTick();
            this.afterTick();
        }
    }


    export class GameServer extends State {
        constructor (public gs: GameState) {
            super();
            gs.childs.push(this);
        }
    }

    export class GameClient extends State {
        constructor (public gs: GameState) {
            super();
            gs.childs.push(this);
        }

        mainCharacter: Character = null;

        nowTick() {
            if (this.mainCharacter == null) {
                var c = new Character();
                this.mainCharacter = c;
                var point = this.gs.map.findFreePlace();
                c.x = point.x;
                c.y = point.y;
                this.gs.units.add(c);
            }
        }
    }

    export class Character extends Unit {
        static KEY_RIGHT = 1;
        static KEY_DOWN = 2;
        static KEY_LEFT = 3;
        static KEY_UP = 4;
        static dx = [0, 1, 0, -1, 0];
        static dy = [0, 0, 1, 0, -1];

        keys: number = 0;

        constructor () {
            super();
        }

        nowTick(): void {
            if (this.keys!=0) {
                var x1 = this.x + Character.dx[this.keys];
                var y1 = this.y + Character.dy[this.keys];
                if (this.gs.map.get(x1, y1) != Game.tile_unbreakable) {
                    this.x = x1;
                    this.y = y1;
                }
            }
        }
    }
}
