export const DEFAULT_CONFIG = {
  //---------
  // features

  /** Indicator that shows when you can interact with a view. */
  readyIndicator: false,
  /** Show a row counter next to each chart. */
  chartCount: false,
  /** Show the base as a gray background. */
  showBase: true,
  /** Use a bar chart for showing the overall count. */
  zeroD: "hbar" as "vbar" | "hbar" | "text",
  /** Use circles instead of colored rectangles. Supports showing base. */
  circleHeatmap: true,
  /** Show interestingness indicator. */
  showInterestingness: false,
  /** Load high resolution interactions later. */
  progressiveInteractions: false,
  /** Interpolate while we have low resolution data. */
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

  /** For vertical bar chart. */
  barHeight: 300,
  /** For horizontal bar chart. */
  barWidth: 300,
  histogramWidth: 600,
  heatmapWidth: 400,
  maxCircleSize: 700
};

export type Config = typeof DEFAULT_CONFIG;
