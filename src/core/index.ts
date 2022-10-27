import type { View } from "../api";
import type { DataBase } from "../db";

/**
 * Falcon object that deals with the data
 * and keeps track of all the views
 */
export class FalconGlobal<V extends string, D extends string> {
    protected db: DataBase<V, D>;
    constructor(db: DataBase<V, D>) {
        this.db = db;

        this.initDB();
    }
    async initDB() {
        if (this.db) {
            await this.db.initialize();
        } else {
            throw Error("Make sure you have loaded the db in the constructor");
        }
    }
    add(view: FalconView<V, D>) {
        view.giveAccessToFalcon(this);
    }
}

type OnUpdate<T> = (updatedState: T) => void;

/**
 * Falcon view that deals with the dimensions
 * and user interaction
 */
export class FalconView<V extends string, D extends string> {
    public falcon: FalconGlobal<V, D>;
    private spec: View<D>;
    public onUpdate: OnUpdate<object>;
    constructor(spec: View<D>, onUpdate: OnUpdate<object>) {
        this.spec = spec;
        this.onUpdate = onUpdate;

        this.initCounts();
    }
    /**
     * since we have no idea which chart will become the active
     * just show the initial counts to start
     */
    initCounts() {
        /* at the end, update the counts to the user */
        this.onUpdate({ nice: 1 });
    }
    giveAccessToFalcon(falcon: FalconGlobal<V, D>) {
        this.falcon = falcon;
    }
}
