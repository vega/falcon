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
    public get(index: number, dimension: string): {hit: boolean, data?:number[]} {
        const entry = this.cache[index];
        if (!entry) {
            return {hit: false};
        }
        return {hit: true, data: entry[dimension]};
    }

    public getAll(index: number): {hit: boolean, data?: {[dimension: string]: number[]}} {
        const entry = this.cache[index];
        if (!entry) {
            return {hit: false};
        }
        return {hit: true, data: entry};
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

export default Cache;
