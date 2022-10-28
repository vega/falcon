import type { Dimension, View } from "../api";
import { Interval } from "../basic";
import type { DataBase } from "../db/index";
import { binTime, bin } from "../util";

/**
 * Falcon object that deals with the data
 * and keeps track of all the views
 */
export class FalconGlobal<V extends string, D extends string> {
    public db: DataBase<V, D>;
    dbReady: boolean;
    views: FalconView<V, D>[];
    constructor(db: DataBase<V, D>) {
        this.db = db;
        this.dbReady = false;
        this.views = [];
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
        // keep track of views on this global object
        this.views.push(view);
        await view.initialize();
    }
    async buildFalconIndex() {
        //
    }
    async updatePassiveCounts() {
        //
    }
}

type OnUpdate<T> = (updatedState: T) => void;

/**
 * Falcon view that deals with the dimensions
 * and user interaction
 */
export class FalconView<V extends string, D extends string> {
    public falcon!: FalconGlobal<V, D>;
    private spec: View<D>;
    public onUpdate: OnUpdate<object>;
    private isActive: boolean;
    public name: V;
    constructor(spec: View<D>, onUpdate: OnUpdate<object>) {
        this.spec = spec;
        this.onUpdate = onUpdate;
        this.isActive = false;
        this.name = this.createViewNameFromSpec(spec) as V;
    }

    /**
     * @TODO remove view names altogether
     * this functions covers up a spandrel of using the old
     * db code
     * Might need to use a unique id here given the map
     */
    createViewNameFromSpec(spec: View<D>) {
        if (spec.type === "0D") {
            return "TOTAL";
        } else if (spec.type === "1D") {
            return spec.dimension.name.toString();
        } else if (spec.type === "2D") {
            return spec.dimensions.reduce((acc, dimension) => {
                return `${acc}*${dimension.name.toString()}`;
            }, "");
        } else {
            throw Error("Type is something other than 0D, 1D or 2D");
        }
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

    /**
     * Fetches the falcon index where this view is the active one
     * and rest are passive
     */
    async prefetch() {
        /**
         * if already an active view, no need to prefetch anything
         * but, if not active, make active and fetch the index for the falcon magic
         */
        // and 0D has no prefetch mechanic
        if (!this.isActive && this.spec.type !== "0D") {
            this.makeActiveView();
            await this.falcon.buildFalconIndex();
        }
    }

    /**
     * Filters the data by the specified brush interactively
     * then calls onUpdate when finished
     */
    async interact(brush: number[] | number[][]) {
        const alreadyPrefetched = false; // update this with something more sophisticated
        if (!alreadyPrefetched) {
            await this.prefetch();
        }
        await this.falcon.updatePassiveCounts();
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
    makeActiveView() {
        this.isActive = true;
        this.otherViews.forEach((view) => (view.isActive = false));
    }
    get otherViews(): FalconView<V, D>[] {
        return this.falcon.views.filter((view) => view !== this);
    }
}

function createBinConfig<D extends string>(
    dimension: Dimension<D>,
    extent: Interval<number>
) {
    const binningFunc = dimension.time ? binTime : bin;
    return binningFunc(dimension.bins, extent);
}
