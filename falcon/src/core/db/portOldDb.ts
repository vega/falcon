import { View, View0D, View1D } from "../views";
import type { Dimension } from "../dimension";
import type { FalconDB, DimensionFilters, Index, IndexContainer } from "./db";
import type { View0D as OldView0D, View1D as OldView1D } from "../../old/api";
import type { DataBase as OldDataBase } from "../../old/db";

export class DatabasePort implements FalconDB {
  private db: OldDataBase<string, string>;
  constructor(db: OldDataBase<string, string>) {
    this.db = db;
  }
  async length() {
    return await this.db.length();
  }
  async extent(dimension: Dimension) {
    return await this.db.getDimensionExtent(dimension);
  }
  async load1DAll(view: View1D, filters?: DimensionFilters) {
    const dimension = view.dimension;
    const result = await this.db.histogram(dimension, filters);
    return result.hist;
  }
  load1DIndex(
    activeView: View1D,
    passiveViews: View[],
    filters: DimensionFilters
  ) {
    const pixels = activeView.dimension.resolution;

    // convert to interface format that the old db wants
    const activeInterface = oldViewInterface(activeView) as OldView1D<string>;
    const passiveInterfaces = passiveViews.map(oldViewInterface);
    const viewNameMapInterface = new Map(
      passiveInterfaces.map((inter, i) => [i.toString(), inter])
    );
    const viewNameMap = new Map(
      passiveViews.map((view, i) => [i.toString(), view])
    );

    // convert out of the result to our format
    const result = this.db.loadData1D(
      activeInterface,
      pixels,
      viewNameMapInterface,
      filters
    );

    const viewObjMap: Index = new Map();
    for (const viewName of viewNameMap.keys()) {
      const index = result.get(viewName)! as Promise<IndexContainer> &
        IndexContainer;
      const view = viewNameMap.get(viewName)! as View;
      viewObjMap.set(view, index);
    }
    return viewObjMap;
  }
}

function oldViewInterface(view: View) {
  if (view instanceof View1D) {
    const oldView: OldView1D<string> = {
      dimension: view.dimension,
      type: "1D",
    };
    return oldView;
  } else if (view instanceof View0D) {
    const oldView: OldView0D = {
      type: "0D",
    };
    return oldView;
  } else {
    throw Error("Only 0D, 1D, and 2D view conversions");
  }
}
