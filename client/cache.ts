import {combineRanges} from './index';

/**
 * Cache from index (the pixel location) to an object with data for all non-active dimensions.
 */
class Cache {
    private cache: {[index: number]: {[dimension: string]: number[]}} = {};
    private dimensions: string[] = [];

    constructor(dimensions: string[]) {
        this.dimensions = dimensions;
    }

    /**
     * Set an entry in the cache.
     */
    public set(index: number, dimension: string, data: number[]) {
        if (!(index in this.cache)) {
            this.cache[index] = {};
        }

        this.cache[index][dimension] = data;
    }

    /**
     * Retrieve value from the cache. Returns null if there was no hit.
     */
    private get(index: number, dimension: string): number[] {
        const entry = this.cache[index];
        if (!entry) {
            return null;
        }
        return entry[dimension] || null;
    }

    /**
     * Get the combined data from start to end.
     */
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

    /**
     * Get all the combined values for all dimensions.
     */
    public getAllCombined(start: number, end: number): {dimension: string, data: number[]}[] {
        const c0 = this.cache[start];
        if (!c0) {
            return [];
        }

        const c1 = this.cache[end];
        if (!c1) {
            return [];
        }

        const results = [];
        Object.keys(c0).forEach(dimension => {
            if (dimension in c1) {
                results.push({
                    dimension,
                    data: combineRanges(c0[dimension], c1[dimension])
                });
            }
        });

        return results;
    }

    /**
     * Clear the cache.
     */
    public invalidate() {
        this.cache = {};
    }

    /**
     * Returns true if we have data cached for all dimensions at this index.
     */
    public hasFullData(index: number) {
        const entry = this.cache[index];
        if (!entry) {
            return false;
        }

        this.dimensions.forEach(d => {
            if(!entry[d]) {
                return false;
            }
        });

        return true;
    }
};

export default Cache;
