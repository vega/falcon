import { View, View0D, View1D } from "../views";
import type { Dimension } from "../dimension";
import type {
  FalconDB,
  FalconIndex,
  FalconCube,
  Filters,
  BinnedCounts,
} from "./db";
import { FalconArray } from "../falconArray";
import type { Interval } from "../util";
import type { View0D as OldView0D, View1D as OldView1D } from "../../old/api";
import type { Hist, Hists } from "../../old/db";
import type { DataBase as OldDataBase } from "../../old/db";
import { NdArray } from "ndarray";

export class DatabasePort implements FalconDB {
  private db: OldDataBase<string, string>;
  constructor(db: OldDataBase<string, string>) {
    this.db = db;
  }
  async length() {
    return await this.db.length();
  }
  async range(dimension: Dimension) {
    return await this.db.getDimensionExtent(dimension);
  }
  async histogramView1D(view: View1D, filters?: Filters) {
    const dimension = view.dimension;
    const brushes = filters ? newToOldBrushesInterface(filters) : filters;
    const result = await this.db.histogram(dimension, brushes);
    return oldToNewHistInterface(result);
  }
  falconIndexView1D(
    activeView: View1D,
    passiveViews: View[],
    filters: Filters
  ) {
    const pixels = activeView.dimension.resolution;

    // convert to interface format that the old db wants
    const activeInterface = newToOldViewInterface(
      activeView
    ) as OldView1D<string>;
    const passiveInterfaces = passiveViews.map(newToOldViewInterface);
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
      newToOldBrushesInterface(filters)
    );

    const viewObjMap: FalconIndex = new Map();
    for (const viewName of viewNameMap.keys()) {
      const index = result.get(viewName)!;
      const view = viewNameMap.get(viewName)! as View;
      //@ts-ignore
      viewObjMap.set(view, oldToNewHistsInterface(index));
    }
    return viewObjMap;
  }
}

function oldToNewArray(old: NdArray): FalconArray {
  //@ts-ignore
  const newHists = new FalconArray(old.data, old.shape, old.stride, old.offset);
  return newHists;
}
function oldToNewHistsInterface(index: Hists) {
  const newFormat = {
    filter: oldToNewArray(index.hists),
    noFilter: oldToNewArray(index.noBrush),
  } as FalconCube;

  return newFormat;
}

function oldToNewHistInterface(index: Hist) {
  const newFormat = {
    filter: oldToNewArray(index.hist),
    noFilter: oldToNewArray(index.noBrush),
  } as BinnedCounts;

  return newFormat;
}

function newToOldBrushesInterface(
  filters: Filters
): Map<string, Interval<number>> {
  const oldMap = new Map<string, Interval<number>>();
  for (const [dimension, filter] of filters) {
    oldMap.set(dimension.name, filter);
  }
  return oldMap;
}

function newToOldViewInterface(view: View) {
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
