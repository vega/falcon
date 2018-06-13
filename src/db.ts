import { histogram, format, nest } from "d3";
import * as crossfilter from "crossfilter2";
import {
  flatten,
  binningFunc,
  is1DView,
  binningPixelFunc,
  binFunc
} from "./util";
import { bin } from "vega-statistics";

const paddedFormat = format("06.1f");

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
        const bins = bin({ maxbins: view.bins, extent: view.domain });
        this.dims[`${view.name};${view.dimension}`] = this.cross.dimension(
          d => d[view.dimension]
        );
        this.groups[view.name] = this.dims[
          `${view.name};${view.dimension}`
        ].group(binFunc(bins.start, bins.step));
      } else {
        this.dims[`${view.name};${view.dimensions[0]}`] = this.cross.dimension(
          d => d[view.dimensions[0]]
        );
        this.dims[`${view.name};${view.dimensions[1]}`] = this.cross.dimension(
          d => d[view.dimensions[1]]
        );

        this.dims[view.name] = this.cross.dimension(d => {
          return [d[view.dimensions[0]], d[view.dimensions[1]]]
            .map(paddedFormat)
            .join(";");
        });

        const binX = binningPixelFunc(view.domains[0], view.bins[0]);
        const binY = binningPixelFunc(view.domains[1], view.bins[1]);

        this.groups[view.name] = this.dims[view.name].group();
        // .group(d => {
        //   d = d.split(";").map(d => +d);
        //   return [binX(d[0]), binY(d[1])].map(paddedFormat).join(";");
        // });
      }
    }
  }

  public histogram(name: string) {
    return this.groups[name].all().map(d => ({
      bin_start: d.key,
      count: d.value
    }));
  }

  public heatmap(
    name: string,
    bins: [number, number],
    domains: [number, number][]
  ) {
    const binX = binningPixelFunc(domains[0], bins[0]);
    const binY = binningPixelFunc(domains[1], bins[1]);

    const data = nest<any, any>()
      .key(d => {
        const key = d.key.split(";").map(d => +d);
        return [binX(key[0]), binY(key[1])].map(paddedFormat).join(";");
      })
      .rollup(v => {
        let s = 0;
        for (const e of v) {
          s += e.value;
        }
        return s;
      })
      .entries(this.groups[name].all());

    return data
      .map(d => ({
        key: d.key.split(";").map(d => +d),
        value: d.value
      }))
      .filter(d => d.value > 0)
      .filter(
        d =>
          d.key[0] >= 0 &&
          d.key[0] < bins[0] &&
          d.key[1] >= 0 &&
          d.key[1] < bins[1]
      )
      .map(d => ({
        binx:
          (d.key[0] * (domains[0][1] - domains[0][0])) / bins[0] +
          domains[0][0],
        biny:
          (d.key[1] * (domains[1][1] - domains[1][0])) / bins[1] +
          domains[1][0],
        count: d.value
      }));
  }

  public length() {
    return this.data[Object.keys(this.data)[0]].length;
  }
}
