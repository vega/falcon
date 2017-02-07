import { ascending } from 'd3-array';

export abstract class Cache {
  protected abstract cache: { [dimension: string]: any } = {};

  /**
   * Get all the combined values for all dimensions.
   */
  public getAllCombined(start: number, end: number): { dimension: string, data: number[], range: Interval<number> }[] {
    return this.getDimensions().map(dimension => {
      const result = this.getCombined(start, end, dimension);

      if (result) {
        const {data, range} = result;
        return {
          dimension,
          data,
          range
        };
      }

      return undefined;
    }).filter(d => d);
  }

  /**
   * Add an entry to the cache.
   */
  public abstract set(index: number, dimension: string, data: number[]): void

  /**
   * Get the combined data from start to end. Also returns the range that we actually get (if snapped).
   */
  public abstract getCombined(start: number, end: number, dimension: string): {data: number[], range: Interval<number>}

  public abstract getDebugData(): {dimension: string, caches: number[]}[]

  protected getDimensions(): string[] {
    return Object.keys(this.cache);
  }

  /**
   * Clear the cache.
   */
  public invalidate(dimension?: string) {
    if (dimension) {
      delete this.cache[dimension];
    } else {
      this.cache = {};
    }
  }
}

/**
 * Cache from index (the pixel location) to an object with data for all non-active dimensions.
 */
export class SimpleCache extends Cache {
  protected cache: { [dimension: string]: { [index: number]: number[] } } = {};

  /**
   * Set an entry in the cache.
   */
  public set(index: number, dimension: string, data: number[]) {
    if (!(dimension in this.cache)) {
      this.cache[dimension] = {};
    }

    this.cache[dimension][index] = data;
  }

  /**
   * Retrieve value from the cache. Returns null if there was no hit.
   */
  private get(index: number, dimension: string): number[] {
    const entry = this.cache[dimension];
    if (!entry) {
      return null;
    }
    return entry[index] || null;
  }

  public getCombined(start: number, end: number, dimension: string): {data: number[], range: Interval<number>} {
    const low = this.get(start, dimension);
    if (low) {
      const high = this.get(end, dimension);
      if (high) {
        return {data: combineRanges(low, high), range: [start, end]};
      }
    }

    return null;
  }

  public getDebugData() {
    return this.getDimensions().map(dimension => {
      return {
        dimension,
        caches: Object.keys(this.cache[dimension]).map(d => parseInt(d))
      };
    });
  }
};

/**
 * Cache from index (the pixel location) to an object with data for all non-active dimensions.
 */
export class SnappingCache extends Cache {
  protected cache: { [dimension: string]: { index: number, data: number[] }[] } = {};

  /**
   * Set an entry in the cache.
   */
  public set(index: number, dimension: string, data: number[]) {
    if (!this.cache[dimension]) {
      this.cache[dimension] = [];
    }

    this.cache[dimension].push({
      index,
      data
    });

    // preserve sorting order
    this.cache[dimension].sort(((x, y) => {
      return ascending(x.index, y.index);
    }));
  }

  /**
   * Retrieve clostest value from the cache.
   *
   * TODO:
   *  - Use a smarter index, e.g. range tree
   *  - Since many requests are for items that exist in the cache, we should probably add another secondary index for exact lookups.
   */
  private get(index: number, dimension: string): { index: number, data: number[] } {
    const data = this.cache[dimension];
    if (!data || data.length === 0) {
      return null;
    }

    // binary search
    let mid;
    let lo = 0;
    let hi = data.length - 1;

    while (hi - lo > 1) {
      mid = Math.floor((lo + hi) / 2);
      if (data[mid].index < index) {
        lo = mid;
      } else {
        hi = mid;
      }
    }

    const loIsCloser = index - data[lo].index <= data[hi].index - index;
    const closest = loIsCloser ? data[lo] : data[hi];

    return { index: closest.index, data: closest.data };

  }

  public getCombined(start: number, end: number, dimension: string): {data: number[], range: Interval<number>} {
    // Note: We should use the closest value that is not the other side of the brush.
    // However, in this code we only find the closest point and do not igore the other
    // side of the brush. It should be okay in most cses, though.
    const low = this.get(start, dimension);
    if (low) {
      const high = this.get(end, dimension);
      if (high && high.index > low.index) {
        return {data: combineRanges(low.data, high.data), range: [low.index, high.index]};
      }
    }

    return null;
  }

  public getDebugData() {
    return this.getDimensions().map(dimension => {
      return {
        dimension,
        caches: this.cache[dimension].map(d => d.index)
      };
    });
  }
};

function combineRanges(low: number[], high: number[]) {
  if (low.length !== high.length) {
    throw Error('low and high have to have the same length');
  }

  const data: number[] = [];

  for (let bucket = 0; bucket < low.length; bucket++) {
    data[bucket] = +high[bucket] - low[bucket];

    if (data[bucket] < 0) {
      console.error('Invalid data.');
    }
  }

  return data;
}
