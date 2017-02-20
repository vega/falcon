import * as config from '../config';

if (config.debugging.debugClient) {
  require('./debug-client');
} else if (config.optimizations.naiveBaseline) {
  require('./naive-client');
} else {
  require('./client');
}
