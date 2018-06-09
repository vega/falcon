import { histogram } from "d3";

export class DataBase {
  public constructor(private data: { [name: string]: any[] }) {
    console.info(data);
  }

  public histogram(name: string, bins: number, range: [number, number]) {
    return histogram()
      .domain(range)
      .thresholds(bins)(this.data[name])
      .map(d => d.length);
  }

  public length() {
    return this.data[Object.keys(this.data)[0]].length;
  }

  public filteredHistograms(
    query: {
      name: string;
      bins: number;
      range: [number, number];
      brush?: [number, number];
    }[]
  ) {
    const allFilterMasks = {};

    for (const v of query) {
      if (v.brush) {
        // TODO: could make this a bitmap
        let ok: boolean[] = new Array(this.length());
        for (let i = 0; i < ok.length; i++) {
          ok[i] = true;
        }

        const col = this.data[v.name];
        for (let i = 0; i < this.length(); i++) {
          const val = col[i];
          if (val < v.brush[0] || v.brush[1] < val) {
            ok[i] = false;
          }
        }

        allFilterMasks[v.name] = ok;
      }
    }

    const out = {};

    for (const q of query) {
      const name = q.name;

      // filter data with respect to the other views
      const filterMasks = query
        .filter(v => v.name !== name && v.brush)
        .map(v => allFilterMasks[v.name]);

      const filtered = this.data[name].filter((_, i) => {
        for (let j = 0; j < filterMasks.length; j++) {
          if (!filterMasks[j][i]) {
            return false;
          }
        }
        return true;
      });

      const hist = histogram()
        .domain(q.range)
        .thresholds(q.bins)(filtered)
        .map(d => d.length);

      out[name] = hist;
    }

    return out;
  }
}
