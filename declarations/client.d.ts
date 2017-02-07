

interface CacheIndexQuery {
  /** The resolution for which to get data */
  resolution: number,
  /** The range to grab data for. If this overlaps
   * multiple data chunks the cache will automatically combine 
   * the data
   */
  ranges: [Interval] | [Interval, Interval],
  /** The indices of the active dimension */
  indices: [number] | [number, number],
  /** The brushes set on inactive dimensions */
  brushes: {[dimension: string]: Interval}
}


interface CacheRangeQuery {
  /** The resolution for which to get data */
  resolution: number,
  /** The range to grab data for. If this overlaps
   * multiple data chunks the cache will automatically combine 
   * the data
   */
  ranges: [Interval] | [Interval, Interval],
  /** The indices of the current range for the active dimension */
  activeRangeIndices: [Interval] | [Interval, Interval],
  /** The brushes set on inactive dimensions */
  brushes: {[dimension: string]: Interval}
}

