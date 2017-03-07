import {} from 'mocha';
import {assert, expect} from 'chai';

import { getKeys, new1DIterator, new2DIterator } from '../server/session';

describe('Session', function() {
  describe('Iterator', function() {
    it('should iterate over 1D space', function() {
      const iter = new1DIterator([3, 10], 2, 1, 20);
      const collector = [];

      let n = iter.next();
      while(!n.done) {
        collector.push(n.value);
        n = iter.next();
      }

      // console.log(collector);

      expect(collector).to.have.members([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    });

    it('should iterate over 2D space', function() {
      const iter = new2DIterator([[2, 5], [10, 10]], 2, 1, [20, 17]);

      const collector = [];

      let n = iter.next();
      while(!n.done) {
        collector.push(n.value);
        n = iter.next();
      }

      // console.log(collector);

      // initial seeds continue
      assert.includeDeepMembers(collector, [[2, 5], [6, 5], [10, 5], [14, 5], [20, 5]]);

      // spawns left
      assert.includeDeepMembers(collector, [[2, 9], [6, 9], [10, 9], [14, 9], [20, 9]]);

      // spawns continue
      assert.includeDeepMembers(collector, [[2, 9], [2, 13], [2, 17]]);

      // resolution increases
      assert.includeDeepMembers(collector, [[2, 5], [3, 5], [4, 5], [5, 5]]);
    });
  });

  describe('Cache', function() {
    it('should create correct keys', function() {
      const keys = getKeys({
        activeViewName: 'active',
        index: 0.5,
        cacheKeys: {},
        views: [{
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
        foo: 'foo active 0,10 bar:2,4 baz:2,4,10,20',
        bar: 'bar active -10,20 baz:2,4,10,20',
        baz: 'baz active 0,10,0,100 bar:2,4'
      });
    });
  });
});
