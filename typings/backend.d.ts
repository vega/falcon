/**
 * A backend that can be queried.
 */
interface Backend {
  query(config: QueryConfig): Promise<ResultData>
}

interface QueryConfig {
  activeViewName?: string
  activeViewType?: '1D' | '2D'
  index?: Point
  views: View[]
  cacheKeys?: {[view: string]: string}
}
