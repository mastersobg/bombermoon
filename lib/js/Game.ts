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
    gsTest: Game.GameState;

    testGidCounter = 15;
    serverInterval = 0;

    startTestServer() {
        if (this.serverInterval!=0)
            window.clearInterval(this.serverInterval);

        this.serverInterval = window.setInterval(() =>{
            this.gsTest.gameLoop();
        }, GameApp.refreshTime);

        var gs = this.gsTest = new Game.GameState(true);
        gs.uid = this.testGidCounter++;
        var me = new Game.Observer();
        me.sendBuf = (buf: Game.Buffer) => {
            this.receiveMsg(buf);
            return true;
        };
        gs.server.addObserver(me);
    }

    static refreshTime: number = 333;
    prevTime: number = 0;
    prevUpdate: number = 0;
    animID: number = 0;

    setKeys(side) {
        this.gs.client.key.setKeys(side);
    }

    tilesManager: Tile;

    startGame() {
        this.tilesManager = new Tile(this.gs, this.getAnimation("tiles").sizeX);
        this.prevTime = Date.now();
        this.prevUpdate = Date.now();
        if (this.animID<=0) {
            this.animID = (<any> window.requestAnimationFrame)(() => {this.animate(Date.now())});
        }
    }

    receiveMsg(buf: Game.Buffer) {
        buf.mode = Game.Buffer.MODE_READ;
        var type = buf.pop();
        if (type==Game.CODE_NEW_GAME) {
            this.gs = new Game.GameState(false);
            this.gs.decodeBoot(buf);

            if (this.gsTest)
                this.gs.client.sendIt = (buf: Game.Buffer) => {
                    this.gsTest.server.observers[0].decode(buf);
                }

            this.startGame();
        } else if (type==Game.CODE_DIFF) {
            var gid = buf.pop();
            if (gid == this.gs.uid) {
                this.gs.unixTime = buf.pop();
                this.gs.inputBuf = buf;
                this.gs.gameLoop();
                this.prevUpdate = Date.now();
            }
        }
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
    export var ORDER_TICK = 1, ORDER_KEY = 2;

    export var unit_char = 1, unit_bomb = 2;

    export class State {
        beforeTick(): void {
        }
        nowTick(): void {
        }
        afterTick(): void {
        }
        decodeBoot(buf: Buffer): void {
        }
        decode(buf: Buffer): void {
        }
        encodeBoot(buf: Buffer): void {
        }
        encode(buf: Buffer): void {
        }
        hasChanges(): bool {
            return false;
        }
    }

    export class Buffer {
        static MODE_READ = 1;
        static MODE_WRITE = 2;
        mode: number = 0;
        pop(key = null): number {
            return 0;
        }
        push(x: number, key = null): void {

        }

        clear(): void {

        }
    }

    export class ArrBuffer extends Buffer {

        constructor(public source: number[]) {
            super();
        }

        pop(key = null): number {
            if (this.source.length==0)
                throw "buffer has no ints";
            if (this.mode!=Buffer.MODE_READ)
                throw "buffer is not in read mode";
            if (key) {
                var key2 = this.source.shift();
                if (key2!=key)
                    throw "key="+key+" found="+key2;
            }
            return this.source.shift();
        }
        push(x: number, key = null) {
            if (key)
                this.source.push(key);
            if (this.mode!=Buffer.MODE_WRITE)
                throw "buffer is not in write mode";
            this.source.push(x);
        }

        clear() {
            this.source = [];
        }
    }

    export class Router {
        childs: State[];
        beforeTick(): void {
            for (var i=0;i<this.childs.length; i++)
                this.childs[i].beforeTick();
        }
        nowTick(): void {
            for (var i=0;i<this.childs.length; i++)
                this.childs[i].nowTick();
        }
        afterTick(): void {
            this.modMask = 0;
            for (var i=0;i<this.childs.length; i++) {
                this.childs[i].afterTick();
                if (this.childs[i].hasChanges())
                    this.modMask |= (1<<i);
            }
        }

        modMask : number = 0;
        decodeBoot(buf: Buffer): void {
            for (var i=0; i<this.childs.length; i++) {
                this.childs[i].decodeBoot(buf);
            }
        }
        decode(buf: Buffer): void {
            var modMask = buf.pop();
            for (var i=0;i<this.childs.length; i++) {
                if ((modMask & (1<<i)) !=0)
                    this.childs[i].decode(buf);
            }
        }
        encodeBoot(buf: Buffer): void {
            for (var i=0; i<this.childs.length; i++) {
                this.childs[i].encodeBoot(buf);
            }
        }
        encode(buf: Buffer): void {
            var modMask = this.modMask;
            buf.push(modMask);
            for (var i=0; i<this.childs.length; i++) {
                if ((modMask & (1<<i)) !=0)
                    this.childs[i].encode(buf);
            }
        }
        hasChanges(): bool {
            return this.modMask != 0;
        }
    }

    export class Unit extends State {
        static BIT_CONSTANT = 1;
        static BIT_POS = 2;
        static BIT_KEY = 4;

        view: UnitView = null;
        id: number = 0;
        index: number = 0;
        type: number = 0;
        gs: GameState = null;

        x: number;
        y: number;
        player: number = 0;

        joinGameState(gs): void {
            this.gs = gs;
        }

        leaveGameState(): void {
            var gs2 = this.gs;
            this.gs = null;
            gs2.units.remove(this);
        }

        inGame(): bool {
            return this.gs != null;
        }

        load(buf: Buffer, modified) {
            this.modified = modified;
            if ((modified & Unit.BIT_CONSTANT)) {
                this.id = buf.pop();
                this.player = buf.pop();
            }
            if ((modified & Unit.BIT_POS)) {
                var p = buf.pop();
                this.x = p&255;
                this.y = p>>8;
            }
        }

        save(buf: Buffer, modified) {
            if ((modified & Unit.BIT_CONSTANT)) {
                buf.push(this.id);
                buf.push(this.player);
            }
            if ((modified & Unit.BIT_POS)) {
                buf.push(this.x | (this.y<<8));
            }
        }

        beforeTick() {
            this.modified = 0;
        }

        modified: number = 0;

        decodeBoot(buf: Buffer): void {
            this.load(buf, -1);
        }
        decode(buf: Buffer): void {
            this.load(buf, buf.pop());
        }
        encodeBoot(buf: Buffer): void {
            this.save(buf, -1);
        }
        encode(buf: Buffer): void {
            buf.push(this.modified);
            this.save(buf, this.modified);
        }

        hasChanges() : bool {
            if (this.modified>0){
                console.log("OW");
            }
            return this.modified != 0;
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
        characterByPlayerId: Character[] = [null, null, null, null, null];

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
            if (unit.type == unit_char)
                this.characterByPlayerId[unit.player] = <Character>unit;
        }

        remove(unit: Unit): void {
            if (unit.inGame())
                unit.leaveGameState()
            else {
                if (unit.type == unit_char)
                    this.characterByPlayerId[unit.player] = null;
                this.list[unit.index] = null;
            }
        }

        beforeTick(): void{
            for (var i=0; i<this.list.length; i++)
                if (this.list[i])
                    this.list[i].beforeTick();
        }

        nowTick(): void{
            for (var i=0; i<this.list.length; i++)
                if (this.list[i])
                    this.list[i].nowTick();
        }

        afterTick(): void {
            for (var i=0; i<this.list.length; i++) {
                if (this.list[i])
                    this.list[i].afterTick();
            }

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
            this.prevListSize = this.list.length;
        }

        decodeBoot(buf: Buffer): void {
            var sz = buf.pop();
            for (var i=0; i<sz; i++) {
                var type = buf.pop();
                var unit = this.createByUid(type);
                unit.decodeBoot(buf);
                this.add(unit);
            }
        }

        decode(buf: Buffer): void {
            var num = (this.list.length+31) / 32 | 0;
            var masks = [];
            for (var i=0; i<num; i++)
                masks.push(buf.pop());
            var prevListSize = this.list.length;
            for (var i=0; i<prevListSize; i++)
                if ((masks[i>>5] & (1<<(i&31)))!=0) {
                    this.remove(this.list[i]);
                }
            for (var i=0; i<num; i++)
                masks[i] = buf.pop();
            for (var i=0; i<prevListSize; i++)
                if ((masks[i>>5] & (1<<(i&31)))!=0) {
                    this.list[i].decode(buf);
                }
            var newSz = buf.pop();
            for (var i=0; i<newSz; i++) {
                var type = buf.pop("Unit type");
                var unit = this.createByUid(type);
                unit.decodeBoot(buf);
                this.add(unit);
            }
        }
        encodeBoot(buf: Buffer): void {
            var sz = 0, len = this.list.length;
            for (var i=0; i<len; i++)
                if (this.list[i])
                    sz++;
            buf.push(sz);
            for (var i=0; i<len; i++) {
                var unit = this.list[i];
                if (unit) {
                    buf.push(unit.type);
                    unit.encodeBoot(buf);
                }
            }
        }
        encode(buf: Buffer): void {
            var prevListSize = this.prevListSize;
            var num = (prevListSize+31) / 32 | 0;
            var masks = [];
            for (var i=0; i<num; i++)
                masks.push(0);
            for (var i=0; i<prevListSize; i++)
                if (this.list[i] == null)
                    masks[i>>5] |= (1<<(i&31));
            for (var i=0;i<num;i++)
                buf.push(masks[i]);
            for (var i=0; i<prevListSize; i++)
                if (this.list[i] && this.list[i].hasChanges())
                    masks[i>>5] |= (1<<(i&31));
            for (var i=0;i<num;i++)
                buf.push(masks[i]);
            for (var i=0; i<prevListSize; i++)
                if (this.list[i] && this.list[i].hasChanges())
                    this.list[i].encode(buf);
            var sz = 0;
            for (var i=prevListSize; i<this.list.length; i++) {
                if (this.list[i])
                    sz++;
            }
            buf.push(sz);
            for (var i=prevListSize; i<this.list.length; i++) {
                var unit = this.list[i];
                buf.push(unit.type, "Unit type");
                unit.encodeBoot(buf);
            }
        }

        hasChanges(): bool {
            if (this.list.length != this.prevListSize)
                return true;
            for (var i=0;i<this.list.length;i++)
                if (this.list[i]==null || this.list[i].hasChanges())
                    return true;
            return false;
        }
    }

    export class Map extends State {
        constructor (public gs: GameState, public w: number, public h: number) {
            super();
            gs.childs.push(this);
            for (var i=0; i<w*h; i++)
                this.field.push(tile_floor);
        }

        generate(): void {
        for (var x=0; x<this.w; x++)
            for(var y=0; y<this.h; y++)
                if (x%2==1 && y%2==1)
                    this.set(x, y, tile_unbreakable);
                else this.set(x, y, Math.random()*2|0);
        }

        beforeTick() {
            if (this.changed.length>0)
                this.changed = [];
        }

        field: number[] = [];
        changed: number[] = [];

        get(x: number, y: number): number {
            if (x<0 || y<0 || x>=this.w || y>=this.h)
                return tile_unbreakable;
            return this.field[x + y*this.w];
        }

        set(x: number, y: number, value: number) {
            if (x<0 || y<0 || x>=this.w || y>=this.h)
                return;
            var ind = x+y*this.w;
            var v = this.field[ind];
            if (v!=value) {
                this.field[ind] = value;
                this.changed.push(ind);
            }
        }

        encodeBoot(buf: Buffer): void {
            for (var i=0; i<this.field.length; i++)
                buf.push(this.field[i]);
        }
        encode(buf: Buffer): void {
            var sz = this.changed.length;
            buf.push(sz);
            for (var i=0; i<sz; i++) {
                var x = this.changed[i];
                buf.push(x);
                buf.push(this.field[x]);
            }
        }
        decode(buf: Buffer): void {
            var sz = buf.pop();
            for (var i=0; i<sz; i++) {
                var x = buf.pop();
                var val = buf.pop();
                this.field[x] = val;
                this.changed.push(x);
            }
        }
        decodeBoot(buf: Buffer): void {
            for (var i=0; i<this.field.length; i++) {
                this.field[i] = buf.pop();
            }
        }


        hasChanges(): bool {
            return this.changed.length>0;
        }

        findFreePlace() {
            return {x:1, y:1};
        }
    }

    export class GameState extends Router {
        server: GameServer = null;
        client: GameClient = null;
        childs: State[] = [];
        units: Units;
        map: Map;

        tick = 0;
        unixTime = 0;
        uid = 0;

        inputBuf : Buffer;

        constructor (isServer: bool) {
            super();
            this.map = new Map(this, 13, 9);
            if (isServer)
                this.map.generate();
            this.units = new Units(this);
            if (isServer)
                this.server = new GameServer(this);
            else this.client = new GameClient(this);
        }

        gameLoop() {
            this.beforeTick();
            this.nowTick();
            this.tick++;
            if (this.client)
                this.decode(this.inputBuf);
            if (this.server)
                this.server.encodeAll();
            this.afterTick();
        }
    }

    export class Observer {
        playerId: number = 0;
        gs: GameState;
        sessionInGame: number = 0;
        sessionInSocket: number = 1;
        gameUid: number = 0;
        wantToBeObs: bool = false;
        active: number = 0;

        orders: Order[] = [];

        sendBuf(buf: Buffer): bool {
            return false;
        }

        decode(buf: Game.Buffer) {
            if (!this.gs) return;
            buf.mode = Buffer.MODE_READ;
            try{
                var sz = buf.pop();
                var gid = buf.pop();
                if (gid!=this.gs.uid) return;
                for (var i=0;i<sz; i++){
                    var order = this.gs.server.createOrderById(buf.pop());
                    order.load(buf);
                    this.orders.push(order);
                }
            } catch (e) {
                console.log(e);
            }
        }
    }


    export var CODE_NEW_GAME = 1, CODE_DIFF = 2;

    export class GameServer extends State {
        constructor (public gs: GameState) {
            super();
            gs.childs.splice(0, 0, this);
        }

        observers: Observer[] = [];
        obsById: Observer[] = [null, null, null, null, null];

        orders : Order[] = [];

        beforeTick() {
            for (var i=0; i<this.observers.length; i++) {
                var obs = this.observers[i];
                if (obs.orders.length>0) {
                    for (var j=0; j<obs.orders.length; j++)
                    {
                        var order = obs.orders[j];
                        if (order && obs.playerId) {
                            order.player = obs.playerId;
                            this.orders.push(obs.orders[j]);
                        }
                    }
                    while (obs.orders.length>0)
                        obs.orders.pop();
                }
            }
        }

        nowTick() {
            for (var i=0; i<this.orders.length; i++) {
                 this.orders[i].execute(this.gs);
            }
            this.gs.unixTime = Date.now()/1000 | 0;
            if (this.gs.units.list.length==0)
            {
                var c = new Character();
                c.player = 1;
                c.team = 1;
                var point = this.gs.map.findFreePlace();
                c.x = point.x;
                c.y = point.y;
                this.gs.units.add(c);
                c = new Character();
                c.player = 3;
                c.team = 2;
                c.x = this.gs.map.w - point.x;
                c.y = this.gs.map.h - point.y;
                this.gs.units.add(c);
            }

            var j = 0;
            var left = [];
            for (var i=0; i<this.observers.length; i++) {
                var obs = this.observers[i];
                if (obs.active<50) {
                    this.observers[j++] = obs;
                } else {
                    left.push(obs);
                    if (obs.playerId>0) {
                        this.obsById[obs.playerId] = null;
                        var char = this.gs.units.characterByPlayerId[obs.playerId];
                        if (char)
                            char.leaveGameState();
                    }
                    obs.gs = null;
                }
            }
            while (this.observers.length>j)
                this.observers.pop();
            if (left.length>0) {
                for (var i=0; i<this.observers.length; i++) {
                    var obs = this.observers[i];
                    this.tryAssignPlayerId(obs);
                }
            }
        }

        createOrderById(id: number): Order {
            if (id == ORDER_KEY)
                return new KeyOrder();
            if (id == ORDER_TICK)
                return new TickOrder();
            return null;
        }

        outBuf: Buffer = new ArrBuffer([]);

        encodeAll() {
            var outBuf = this.outBuf;
            for (var i=0; i<this.observers.length; i++) {
                var obs = this.observers[i];
                outBuf.clear();
                outBuf.mode = Buffer.MODE_WRITE;
                if (obs.gameUid != this.gs.uid ||
                    obs.sessionInGame != obs.sessionInSocket) {
                    obs.gameUid = this.gs.uid;
                    obs.sessionInGame = obs.sessionInSocket;
                    outBuf.push(CODE_NEW_GAME);
                    outBuf.push(obs.gameUid);
                    outBuf.push(obs.playerId);
                    outBuf.push(this.gs.tick);
                    outBuf.push(this.gs.unixTime);
                    this.gs.encodeBoot(outBuf);
                } else {
                    outBuf.push(CODE_DIFF);
                    outBuf.push(obs.gameUid);
                    outBuf.push(this.gs.unixTime);
                    this.gs.encode(outBuf);
                }
                if (obs.sendBuf(outBuf))
                    obs.active = 0;
                else obs.active++;
            }
        }

        addObserver(obs: Game.Observer) {
            this.observers.push(obs);
            obs.gs = this.gs;
            this.tryAssignPlayerId(obs);
        }

        tryAssignPlayerId(obs: Game.Observer){
            if (obs.playerId!=0 || obs.wantToBeObs) {
                return;
            }
            for (var i=1;i<=4; i++) {
                if (this.obsById[i]==null) {
                    obs.playerId = i;
                    obs.gameUid = 0;
                    return;
                }
            }
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

        nowTick() {
            var char = this.gs.client.mainCharacter;
            if (char) {
                var o = new KeyOrder();
                o.key = this.go;
                this.gs.client.orders.push(o);
            }
            if (this.keysReset) {
                this.go = 0;
                this.keysReset = false;
            }
            this.wasKeys = false;
        }
    }

    export class Order {
        player: number = 0;
        type: number = 0;

        save(buf: Buffer) {
        }

        load(buf: Buffer) {
        }

        execute(gs: GameState) {
        }
    }

    export class TickOrder extends Order {
        constructor () {
            super();
            this.type = ORDER_TICK;
        }
        tick = 0;

        save(buf: Buffer) {
            buf.push(this.tick);
        }

        load(buf: Buffer) {
            this.tick = buf.pop();
        }
    }

    export class KeyOrder extends Order{
        constructor () {
            super();
            this.type = ORDER_KEY;
        }

        key: number = 0;

        save(buf: Buffer) {
            buf.push(this.key);
        }

        load(buf: Buffer) {
            this.key = buf.pop();
        }

        execute(gs: GameState) {
            var char = gs.units.characterByPlayerId[this.player];
            if (char) {
                char.inputKey(this.key);
            }
        }
    }

    export class GameClient extends State {
        constructor (public gs: GameState) {
            super();
            gs.childs.splice(0, 0, this);
            this.key = new KeyController(gs);
        }

        key: KeyController;
        mainCharacter: Character = null;
        views: UnitView[] = [];
        outBuf = new ArrBuffer([]);
        playerId: number;

        createView(unit: Unit) {
            if (unit.type == unit_char)
                return new CharacterView(unit);
            return null;
        }

        decodeBoot(buf: Buffer) {
            this.gs.uid = buf.pop();
            this.playerId = buf.pop();
            this.gs.unixTime = buf.pop();
            this.gs.tick = buf.pop();
        }

        decode(buf: Buffer) {
        }

        nowTick() {
            var list = this.gs.units.list;
            for (var i=0; i<list.length; i++)
                if (list[i] && list[i].type == unit_char && list[i].player == this.playerId)
                    this.mainCharacter = <Character>list[i];
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
            var t = new TickOrder();
            t.tick = this.gs.tick;
            this.orders.push(t);
            this.sendOrders();
        }

        orders = [];
        sendOrders() {
            var outBuf = this.outBuf;
            outBuf.clear();
            outBuf.mode = Buffer.MODE_WRITE;
            var orders = this.orders;
            var sz = orders.length;
            outBuf.push(sz);
            outBuf.push(this.gs.uid);
            for (var i=0; i<sz; i++) {
                outBuf.push(orders[i].type);
                orders[i].save(outBuf);
            }
            this.sendIt(outBuf);
            while (orders.length>0)
                orders.pop();
        }

        sendIt(buf: Buffer) {
        }
    }

    export class Character extends Unit {
        static KEY_RIGHT = 1;
        static KEY_DOWN = 2;
        static KEY_LEFT = 3;
        static KEY_UP = 4;
        static dx = [0, 1, 0, -1, 0];
        static dy = [0, 0, 1, 0, -1];

        team: number = 0;
        keys: number = 0;

        constructor () {
            super();
            this.type = unit_char;
        }

        inputKey(key: number) {
            if (key!=this.keys) {
                this.modified |= Unit.BIT_KEY;
                this.keys = key;
            }
        }

        nowTick(): void {
            this.team = this.player<=2?1:2;
            if (!this.gs.server) return;
            if (this.keys!=0) {
                var x1 = this.x + Character.dx[this.keys];
                var y1 = this.y + Character.dy[this.keys];
                if (this.gs.map.get(x1, y1) != Game.tile_unbreakable) {
                    this.x = x1;
                    this.y = y1;
                    this.modified |= Unit.BIT_POS;
                }
            }
        }

        load(buf: Buffer, modified: number) {
            super.load(buf, modified);
            if ((modified&Unit.BIT_KEY)!=0)
                this.keys = buf.pop();
        }

        save(buf: Buffer, modified: number) {
            super.save(buf, modified);
            if ((modified&Unit.BIT_KEY)!=0)
                buf.push(this.keys);
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
