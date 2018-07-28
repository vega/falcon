export const DEFAULT_CONFIG = {
  //---------
  // features

  readyindicator: true,
  chartCount: false,
  zoomBrush: true,
  showBase: true,
  zeroDBar: true,
  showInterestingness: false,
  /** Load high resolution interactions later. */
  progressiveInteractions: true,

  //--------------
  // configuration

  maxInteractiveResolution1D: Infinity,
  maxInteractiveResolution2D: 80,
  /**
   * How long to wait before requesting high resolution data.
   * Only applies to blocking databases.
   */
  progressiveTimeout: 10000
};

export type Config = typeof DEFAULT_CONFIG;
