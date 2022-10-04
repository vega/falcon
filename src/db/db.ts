// change these later
type Index = any;
type NdArray = any;
type View = any;

/**
 * Defines how to construct the falcon index
 * and is called in the falcon object
 */
export interface DataBase {
    /**
     * Db may need other initialization steps
     * Do that here
     */
    initialize(): Promise<void> | void;

    /**
     * Since too slow to get falcon Index on startup
     * AND no active index is set yet,
     * just do total counts quickly here
     */
    total0D(): NdArray;
    total1D?(views: View[]): NdArray;
    total2D?(views: View[]): NdArray;

    /**
     * When there is an active view, do the epic
     * data tiles falcon index strategy
     */
    falconIndex1D(activeView: View[], passiveViews: View[]): Index;
    falconIndex2D(activeView: View[], passiveViews: View[]): Index;
}
