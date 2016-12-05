import { ascending } from 'd3-array';

export abstract class Cache {
  protected dimensions: string[] = [];

  protected abstract cache: { [dimension: string]: any } = {};

  constructor(dimensions: string[]) {
    this.dimensions = dimensions;
  }

  /**
   * Get all the combined values for all dimensions.
   */
  public getAllCombined(start: number, end: number): { dimension: string, data: number[] }[] {
    return this.getDimensions().map(dimension => {
      const data = this.getCombined(start, end, dimension);
      return {
        dimension,
        data
      };
    }).filter(d => d.data);
  }

  public abstract set(index: number, dimension: string, data: number[])

  /**
   * Get the combined data from start to end.
   */
  public abstract getCombined(start: number, end: number, dimension: string): number[]

  /**
   * Returns true if we have data cached for all dimensions at precisely this index.
   */
  public abstract hasFullData(index: number): boolean

  protected getDimensions(): string[] {
    return Object.keys(this.cache);
  }

  /**
   * Clear the cache.
   */
  public invalidate() {
    this.cache = {};
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

  public getCombined(start: number, end: number, dimension: string): number[] {
    const low = this.get(start, dimension);
    if (low) {
      const high = this.get(end, dimension);
      if (high) {
        return combineRanges(low, high);
      }
    }

    return null;
  }

  public hasFullData(index: number) {
    for (let i = 0; i < this.dimensions.length; i++) {
      const dimension = this.dimensions[i];
      if (!this.get(index, dimension)) {
        return false;
      }
    }

    return true;
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

  public getCombined(start: number, end: number, dimension: string): number[] {
    const low = this.get(start, dimension);
    if (low) {
      const high = this.get(end, dimension);
      if (high && high.index > low.index) {
        return combineRanges(low.data, high.data);
      }
    }

    return null;
  }

  public hasFullData(index: number) {
    for (let i = 0; i < this.dimensions.length; i++) {
      const dimension = this.dimensions[i];
      // check whether the closest point is exactly the index
      if (this.get(index, dimension).index !== index) {
        return false;
      }
    }

    return true;
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
