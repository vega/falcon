import { NdArray } from "ndarray";
import type { View } from "../api";
import type { DataBase } from "../db";
import { binTime, bin } from "../util";

/**
 * Falcon object that deals with the data
 * and keeps track of all the views
 */
export class FalconGlobal<V extends string, D extends string> {
    public db: DataBase<V, D>;
    dbReady: boolean;
    constructor(db: DataBase<V, D>) {
        this.db = db;
        this.dbReady = false;
    }
    async initDB() {
        if (this.db) {
            await this.db.initialize();
            this.dbReady = true;
        } else {
            throw Error("Make sure you have loaded the db in the constructor");
        }
    }
    async add(view: FalconView<V, D>) {
        if (!this.dbReady) {
            await this.initDB();
        }

        // connect the view to the data and do initial counts
        view.giveAccessToFalcon(this);
        await view.initCounts();
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
    }
    /**
     * since we have no idea which chart will become the active
     * just show the initial counts to start
     */
    async initCounts() {
        this.verifyFalconAccess();

        if (this.spec.type === "1D") {
            const { dimension } = this.spec;
            const { db } = this.falcon;

            /**
             * if the extent is not given, infer it and construct bin config
             */
            const binningFunc = dimension.time ? binTime : bin;
            const extent =
                dimension.extent ?? (await db.getDimensionExtent(dimension));
            dimension.binConfig = binningFunc(dimension.bins, extent);

            /**
             *  get the pure counts from the db directly
             *  no falcon index going on here, just plain counts
             */
            const { hist } = await db.histogram(dimension);

            // EPIC! now we can update the user with the initial data
            /**
             * @TODO send them a nice array of {bin: say the dimensions of the bin, count: num, filteredCount: num}
             */
            this.onUpdate({ data: hist });
        } else if (this.spec.type === "2D") {
            // heatmap
            throw Error("not implemented 2D yet");
        } else if (this.spec.type === "0D") {
            // total count
            throw Error("not implemented 0D yet");
        }
    }
    giveAccessToFalcon(falcon: FalconGlobal<V, D>) {
        this.falcon = falcon;
    }
    verifyFalconAccess(throwError = true) {
        const falconDataExists = this.falcon !== undefined;
        if (!falconDataExists && throwError) {
            console.error("Bad Falcon connection in", this.spec);
            throw Error("View contains no falcon global object");
        }
        return falconDataExists;
    }
}
