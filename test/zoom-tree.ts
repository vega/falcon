import {} from 'mocha';
import {expect} from 'chai';
import { ZoomTree } from '../client/cache/zoom-tree';

describe('ZoomTree', function() {

  describe('Simple 1-D tests with resolution 0', function() {
    let tree: ZoomTree;

    before(function() {
      // runs before all tests in this block
      tree = new ZoomTree(1, [100], [[0, 100]], ['dimA']);
    });

    it('should set a value properly', function() {
      tree.set({
        resolution: 0,
        ranges: [[0, 100]],
        indices: [20],
        brushes: {}
      }, [0, 1, 2, 3, 4, 5]);

      tree.set({
        resolution: 0,
        ranges: [[0, 100]],
        indices: [40],
        brushes: {}
      }, [10, 10, 10, 10, 10, 10]);
    });

    it('Should retrieve data where exact data is available', function() {
      const data = tree.get({
        resolution: 0,
        ranges: [[0, 100]],
        activeRangeIndices: [[20, 40]],
        brushes: {}
      });

      expect(data).to.eql([10, 9, 8, 7, 6, 5]);
    });

    it('Should retrieve data where only inexact data is available', function() {
      const data = tree.get({
        resolution: 0,
        ranges: [[0, 100]],
        activeRangeIndices: [[18, 37]],
        brushes: {}
      });

      expect(data).to.eql([10, 9, 8, 7, 6, 5]);
    });

    it('Should return null if there is nothing available for these brushes', function() {
      const data = tree.get({
        resolution: 0,
        ranges: [[0, 100]],
        activeRangeIndices: [[20, 40]],
        brushes: { dimA: [20, 30] }
      });

      expect(data).to.be.null;
    });

  });

  describe('Simple 2 Dimensions test, resolution 0.', function() {
    let tree: ZoomTree;

    before(function() {
      tree = new ZoomTree(2, [100, 100], [[0, 100], [0, 100]], ['dimA']);
    });

    it('should set a value properly', function() {
      tree.set({
        resolution: 0,
        ranges: [[0, 100], [0, 100]],
        indices: [20, 20],
        brushes: {}
      }, [[1, 1, 1, 1, 1, 1]]);

      tree.set({
        resolution: 0,
        ranges: [[0, 100], [0, 100]],
        indices: [20, 40],
        brushes: {}
      }, [[2, 2, 2, 2, 2, 2]]);

      tree.set({
        resolution: 0,
        ranges: [[0, 100], [0, 100]],
        indices: [40, 20],
        brushes: {}
      }, [[2, 2, 2, 2, 2, 2]]);

      tree.set({
        resolution: 0,
        ranges: [[0, 100], [0, 100]],
        indices: [40, 40],
        brushes: {}
      }, [[3, 4, 5, 6, 7, 8]]);
    });

    it('Should retrieve data where exact data is available', function() {
      const data = tree.get({
        resolution: 0,
        ranges: [[0, 100], [0, 100]],
        activeRangeIndices: [[20, 40], [20, 40]],
        brushes: {}
      });

      expect(data).to.eql([[0, 1, 2, 3, 4, 5]]);
    });

    it('Should retrieve data where only inexact data is available', function() {
      const data = tree.get({
        resolution: 0,
        ranges: [[0, 100], [0, 100]],
        activeRangeIndices: [[18, 38], [22, 42]],
        brushes: {}
      });

      expect(data).to.eql([[0, 1, 2, 3, 4, 5]]);
    });

    it('Should return null if there is nothing available for these brushes', function() {
      const data = tree.get({
        resolution: 0,
        ranges: [[0, 100], [0, 100]],
        activeRangeIndices: [[18, 38], [22, 42]],
        brushes: { dimA: [20, 30] }
      });

      expect(data).to.be.null;
    });
  });

  describe('Zoom tests', function() {
    let tree: ZoomTree;

    before(function() {
      // runs before all tests in this block
      tree = new ZoomTree(1, [100], [[0, 100]], ['dimA']);
    });

    it('should set a value properly', function() {
      tree.set({
        resolution: 1,
        ranges: [[0, 50]],
        indices: [20],
        brushes: {}
      }, [1, 1, 1, 1, 1, 1]);

      tree.set({
        resolution: 1,
        ranges: [[0, 50]],
        indices: [40],
        brushes: {}
      }, [0, 1, 2, 3, 4, 5]);

      tree.set({
        resolution: 1,
        ranges: [[50, 100]],
        indices: [20],
        brushes: {}
      }, [0, 0, 0, 0, 0, 0]);

      tree.set({
        resolution: 1,
        ranges: [[50, 100]],
        indices: [40],
        brushes: {}
      }, [10, 10, 10, 10, 10, 10]);
    });

    it('Should retrieve data at the proper range and resolution', function() {
      let data = tree.get({
        resolution: 1,
        ranges: [[0, 50]],
        activeRangeIndices: [[20, 40]],
        brushes: {}
      });

      expect(data).to.eql([-1, 0, 1, 2, 3, 4]);

      data = tree.get({
        resolution: 1,
        ranges: [[50, 100]],
        activeRangeIndices: [[20, 40]],
        brushes: {}
      });

      expect(data).to.eql([10, 10, 10, 10, 10, 10]);
    });
  });

});
