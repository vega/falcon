import { View0D, View1D, ViewCollection } from "./views";
import { excludeMap } from "./util";
import type { Dimension } from "./dimension";
import type { FalconDB, FalconIndex, Filters } from "./db/db";

export class Falcon {
  db: FalconDB;
  views: ViewCollection;
  filters: Filters;
  index: FalconIndex;
  constructor(db: FalconDB) {
    this.db = db;
    this.views = new ViewCollection();
    this.filters = new Map();
    this.index = new Map();
  }

  /**
   * @returns the filters and excludes the active view dimension's filters
   */
  get passiveFilters(): Filters {
    if (this.views.active instanceof View0D) {
      throw Error("No filter for 0D view / count");
    } else {
      return excludeMap(this.filters, this.views.active.dimension);
    }
  }

  /**
   * add 0D view, does not initialize the view
   */
  view0D() {
    const view = new View0D(this);
    this.views.add(view);
    return view;
  }
  /**
   * alias for view0D
   */
  count() {
    return this.view0D();
  }

  /**
   * add 1D view, does not initialize the view
   */
  view1D(dimension: Dimension) {
    const view = new View1D(this, dimension);
    this.views.add(view);
    return view;
  }

  /**
   * Fetches the initial counts for all the views
   * This does not involve fetching the falcon index
   */
  async all() {
    this.views.forEach(async (view) => {
      await view.all();
    });
  }
}
