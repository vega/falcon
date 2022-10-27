import type { Dimension, View } from "../api";
import { Interval } from "../basic";
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
    async add(...views: FalconView<V, D>[]) {
        for (const view of views) {
            await this.addSingleView(view);
        }
    }
    async addSingleView(view: FalconView<V, D>) {
        if (!this.dbReady) {
            await this.initDB();
        }

        // connect the view to the data and do initial counts
        view.giveAccessToFalcon(this);
        await view.initialize();
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
    async initialize() {
        this.verifyFalconAccess();

        const { db } = this.falcon;

        let data: any = null;
        if (this.spec.type === "1D") {
            const { dimension } = this.spec;

            const inferExtent =
                dimension.extent ?? (await db.getDimensionExtent(dimension));
            dimension.binConfig = createBinConfig(dimension, inferExtent);
            const { hist } = await db.histogram(dimension);
            data = hist;
        } else if (this.spec.type === "2D") {
            const { dimensions } = this.spec;

            // bin config on each dimension
            for (const dimension of dimensions) {
                const inferExtent =
                    dimension.extent ??
                    (await db.getDimensionExtent(dimension));
                dimension.binConfig = createBinConfig(dimension, inferExtent);
            }

            const heatmapData = db.heatmap(dimensions);
            data = heatmapData;
        } else if (this.spec.type === "0D") {
            const totalCount = db.length();
            data = totalCount;
        } else {
            throw Error("Number of dimensions must be 0D 1D or 2D");
        }

        // EPIC! now we can update the user with the initial data
        /**
         * @TODO send them a nice array of {bin: the actual bin description, count: num, filteredCount: num}
         */
        this.onUpdate({ data });
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

function createBinConfig<D extends string>(
    dimension: Dimension<D>,
    extent: Interval<number>
) {
    const binningFunc = dimension.time ? binTime : bin;
    return binningFunc(dimension.bins, extent);
}
