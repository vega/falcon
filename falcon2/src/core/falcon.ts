import { View0D, View1D, ViewCollection } from "./views";
import { excludeMap } from "./util";
import type { Dimension } from "./dimension";
import type { FalconDB, FalconIndex, Filters } from "./db/db";
import type { InstancesInput } from "./instances";

export class Falcon {
  db: FalconDB;
  views: ViewCollection;
  filters: Filters;
  index: FalconIndex;

  /**
   * Takes a data and creates the main driver of the Falcon library
   *
   * Here, you can then create new views (view0D or view1D) and directly interact with
   * those
   */
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
    const activeView = this.views.active;
    if (activeView instanceof View0D) {
      throw Error("No filter for 0D view / count");
    } else if (activeView instanceof View1D) {
      const onlyPassiveFilters = excludeMap(this.filters, activeView.dimension);
      return onlyPassiveFilters;
    } else {
      throw Error("2D view not implemented yet");
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
   * adds a listener to return instances on filter change
   *
   * every time the filter changes, this will get called.
   *
   * You can also select specific values by interacting with it
   *
   * for(const batch of filteredInstances) {
   *     const instances = batch;
   *     break;
   * }
   *
   * ORRRRR
   *
   * const instances = falcon.instances(32);
   * for(const batch of instances) {
   *    const indices = batch.load();
   *    break;
   * }
   *
   * ORRRRR
   *
   * const instances = falcon.instances({batchSize: 32});
   * const ids = instances.getBatch(); // queries the database with the given filters
   *
   */
  async instances({ offset = 0, length = Infinity } = {}) {
    const indices = await this.db.instances(offset, length, this.filters);
    return indices;
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
