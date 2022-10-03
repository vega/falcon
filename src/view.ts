import type { Falcon } from "./falcon";
import type {
    ViewMode,
    Dimension,
    View1DInput,
    dtype,
    View1DOnUpdate,
} from "./api";

/**
 * A cross filterable view that can be directly
 * interacted with by the user.
 */
export class View1D<DT extends dtype> {
    protected mode: ViewMode;
    protected falcon: Falcon | undefined = undefined;
    dimension?: Dimension<DT>;
    onUpdate?: View1DOnUpdate<DT>;
    constructor(config: View1DInput<DT>) {
        this.dimension = config.dimension;
        this.onUpdate = config.onUpdate;
        this.mode = "passive";
    }

    /**
     * For anything to be done, this View must have access to the data
     * This method is called in the falcon.ts add(view) method
     */
    _connectFalconViews(falcon: Falcon) {
        this.falcon = falcon;
    }

    /**
     * Prefetch data tiles based on mode (active or passive)
     */
    prefetch() {
        console.log("prefetch()");
    }

    /**
     * Count using the falcon data tiles based on mode (active or passive)
     */
    select(selection: [number, number]) {
        this.setActive();
        console.log(`filter([${selection}])`);
    }

    setActive() {
        this.falcon?.setAllViewsPassive();
        this.mode = "active";
    }
    setPassive() {
        this.mode = "passive";
    }
}
