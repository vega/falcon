import * as config from '../config';

if (config.optimizations.naiveBaseline) {
  require('./naive-client');
} else {
  require('./client');
}
