/**
 * A backend that can be queried.
 */
interface Backend {
  query(config: QueryConfig): Promise<ResultData>
}

interface QueryConfig {
  activeView?: string,
  index?: Point,
  views: ViewQuery[]
}

interface ViewQuery1D {
  type: '1D',
  query: boolean,
  name: string
  range: Interval<number>
  brush?: Interval<number>
}

interface ViewQuery2D {
  type: '2D',
  query: boolean,
  name: string
  ranges: [Interval<number>, Interval<number>]
  brushes?: [Interval<number>, Interval<number>]
}

type ViewQuery = ViewQuery1D | ViewQuery2D;
