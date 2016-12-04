export const port = 4080;

export const database = {
  client: 'postgres',
  table: 'flights',
  max_connections: 4,
  connection: {
    database: 'postgres',
    host: 'localhost',
    port: 5432
  }
};

export const dimensions: Dimension[] = [{
  name: 'ARR_DELAY',
  title: 'Arrival Delay',
  range: [0, 100],
  bins: 25
}, {
  name: 'DISTANCE',
  title: 'Distance',
  range: [50, 2000],
  bins: 25
}, {
  name: 'DEP_DELAY',
  title: 'Departure Delay',
  range: [0, 100],
  bins: 25
}];

export const optimizations = {
  /**
   * Start preloading when the page is first loaded.
   */
  startOnPageload: true,
  /**
   * Preload on hover.
   */
  preload: true,
  /**
   * Enable compression for the websocket connection.
   */
  compression: true,
  /**
   * Snap to the closest cache.
   */
  snapping: true
};

export const debugging = {
  /**
   * Log api calls in the client.
   */
  logApi: true,
};
