export type ViewMode = "active" | "passive";
export type dtype = "category" | "range";

export interface Dimension<DT extends dtype> {
    name: string;
    dtype: DT;
    numBins: number;
}

export interface DimensionUpdated<DT extends dtype> extends Dimension<DT> {
    counts: number[];
}

export type View1DOnUpdate<DT extends dtype> = (
    state: DimensionUpdated<DT>
) => void;
export interface View1DInput<DT extends dtype> {
    dimension: Dimension<DT>;
    onUpdate: View1DOnUpdate<DT>;
}
