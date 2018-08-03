export const DEFAULT_CONFIG = {
  //---------
  // features

  /** Indicator that shows when you can interact with a view. */
  readyIndicator: false,
  /** Show a row counter next to each chart. */
  chartCount: false,
  /** Show the base as a gray background. */
  showBase: true,
  /** Use a bar chart for showing teh overall count. */
  zeroDBar: true,
  /** Use circles instead of colored rectangles. Supports showing base. */
  circleHeatmap: true,
  showInterestingness: false,
  /** Load high resolution interactions later. */
  progressiveInteractions: true,
  interpolate: false,
  /** Zoom in 1D charts. */
  zoom: true,

  //--------------
  // configuration

  maxInteractiveResolution1D: Infinity,
  maxInteractiveResolution2D: 80,
  /**
   * How long to wait before requesting high resolution data.
   * There is no delay for asynchronous databases when the dimension is activated.
   */
  progressiveTimeout: 2000,

  histogramWidth: 600,
  heatmapWidth: 450,
  maxCircleSize: 800
};

export type Config = typeof DEFAULT_CONFIG;
