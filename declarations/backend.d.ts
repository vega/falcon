/**
 * A backend that can be queried.
 */
interface Backend {
  query(config: QueryConfig): Promise<ResultData>;
}

/**
 * Information about all dimensions.
 */
type QueryConfig = {[dimension: string]: BrushRange | QueryDimension};

interface AbstractRange {
  lower?: number;
  upper?: number;
}

/**
 * Information about a dimension that we are not querying for but we need
 * information about its this to build predicates.
 *
 * For the active dimension, only the upper range will be set.
 */
interface BrushRange extends AbstractRange {
  /** Don't get data for this dimension. */
  query: false,
}

/**
 * A dimension for which we need data in the result.
 */
interface QueryDimension extends AbstractRange {
  query: true;
  range: Interval;
  bins: number;
}
