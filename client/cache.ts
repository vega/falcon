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
        if (!this.cache[index]) {
            this.cache[index] = {};
        }

        this.cache[index][dimension] = data;
    }

    /**
     * Retrieve value from the cache. Returns whether there was a hit and if there was also the data.
     */
    public get(index: number, dimension: string): {hit: boolean, data?: number[]} {
        const entry = this.cache[index];
        if (!entry) {
            return {hit: false};
        }
        return {hit: true, data: entry[dimension]};
    }

    /**
     * Get the combined data from start to end.
     */
    public getCombined(start: number, end: number, dimension: string): {hit: boolean, data?: number[]} {
        const {hit: startHit, data: startData} = this.get(start, dimension);
        if (startHit) {
          const {hit: endHit, data: endData} = this.get(end, dimension);
          if (endHit) {
            const combined = combineRanges(startData, endData);
            return {
                hit: true,
                data: combined
            };
          }
        }

        return {
            hit: false
        };
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

        this.dimensions.forEach(d=> {
            if(!entry[d]) {
                return false;
            }
        });

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

export default Cache;
