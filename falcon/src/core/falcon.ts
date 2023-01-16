import { View0D, View1D, ViewCollection } from "./views";

import type { DataBase as OldDatabase } from "../old/db";
import { FalconDB, DatabasePort, DimensionFilters, Index } from "./db/db";
import { excludeMap } from "./util";
import { Dimension } from "./dimension";

export type OldDB = OldDatabase<string, string>;

export class Falcon {
  db: FalconDB;
  views: ViewCollection;
  filters: DimensionFilters;
  index: Index;
  constructor(db: OldDB) {
    this.db = new DatabasePort(db);
    this.views = new ViewCollection();
    this.filters = new Map();
    this.index = new Map();
  }

  /**
   * @returns the filters and excludes the active view dimension's filters
   */
  get passiveFilters(): DimensionFilters {
    if (this.views.active instanceof View0D) {
      throw Error("No filter for 0D view / count");
    } else {
      return excludeMap(this.filters, this.views.active.dimension.name);
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
  async init() {
    this.views.forEach(async (view) => {
      await view.all();
    });
  }
}
