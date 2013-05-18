var canvas : HTMLCanvasElement;

interface Animation {
    sx: number;
    sy: number;
    sizeX: number;
    sizeY: number;
    frameWidth: number;
    frameHeight: number;
    renderWidth: number;
    renderHeight: number;
    speed: number;
}

class GameApp {
    constructor () {
        canvas = <HTMLCanvasElement>document.getElementById("canvas0");
    }

    getAnimation(name: string): Animation {
        return (<any> window).animations[name];
    }

    getResource(name: string): HTMLImageElement {
        return (<any> window).resources[name];
    }

    public gs: Game.GameState;

    static refreshTime: number = 333;
    prevTime: number = 0;
    prevUpdate: number = 0;
    animID: number = 0;

    setKeys(side) {
        this.gs.client.key.setKeys(side);
    }

    tilesManager: Tile;

    startGame() {
        this.gs = new Game.GameState(false);
        this.tilesManager = new Tile(this.gs, this.getAnimation("tiles").sizeX);
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

    draw() {
        var zoom = 32;
        var context = canvas.getContext("2d");
        var atlas = this.getResource("tiles");
        var tiles = this.getAnimation("tiles");
        context.save();
        context.translate(zoom, zoom);
        context.scale(zoom, zoom);
        var w = this.gs.map.w, h = this.gs.map.h;
        for (var x=-1; x<=w; x++)
            for (var y=-1; y<=h; y++)
            {
                var tile = this.tilesManager.tileOf(x, y);
                context.drawImage(atlas, (tile % tiles.sizeX) * tiles.frameWidth, (tile / tiles.sizeX | 0) * tiles.frameWidth, tiles.frameWidth, tiles.frameWidth, x, y, 1, 1);
            }
        context.fillStyle="green";
        for (var id in this.gs.client.views) {
            var view = this.gs.client.views[id];
            if (view.type==Game.unit_char) {
                var char = <Game.Character>view.unit;
                var charView = <Game.CharacterView>view;
                var anim = this.getAnimation(char.team==1?"char1":"char2");
                var frame = (charView.step / anim.speed %anim.sizeX) | 0;
                context.drawImage(atlas,
                    anim.sx + frame * anim.frameWidth, anim.sy + charView.side * anim.frameHeight,
                    anim.frameWidth, anim.frameHeight,
                    view.x + 0.5 - anim.renderWidth / 2, view.y + 0.5 - anim.renderHeight/2,
                    anim.renderWidth, anim.renderHeight);
            }
        }
        context.restore();
    }
}

class Tile {

    constructor(private gs: Game.GameState, private per_row : number) {}

    get(row: number, col: number) {
        return row * this.per_row + col;
    }

    tileOf(x: number, y: number): number {
        var tile = this.gs.map.get(x, y);
        if (tile == Game.tile_road1) {

        }
        if (tile == Game.tile_road2) {

        }
        if (tile == Game.tile_unbreakable) {
            if (x == -1 || x == this.gs.map.w || y == -1 || y == this.gs.map.h)
                return this.tileOfBorder(x, y);
            return this.get(0, 3);
        }
        if (tile == Game.tile_wall) {
            return this.tileOfWall(x, y);
        }
        if (tile == Game.tile_entrance_free) {
            return this.get(3, 2);
        }
        if (tile == Game.tile_exit_free) {
            return this.get(4, 2);
        }
        if (tile == Game.tile_entrance1) {
            return this.get(3, 1);
        }
        if (tile == Game.tile_exit1) {
            return this.get(4, 1);
        }
        if (tile == Game.tile_entrance2) {
            return this.get(3, 0);
        }
        if (tile == Game.tile_exit2) {
            return this.get(4, 0);
        }
        return this.get(1, 1);
    }

    tileOfBorder(x: number, y: number): number {
        if (x == -1) {
            if (y == -1)
                return this.get(0, 0);
            else if (y == this.gs.map.h)
                return this.get(1, 0);
            else
                return this.get(1, 0);
        }
        if (x == this.gs.map.w) {
            if (y == -1)
                return this.get(0, 2);
            else if (y == this.gs.map.h)
                return this.get(2, 2);
            else
                return this.get(1, 2);
        }
        if (y == -1)
            return this.get(0, 1);
        return this.get(2, 1);
    }

    tileOfWall(x: number, y: number): number {
        var prev = this.gs.map.get(x, y - 1) == Game.tile_wall;
        var next = this.gs.map.get(x, y + 1) == Game.tile_wall;
        if (prev && next)
            return this.get(1, 5);
        if (prev)
            return this.get(1, 4);
        if (next)
            return this.get(0, 4);
        return this.get(0, 5);
    }

}

module Game {

    export var tile_floor = 1, tile_wall = 0, tile_unbreakable = 2;
    export var tile_road1 = 4, tile_road2 = 5;
    export var tile_entrance_free = 4, tile_exit_free = 5, tile_entrance1 = 6, tile_exit1 = 7;
    export var tile_entrance2 = 8, tile_exit2 = 9;

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
        player: number = 0;

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

    export class KeyController extends State {
        constructor (public gs: GameState) {
            super();
            gs.childs.push(this);
        }


        keysReset: bool = false;
        wasKeys: bool = false;
        go: number = 0;

        setKeys(side) {
            if (side==0) {
                if (this.wasKeys)
                    this.keysReset = true;
                else this.go = side;
            }
            else {
                this.go = side;
                this.wasKeys = true;
            }
        }

        beforeTick() {
            var char = this.gs.client.mainCharacter;
            if (char)
                char.keys = this.go;
            if (this.keysReset) {
                this.go = 0;
                this.keysReset = false;
            }
            this.wasKeys = false;
        }
    }

    export class GameClient extends State {
        constructor (public gs: GameState) {
            super();
            gs.childs.push(this);
            this.key = new KeyController(gs);
        }

        key: KeyController;
        mainCharacter: Character = null;
        views: UnitView[] = [];

        createView(unit: Unit) {
            if (unit.type == unit_char)
                return new CharacterView(unit);
            return null;
        }

        nowTick() {
            if (this.mainCharacter == null) {
                var c = new Character();
                c.player = 1;
                c.team = 1;
                this.mainCharacter = c;
                var point = this.gs.map.findFreePlace();
                c.x = point.x;
                c.y = point.y;
                this.gs.units.add(c);

                c = new Character();
                c.player = 2;
                c.team = 2;
                c.x = this.gs.map.w - point.x;
                c.y = this.gs.map.h - point.y;
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

        team : number = 0;
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

    export class CharacterView extends LinearView {
        static rows = [0, 2, 0, 3, 1];
        step: number = 0;
        side: number = rows[0];
        constructor (unit: Unit) {
            super(unit);
        }
        go: bool = false;

        updateFrame(delta: number, frac: number) {
            super.updateFrame(delta, frac);
            if (this.go)
                this.step += delta;
            else this.step = 0;
        }

        updateTick() {
            super.updateTick();
            var keys = (<Character>this.unit).keys;
            this.go = keys != 0;
            if (this.go)
                this.side = CharacterView.rows[keys];
        }
    }
}
