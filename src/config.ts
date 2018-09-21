import { Renderers } from "vega";

export const DEFAULT_CONFIG = {
  //---------
  // features

  /** Show the base as a gray background. */
  showBase: true,
  /** Use a bar chart for showing the overall count. */
  zeroD: "hbar" as "vbar" | "hbar" | "text",
  /** Use circles instead of colored rectangles. Supports showing base. */
  circleHeatmap: true,
  /** Show interestingness indicator. */
  showInterestingness: false,
  /** Load high resolution interactions later. */
  progressiveInteractions: false as boolean | "only2D",
  /** Interpolate while we have low resolution data. */
  interpolate: false,
  /** Zoom in 1D charts. */
  zoom: true,

  //--------------
  // configuration

  /** Renderer for vega charts. */
  renderer: "canvas" as Renderers,

  /** Prefetch on hover or click. */
  prefetchOn: "mouseenter" as "mouseenter" | "mousedown",

  maxInteractiveResolution1D: Infinity,
  maxInteractiveResolution2D: 80,

  /** When the user does not move their mouse for this timeout, we prefetch all views. */
  idleTime: 10e9,

  /** For vertical bar chart. */
  barHeight: 300,
  /** For horizontal bar chart. */
  barWidth: 400,
  histogramWidth: 600,
  histogramHeight: 160,
  heatmapWidth: 400,
  heatmapHeight: null,
  maxCircleSize: 700,
  yAxisExtent: 50,

  //----------
  // debugging

  debugViewInteractions: false
};

export type Config = typeof DEFAULT_CONFIG;
