// change these later
type Index = any;
type Dimension = any;
type NdArray = any;

/**
 * The common database needs to
 * 1. Initialize the database (may need extra backend steps)
 * 2. Quickly get the total counts at the start for 1D and 2D Views
 * 3. Compute Indexes for 1D and 2D Views
 * 4. Get total count for 0D Views
 *
 * init is analog to falcon v1 histogram or heatmap
 * falconIndex is analog to falcon v1 load
 */
export interface DataBase {
    /**
     * Db may need other initialization steps
     * Do that here
     */
    initialize(): Promise<void> | void;

    /**
     * Get the total counts for the 1D view
     */
    total1D(dim: Dimension): NdArray;

    /**
     * Get the total counts for the 2D view
     */
    total2D(dims: [Dimension, Dimension]): NdArray;

    /**
     * Get the falcon index for the 1D view
     */
    falconIndex1D(dim: Dimension): Index;

    /**
     * Get the falcon index for the 2D view
     */
    falconIndex2D(dims: [Dimension, Dimension]): Index;
}
