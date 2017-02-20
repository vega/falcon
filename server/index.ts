import * as config from '../config';

if (!config.debugging.debugClient && config.optimizations.naiveBaseline) {
  require('./naive-server');
} else {
  require('./server');
}
