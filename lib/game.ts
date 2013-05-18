class State {
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

class Unit extends State {
    id, index: number = 0;
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

class Units extends State {
    constructor (public gs: GameState) {

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
        for (i=0; i<this.list.length; i++)
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

class GameState extends State {
    childs: State[] = [];

}
