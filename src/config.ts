export const DEFAULT_CONFIG = {
  // features
  readyindicator: true,
  chartCount: false,
  zoomBrush: true,
  showBase: true,
  zeroDBar: true,
  showInterestingness: false,
  progressiveInteractions: true,
  maxInteractiveResolution1D: Infinity,
  maxInteractiveResolution2D: 80
};

export type Config = typeof DEFAULT_CONFIG;
