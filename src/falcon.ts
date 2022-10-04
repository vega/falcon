import type { View1D } from "./view";
import type { DataBase } from "./db/db";

/**
 * Falcon connects user-created views to the database
 * and between the views
 */
export class Falcon {
    views: View1D<string>[];
    db: DataBase;
    constructor(db: DataBase) {
        this.views = [];
        this.db = db;

        this.db.initialize();
    }
    add(...views: View1D<string>[]) {
        views.forEach((view) => {
            // allow each view to access the data from falcon
            view._connectFalconViews(this);
            this.views.push(view);
        });
        return this;
    }
    setAllViewsPassive() {
        this.views.forEach((view) => view.setPassive());
    }
}
