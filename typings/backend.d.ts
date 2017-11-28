/**
 * A backend that can be queried.
 */
interface Backend {
  query(config: QueryConfig): Promise<ResultData>
}

interface QueryConfig {
  activeView?: View
  index?: Point
  views: View[]
}
