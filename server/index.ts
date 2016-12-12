
import * as config from '../config';

if (config.optimizations.naiveBaseline) {
  require('./naive-server');
} else {
  require('server');
}
