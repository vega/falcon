import {} from 'mocha';
const expect = require('expect.js');

import {new1DIterator, new2DIterator} from '../server/session';

describe('Session', function() {
  describe('Iterator', function() {
    it('should iterate over 1D space', function() {
      const iter = new1DIterator([20.1, 9.2], 2, [8, 30]);
      const indexes = [0,0,0,0,0,0,0,0,0,0,0,0,0,0].map(() => iter());
      expect(indexes).to.eql([20, 18, 10, 8, 22, 12, 24, 14, 26, 16, 28, 30, null, null]);
    });

    it('should iterate over 2D space', function() {
      const iter = new2DIterator([[0, 0], [8, 6]], [2, 3], [[-2, 6], [-6, 9]]);
      const indexes = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0].map(() => iter());
      expect(indexes).to.eql([[0, 0], [-2, 0], [0, -3], [-2, -3], [6, 6], [6, 3], [2, 3], [2, -6], [4, 9], [4, 0], [4, 6], [2, -3], [6, 9], [0, -6], null, null]);
    });
  });
});
