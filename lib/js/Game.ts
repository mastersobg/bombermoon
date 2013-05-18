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

    static refreshTime: number = 333;
    prevTime: number = 0;
    prevUpdate: number = 0;
    animID: number = 0;

    startGame() {
        this.gs = new Game.GameState(false);
        this.prevTime = Date.now();
        this.prevUpdate = Date.now();
        setInterval(() => {
            this.gs.gameLoop();
            this.prevUpdate = Date.now();
        }, GameApp.refreshTime);
        this.animID = (<any> window.requestAnimationFrame)(() => {this.animate(Date.now())});
    }

    animate(curTime) {
        var delta = curTime - this.prevTime;
        var frac = Math.min(1.0, (curTime-this.prevUpdate)/GameApp.refreshTime );
        this.prevTime = curTime;
        for (var id in this.gs.client.views) {
            var view = this.gs.client.views[id];
            view.updateFrame(delta, frac);
        }
        this.draw();
        this.animID = (<any>window.requestAnimationFrame)(() => {this.animate(Date.now())});
    }

    tileOf(x: number, y: number): number {
        var tile = this.gs.map.get(x, y);
        if (tile==Game.tile_unbreakable) return 1;
        if (tile==Game.tile_floor) return 8;
        return 3;
    }

    draw() {
        var zoom = 32;
        var context = canvas.getContext("2d");
        context.save();
        context.translate(zoom, zoom);
        context.scale(zoom, zoom);
        var w = this.gs.map.w, h = this.gs.map.h;
        var tileImg = (<any>window).resources["tiles"];
        var frameWidth = 16;
        var tileRow = tileImg.width / frameWidth | 0;
        for (var x=-1; x<=w; x++)
            for (var y=-1; y<=h; y++)
            {
                var tile = this.tileOf(x, y);
                context.drawImage(tileImg, (tile % tileRow) * frameWidth, (tile / tileRow | 0) * frameWidth, frameWidth, frameWidth, x, y, 1, 1);
            }
        context.fillStyle="green";
        for (var id in this.gs.client.views) {
            var view = this.gs.client.views[id];
            if (view.type==Game.unit_char) {
                context.fillRect(view.x + 0.2, view.y + 0.2, 0.6, 0.6);
            }
        }
        context.restore();
    }
}

module Game {

    export var tile_floor = 1, tile_wall = 0, tile_unbreakable = 2;
    export var unit_char = 1, unit_bomb = 2;

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
        view: UnitView = null;
        id: number = 0;
        index: number = 0;
        test: number = 0;
        type: number = 0;
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

        createByUid(uid: number): Unit {
            if (uid == unit_char) return new Character();
            return null;
        }

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
        views: UnitView[] = [];

        createView(unit: Unit) {
            if (unit.type == unit_char)
                return new LinearView(unit);
            return null;
        }

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

        afterTick() {
            var list = this.gs.units.list;
            for (var i=0; i<list.length; i++)
                if (list[i].view == null)
                {
                    var view = this.createView(list[i]);
                    if (view!=null) {
                        list[i].view = view;
                        this.views[list[i].id] = view;
                    }
                }
            for (var id in this.views)
                if (!this.views[id].unit.inGame())
                    delete this.views[id];
                else this.views[id].updateTick();
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
            this.type = unit_char;
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


    export class UnitView {
        constructor(public unit: Unit) { this.type = unit.type; }
        x: number = 0;
        y: number = 0;
        type: number = 0;

        updateFrame(delta: number, frac: number) {

        }

        updateTick() {

        }
    }

    export class LinearView extends UnitView {
        prevX: number = 0;
        prevY: number = 0;
        tickX: number = 0;
        tickY: number = 0;

        constructor (unit: Unit) {
            super(unit);
            this.prevX = this.tickX = unit.x;
            this.prevY = this.tickY = unit.y;
        }

        updateFrame(delta: number, frac: number) {
            this.x = this.prevX + frac * (this.tickX - this.prevX);
            this.y = this.prevY + frac * (this.tickY - this.prevY);
        }

        updateTick() {
            this.prevX = this.tickX;
            this.prevY = this.tickY;
            this.tickX = this.unit.x;
            this.tickY = this.unit.y;
        }
    }
}
