import type { View } from "../api";
import type { DataBase } from "../db";

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

export class FalconView<V extends string, D extends string> {
    public falcon: FalconGlobal<V, D>;
    private spec: View<D>;
    public onUpdate: () => void;
    constructor(spec: View<D>, onUpdate: () => void) {
        this.spec = spec;
        this.onUpdate = onUpdate;
    }
    giveAccessToFalcon(falcon: FalconGlobal<V, D>) {
        this.falcon = falcon;
    }
}
