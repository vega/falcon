import { histogram } from "d3";
import * as crossfilter from "crossfilter2";
import { flatten, binningFunc, is1DView } from "./util";

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
      if (is1DView(view)) {
        this.dims[view.dimension] = this.cross.dimension(
          d => d[view.dimension]
        );
        this.groups[view.name] = this.dims[view.dimension].group(
          binningFunc(view.range, view.bins)
        );
      } else {
        this.dims[view.dimensions[0]] = this.cross.dimension(
          d => d[view.dimensions[0]]
        );
        this.dims[view.dimensions[1]] = this.cross.dimension(
          d => d[view.dimensions[1]]
        );

        this.dims[view.name] = this.cross.dimension(d => {
          return [d[view.dimensions[0]], d[view.dimensions[1]]] as any;
        });

        this.groups[view.name] = this.dims[view.name].group(d => {
          return [
            binningFunc(view.ranges[0], view.bins[0])(d[0]),
            binningFunc(view.ranges[1], view.bins[1])(d[1])
          ] as any;
        });
      }
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

  public heatmap(name: string, bins: number[], ranges: [number, number][]) {
    return this.groups[name]
      .all()
      .filter(
        d =>
          d.key[0] >= 0 &&
          d.key[0] < bins[0] &&
          d.key[1] >= 0 &&
          d.key[1] < bins[1]
      )
      .map(d => ({
        binx:
          (d.key[0] * (ranges[0][1] - ranges[0][0])) / bins[0] + ranges[0][0],
        biny:
          (d.key[1] * (ranges[1][1] - ranges[1][0])) / bins[1] + ranges[1][0],
        count: d.value
      }));
  }

  public length() {
    return this.data[Object.keys(this.data)[0]].length;
  }
}
