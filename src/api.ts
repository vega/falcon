export type Interval<T> = [T, T];
export interface AbstractView {
    type: "0D" | "1D" | "2D";
}
export interface BinConfig {
    start: number;
    stop: number;
    step: number;
}
export type Range = "range";
export type Category = "category";
export type DType = Category | Range; // select vs brush
export interface AbstractDimension<NT, DT extends DType> {
    name: NT;
    dtype: DT;
}

export interface RangeBin {
    filteredCount: number;
    count: number;
}

export interface RangeDimension<NT> extends AbstractDimension<NT, Range> {
    /** Initial domain for the dimension.  If it's not supplied, will be inferred from the extent of the data. */
    extent?: Interval<number>;

    /** Number of bins for this dimension. We will use this as the resolution at all zoom levels. */
    bins: number;

    /** Current configuration of bins. */
    binConfig?: BinConfig;
}

export interface CategoryDimension<NT>
    extends AbstractDimension<NT, Category> {}

export type Dimension<NT extends string> =
    | RangeDimension<NT>
    | CategoryDimension<NT>;

export interface View1DInput<NT extends string> {
    dimension: Dimension<NT>;
    onUpdate: (state: number[]) => void;
}
