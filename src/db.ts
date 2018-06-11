import { histogram } from "d3";
import * as crossfilter from "crossfilter2";
import { flatten, binningFunc } from "./util";

export class DataBase {
  private cross: crossfilter.Crossfilter<any>;
  public dims: { [key: string]: crossfilter.Dimension<any, any> } = {};
  public groups: { [key: string]: crossfilter.Group<any, any, any> } = {};

  public constructor(private data: { [name: string]: any[] }, views: View[]) {
    console.info(data);

    this.initCrossfilter(views);
  }

  private initCrossfilter(views: View[]) {
    this.cross = (crossfilter as any).default(flatten(this.data));
    for (const view of views) {
      this.dims[view.name] = this.cross.dimension(d => d[view.name]);
      this.groups[view.name] = this.dims[view.name].group(
        binningFunc(view.range, view.bins)
      );
    }
  }

  public histogram(name: string, bins: number, range: [number, number]) {
    return this.groups[name]
      .all()
      .filter(d => d.key >= 0 && d.key < bins)
      .map(d => ({
        // map from keys to bin start
        bin_start: (d.key * (range[1] - range[0])) / bins + range[0],
        count: d.value
      }));
  }

  public length() {
    return this.data[Object.keys(this.data)[0]].length;
  }
}
