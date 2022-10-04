import type { Falcon } from "./falcon";
import type { Dimension, View1DInput } from "./api";

/**
 * A cross filterable view that can be directly
 * interacted with by the user.
 */
export class View1D<NT extends string> {
    protected mode: "active" | "passive";
    protected falcon: Falcon | undefined = undefined;
    dimension: Dimension<NT>;
    onUpdate: (bins: number[]) => void;

    constructor(config: View1DInput<NT>) {
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
    select(selection: [number, number] | string[] | number[]) {
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
