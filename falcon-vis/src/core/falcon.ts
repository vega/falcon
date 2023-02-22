import { View0D, View1D, ViewSet, View1DState, View0DState } from "./views";
import { excludeMap } from "./util";
import type { Dimension } from "./dimension";
import type { FalconDB, FalconIndex, Filters } from "./db/db";
import type { OnChange } from "./views/viewAbstract";

export class Falcon {
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
    this.views = new ViewSet();
    this.filters = new Map();
    this.index = new Map();
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

  /**
   * Creates a 0D view that counts the number of entries
   *
   * @returns the view
   */
  linkCount(onChange?: OnChange<View0DState>) {
    return this.createView0D(onChange);
  }
  private createView0D(onChange?: OnChange<View0DState>) {
    this.assertDataExists();

    const view = new View0D(this);
    this.views.add(view);

    if (onChange) {
      view.addOnChangeListener(onChange);
    }

    return view;
  }

  /**
   * Creates a 1D view and links with the other views under this falcon object
   *
   * @returns the 1D view you can directly filter with .select()
   */
  linkView1D(dimension: Dimension, onChange?: OnChange<View1DState>) {
    return this.createView1D(dimension, onChange);
  }
  private createView1D(dimension: Dimension, onChange?: OnChange<View1DState>) {
    this.assertDataExists(dimension);

    const view = new View1D(this, dimension);
    this.views.add(view);

    if (onChange) {
      view.addOnChangeListener(onChange);
    }

    return view;
  }

  /**
   * @param offset the offset to start the iteration from (within filtered)
   * @param length the number of entries to return
   * @returns an iterable that iterates over instances from the filter
   */
  async getEntries({ offset = 0, length = Infinity } = {}) {
    return this.db.entries(offset, length, this.filters);
  }

  /**
   * Fetches the initial counts for all the views
   * This does not involve fetching the falcon index
   */
  async initializeAllCounts() {
    this.views.forEach(async (view) => {
      await view.initializeAllCounts();
    });
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
}
