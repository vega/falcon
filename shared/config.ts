export const port = 4080;

export const views: View[] = [{
  bins: 25,
  dimension: 'ARR_DELAY',
  name: 'ARR_DELAY',
  range: [-10, 100],
  title: 'Arrival Delay',
  type: '1D',
}, {
  bins: 25,
  dimension: 'DISTANCE',
  name: 'DISTANCE',
  range: [50, 2000],
  title: 'Distance',
  type: '1D',
}, {
  bins: 25,
  dimension: 'DEP_DELAY',
  name: 'DEP_DELAY',
  range: [-10, 100],
  title: 'Departure Delay',
  type: '1D',
}, {
  bins: [30, 25],
  dimensions: ['DEP_DELAY', 'ARR_DELAY'],
  name: 'DEP_DELAY_ARR_DELAY',
  ranges: [[-10, 100], [-10, 100]],
  title: 'Delay Matrix',
  type: '2D',
}];

/**
 * Dimensions indexed for easier access.
 */
export const viewIndex = (() => {
  const idx: {[dimension: string]: View} = {};
  views.forEach(d => {
    idx[d.name] = d;
  });
  return idx;
})();

export const optimizations = {
  /**
   * Naive Baseline. Enable this to remove all
   * optimizations, used for testing the baseline.
   * If you turn this on, all the other optimization
   * flags are ignored.
   */
  naiveBaseline: false,
  /**
   * Load data on init.
   */
  loadOnInit: true,
  /**
   * Preload data.
   */
  preload: true,
  /**
   * Snap to the closest cache.
   */
  snapping: true,
  /**
   * How many subdivisions to create when determining the preloading resolution.
   * The session will preload at 2^n pixels resolution and subdivide this range repeatedly until the resolution is 1px.
   */
  preloadSubdivisions: 6,
  /**
   * Highest resolution.
   */
  maxResolution: 1,
  /**
   * Send results that are cached.
   */
  sendCached: false,
  /**
   * Default query and network roundtrip time in ms.
   */
  defaultRoundtripTime: 20,
};

export const debugging = {
  /**
   * Log API calls in the client.
   */
  logApi: false,

  /**
   * Show visualization of the cache state.
   */
  visualizeCache: true,

  /**
   * Show execution time of critical functions.
   */
  logPerformace: false,
};
