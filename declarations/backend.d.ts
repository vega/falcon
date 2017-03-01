/**
 * A backend that can be queried.
 */
interface Backend {
  query(config: QueryConfig): Promise<ResultData>
}

interface QueryConfig {
  activeView?: ActiveView
  index?: Point
  views: ViewQuery[]
  cacheKeys?: {[view: string]: string}
}

interface AbstractViewQuery {
  /** Whether to query this view or not. */
  query: boolean
  /** The name of the view. */
  name: string
}

interface ViewQuery1D extends AbstractViewQuery {
  type: '1D'
  range: Interval<number>
  brush?: Interval<number>
}

interface ViewQuery2D extends AbstractViewQuery{
  type: '2D'
  ranges: [Interval<number>, Interval<number>]
  brushes?: [Interval<number>, Interval<number>]
}

type ViewQuery = ViewQuery1D | ViewQuery2D;
