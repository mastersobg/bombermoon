function draw() {
    var gs = new Game.GameState(), canvas : HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("canvas0");

    var zoom = 32;
    var borderW = 0, borderH = 0;
    var context = canvas.getContext("2d");
    context.save();
    context.translate(borderW, borderH);
    context.scale(zoom, zoom);
    var w = gs.map.w, h = gs.map.h;
    for (var x=0; x<w; x++)
        for (var y=0; y<h; y++)
        {
            var tile = gs.map.get(x, y);
            if (tile==Game.tile_floor)
                context.fillStyle = "white";
            if (tile==Game.tile_wall)
                context.fillStyle = "gray";
            if (tile==Game.tile_unbreakable)
                context.fillStyle = "black";
            context.fillRect(x, y, 1, 1);
        }
    context.restore();
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

        afterTick(): void {
            var j = 0;
            for (var i=0; i<this.list.length; i++)
                if (this.list[i]==null) {

                } else {
                    this.list[j] = this.list[i];
                    this.list[j].index = j;
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
                    if ((x+y)%2==1)
                        this.set(x, y, tile_unbreakable);
                    else this.set(x, y, Math.random()*2|0);
        }

        field: number[] = [];

        get(x: number, y: number): number {
            if (x<0 || y<0 || x>=this.w || y>=this.h)
                return tile_wall;
            return this.field[x + y*this.w];
        }

        set(x: number, y: number, value: number) {
            if (x<0 || y<0 || x>=this.w || y>=this.h)
                return;
            this.field[x+y*this.w] = value;
        }
    }

    export class GameState extends State {
        childs: State[] = [];
        units: Units;
        map: Map;

        constructor () {
            super();
            this.map = new Map(this, 13, 9);
            this.units = new Units(this);
        }

        beforeTick(): void{
            for (var i=0; i<this.childs.length; i++)
                this.childs[i].nowTick();
        }

        nowTick(): void{
            for (var i=0; i<this.childs.length; i++)
                this.childs[i].nowTick();
        }

        afterTick(): void{
            for (var i=0; i<this.childs.length; i++)
                this.childs[i].nowTick();
        }
    }
}
