import {} from 'mocha';
const expect = require('expect.js');

import {new1DIterator, new2DIterator, getKeys} from '../server/session';

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

  describe('Cache', function() {
    it('should create correct keys', function() {
      const keys = getKeys({
        activeView: 'active',
        index: 0.5,
        views: [{
          type: '1D',
          query: true,
          name: 'active',
          range: [0, 1]
        }, {
          type: '1D',
          query: true,
          name: 'foo',
          range: [0, 10]
        }, {
          type: '1D',
          query: true,
          name: 'bar',
          range: [-10, 20],
          brush: [2, 4]
        }, {
          type: '2D',
          query: true,
          name: 'baz',
          ranges: [[0, 10], [0, 100]],
          brushes: [[2, 4], [10, 20]]
        }]});

      expect(keys).to.eql({
        foo: 'foo active:0.5 0,10 bar:2,4 baz:2,4,10,20',
        bar: 'bar active:0.5 -10,20 baz:2,4,10,20',
        baz: 'baz active:0.5 0,10,0,100 bar:2,4'
      });
    });
  });
});
