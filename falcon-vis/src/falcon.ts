import { View0D, View1D, ViewSet, View1DState, View0DState } from "./views";
import { excludeMap } from "./util";
import type { Dimension } from "./dimension";
import type { FalconDB, FalconIndex, Filters } from "./db/db";
import type { OnChange } from "./views/viewAbstract";

export class FalconVis {
  db: FalconDB;
  views: ViewSet;
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
    this.views = new ViewSet(); // this may be a bs abstraction
    this.filters = new Map();
    this.index = new Map();
  }

  /**
   * Creates a 0D view that counts the number of entries
   * if this is called when there is already an active view, it will just compute this passive index
   *
   * @returns the view
   */
  async view0D(onChange?: OnChange<View0DState>) {
    await this.assertDataExists();
    const view0D = new View0D(this);
    this.views.add(view0D);
    if (onChange) {
      view0D.addOnChangeListener(onChange);
    }

    return view0D;
  }

  /**
   * Creates a 1D view and links with the other views under this falcon object
   *
   * @returns the 1D view you can directly filter with .select()
   */
  async view1D(dimension: Dimension, onChange?: OnChange<View1DState>) {
    await this.assertDataExists(dimension);
    const view = new View1D(this, dimension);
    this.views.add(view);
    if (onChange) {
      view.addOnChangeListener(onChange);
    }
    return view;
  }

  /**
   * creates an iterator over the filtered entries located at the offset and with a specified length
   * for example, if we have 100 filtered entries, I can position myself halfway (offset = 50) and if I want
   * just 10 entries I would use length = 10
   *
   * @param offset the offset to start the iteration from (within filtered)
   * @param length the number of entries to return
   * @returns iterator over the filtered entries basically a list of objects
   */
  async entries({ offset = 0, length = Infinity } = {}) {
    return this.db.entries(offset, length, this.filters);
  }

  /**
   * Fetches the initial counts for all the views
   * This does not involve fetching the falcon index
   */
  async all() {
    for (const view of this.views) {
      await view.all();
    }
  }

  async link() {
    const av = this.views.active;
    if (!av) {
      await this.all();
    } else {
      /**
       * @todo compute the passive index individually instead of the entire thing
       * @todo this fails for the .update() on view1D
       * setup a system that diffs from the current index and filters
       */
      const forceToCompute = true; // turns off optimizations
      await av.computeIndex(forceToCompute);
      await av.select(av.lastFilter, forceToCompute);
    }
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
  otherFilters(view: View1D): Filters {
    return excludeMap(this.filters, view.dimension);
  }

  /**
   * verifies if we can continue to do stuff on the data
   * throws an error if the data does not exist
   */
  async assertDataExists(...dimensions: Dimension[]) {
    /**
     * Check if the table exists
     */
    const tableExistsInDB = await this.db.tableExists();
    if (!tableExistsInDB) {
      throw new Error(`Table does not exists in the database`);
    }

    /**
     * If provided, check if the dimensions exist
     */
    dimensions?.forEach(async (dimension) => {
      if (dimension) {
        const dimensionExistsInDB = await this.db.dimensionExists(dimension);
        if (!dimensionExistsInDB) {
          throw new Error(
            `Dimension '${dimension.name}' does not exist in the data table`
          );
        }
      }
    });
  }
}
