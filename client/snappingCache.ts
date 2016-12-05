import {combineRanges} from './index';
import {ascending} from 'd3-array';

/**
 * Cache from index (the pixel location) to an object with data for all non-active dimensions.
 */
class SnappingCache {
    private cache: {[dimension: string]: {index: number, data: number[]}[]} = {};
    private dimensions: string[] = [];

    constructor(dimensions: string[]) {
        this.dimensions = dimensions;
    }

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
     */
    private get(index: number, dimension: string): {index: number, data: number[]} {
        const data = this.cache[dimension];
        if (!data || data.length === 0) {
            return null;
        }

        // binary search
        let mid;
        let lo = 0;
        let hi = data.length - 1;

        while (hi - lo > 1) {
            mid = Math.floor ((lo + hi) / 2);
            if (data[mid].index < index) {
                lo = mid;
            } else {
                hi = mid;
            }
        }
        if (index - data[lo].index <= data[hi].index - index) {
            return {index: lo, data: data[lo].data};
        }
        return {index: hi, data: data[hi].data};
    }

    /**
     * Get the combined data from start to end.
     */
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

    /**
     * Get all the combined values for all dimensions.
     */
    public getAllCombined(start: number, end: number): {dimension: string, data: number[]}[] {
        return Object.keys(this.cache).map(dimension => {
            const data = this.getCombined(start, end, dimension);
            return {
                dimension,
                data
            };
        });
    }

    /**
     * Clear the cache.
     */
    public invalidate() {
        this.cache = {};
    }

    /**
     * Returns true if we have data cached for all dimensions at this index.
     * Since we do snapping, we just check whetehr we have data for all dimensions.
     */
    public hasFullData(index: number) {
        this.dimensions.forEach(d => {
            if(!this.cache[d]) {
                return false;
            }
        });

        return true;
    }
};

export default SnappingCache;
