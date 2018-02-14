export const port = 4080;

export const views: View[] = [
  {
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
  },
  // {
  //   bins: [30, 25],
  //   dimensions: ['DEP_DELAY', 'ARR_DELAY'],
  //   name: 'DEP_DELAY_ARR_DELAY',
  //   ranges: [[-10, 100], [-10, 100]],
  //   title: 'Delay Matrix',
  //   type: '2D',
  // },
];

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
   * Highest resolution.
   */
  maxResolution: 1,
};

export const debugging = {
  /**
   * Log API calls.
   */
  logApi: true,

  /**
   * Show visualization of the cache state.
   */
  visualizeCache: true,
};
