export type ViewMode = "active" | "passive";

export type Bin = { filteredCount: number; count: number };
export type Bins = Bin[];
export interface Dimension {
    name: string;
}
export interface UpdateDimension extends Dimension {
    bins: Bins;
}
export type ViewOnUpdateCallback = (state: UpdateDimension[]) => void; // dimensions x bins
// update is a callback that will return
export interface ViewConstructor {
    dimensions?: Dimension[];
    onUpdate?: ViewOnUpdateCallback;
}
