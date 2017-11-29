/**
 * A backend that can be queried.
 */
interface Backend {
  query(config: QueryConfig): Promise<ResultData>
}

interface QueryConfig {
  /** The active view that the index value is on. */
  activeView?: View
  /** Where to fetch data for in the active view. */
  index?: Point
  /** Size of the acvive view in pixels. */
  size?: Point
  /** Views to query. */
  views: View[]
}
