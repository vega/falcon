import type { View } from "./view";

/**
 * Falcon connects the data to the views. Its basically the data spec.
 * After views are added here, views are directly interacted with
 * for the reactive filter count updates. Check out View.ts for more.
 */
export class Falcon {
    views: View[];
    data: any;
    constructor(data: any) {
        this.views = [];
        this.data = data;
    }
    add(...views: View[]) {
        views.forEach((view) => {
            // allow each view to access the data from falcon
            view._connectFalconViews(this);
            this.views.push(view);
        });
        return this;
    }
}
