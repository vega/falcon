
import { createKdTree } from 'kd.tree';


/**
 * A few useful functions for checking the integrety of ranges
 * passed to the zoom tree, and for combining multiple results
 * correctly
*/
const getIndexOfValue = (bins: number, value: number, range: [number, number]) => {
  return Math.floor((value - range[0]) / ((range[1] - range[0]) / bins));
};

const getSnappedRange = (index: number, bins: number, range: [number, number]) => {
  return [range[0] + index * ((range[1] - range[0]) / bins), range[0] + (index + 1) * ((range[1] - range[0]) / bins)];
};

const isFullRange = (bins: number, range: [number, number], totalRange: [number, number]) => {
  const idxA = getIndexOfValue(bins, range[0], totalRange);
  const idxB = getIndexOfValue(bins, range[1], totalRange);
  if (idxA === idxB - 1) {
    const fullRange = getSnappedRange(idxA, bins, totalRange);
    return range[0] === fullRange[0] && range[1] === fullRange[1];
  }
  return false;
};


/**
 * Helpers for the TreeNode class
 */
interface TreeNodeQuery {
  indices: [number] | [number, number];
  brushes: { [dimension: string]: Interval<number> };
}

const distanceGenerator = (n: number) => {
  return (a: number[], b: number[]) => {
    let d = 0;
    for (let i = 0; i < n; i++) {
      d += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(d);
  };
};

/**
 * This class represents on node on the zoom tree.
 */
class TreeNode {
  public children: TreeNode[];
  private rangeIndex: any;

  constructor(private activeDimensions: 1 | 2, private dataDimensions: 1 | 2, private indexLength: [number] | [number, number], private inactiveDimensions: string[]) {
    const childrenLength: number = Math.pow(2, this.dataDimensions);
    this.children = Array(childrenLength);
    this.rangeIndex = {};
  }

  private getIndex(query: TreeNodeQuery) {
    const indexKeys = this.inactiveDimensions.map((d) => {
      const brushes = query.brushes[d];
      if (brushes && typeof brushes !== 'string') {
        return brushes.join(',');
      }
      return 'nobrush';
    });

    let currentIndex = this.rangeIndex;
    this.inactiveDimensions.forEach((d, i) => {
      if (!currentIndex[indexKeys[i]]) {
        currentIndex[indexKeys[i]] = {};
      }
      currentIndex = currentIndex[indexKeys[i]];
    });
    return currentIndex;
  }

  public set(query: TreeNodeQuery, data: number[] | number[][]): void {
    // Here we can assume that this data is at the
    // proper resolution for this node.
    const index = this.getIndex(query);

    if (!index.searchTree) {
      const searchTree = createKdTree([], distanceGenerator(this.activeDimensions), query.indices.map((_, i) => i));
      index.searchTree = searchTree;
    }

    if (!index.dataIndex) {
      index.dataIndex = {};
    }

    if (this.activeDimensions === 1) {
      index.dataIndex[query.indices[0]] = data;
    } else {
      if (!index.dataIndex[query.indices[0]]) {
        index.dataIndex[query.indices[0]] = {};
      }
      index.dataIndex[query.indices[0]][query.indices[1]] = data;
    }

    // Insert the value into the KD-tree
    const formattedPoint: {[key: string]: number} = {};
    query.indices.forEach((d, i) => {
      formattedPoint[i] = d;
    });

    index.searchTree.insert(formattedPoint);
  }

  public get(query: TreeNodeQuery): number[] | number[][] | null {
    const index = this.getIndex(query);

    if (!index.searchTree) {
      return null;
    }

    const formattedPoint: {[key: string]: number} = {};
    query.indices.forEach((d, i) => {
      formattedPoint[i] = d;
    });
    let point = index.searchTree.nearest(formattedPoint, 1);
    if (!point.length || !point[0].length) {
      return null;
    }

    point = point[0][0];
    let currentDataIndex = index.dataIndex;
    for (let i = 0; i < this.activeDimensions; i++) {
      currentDataIndex = currentDataIndex[point[i]];
    }
    return currentDataIndex;
  }

  public getChild(index: number): TreeNode {
    if (this.children[index]) {
      return this.children[index];
    }

    this.children[index] = new TreeNode(this.activeDimensions, this.dataDimensions, this.indexLength, this.inactiveDimensions);
    return this.children[index];
  }
};


/**
 * Multidimensinal zoom-tree cache class
 */
class ZoomTree {

  private root: TreeNode;

  constructor(public activeDimensions: 1 | 2, public dataDimensions: 1 | 2, public indexLength: [number] | [number, number], public ranges: [Interval<number>] | [Interval<number>, Interval<number>], private inactiveDimensions: string[]) {
    this.root = new TreeNode(this.activeDimensions, this.dataDimensions, this.indexLength, this.inactiveDimensions);
  }

  public set(query: CacheIndexQuery, data: number[] | number[][]): void {
    let currentResolution = 0;
    let currentNode = this.root;
    const resolution = query.resolution;

    // Calculate the bin # of the start and end of the
    // query dataRange
    const numBins = Math.pow(2, query.resolution);
    const lowerBins = query.ranges.map((range, i) => getIndexOfValue(numBins, range[0], this.ranges[i]));
    const upperBins = query.ranges.map((range, i) => getIndexOfValue(numBins, range[1], this.ranges[i]));
    lowerBins.forEach((lowerBin, i) => {
      const upperBin = upperBins[i];
      if (lowerBin !== upperBin && !isFullRange(numBins, query.ranges[i], this.ranges[i])) {
        throw new Error('Invalid range. Both ends of the provided range must fall in the same node on the tree');
      }
    });

    const bins = lowerBins;
    while (currentResolution < resolution) {
      if (this.dataDimensions === 1) {
        const bin = bins[0];
        const offset = Math.pow(2, resolution - currentResolution - 1);
        if (bin < offset) {
          currentNode = currentNode.getChild(0);
        } else {
          currentNode = currentNode.getChild(1);
          bins[0] = bins[0] - offset;
        }
      } else if (this.dataDimensions === 2) {
        const xBin = bins[0];
        const yBin = bins[1];
        const offset = Math.pow(2, resolution - currentResolution - 1);
        if (xBin < offset) {
          if (yBin < offset) {
            currentNode = currentNode.getChild(0);
          } else {
            currentNode = currentNode.getChild(2);
            bins[1] = bins[1] - offset;
          }
        } else {
          if (yBin < offset) {
            currentNode = currentNode.getChild(1);
          } else {
            currentNode = currentNode.getChild(3);
            bins[1] = bins[1] - offset;
          }
          bins[0] = bins[0] - offset;
        }
      } else {
        throw new Error('Not implimented for more than 2 dimensions.');
      }

      currentResolution++;
    }

    return currentNode.set(query, data);
  }

  private getAtIndices(query: CacheIndexQuery): number[] | number[][] {
    let currentResolution = 0;
    let currentNode = this.root;
    const resolution = query.resolution;

    // Calculate the bin # of the start and end of the
    // query dataRange
    const numBins = Math.pow(2, query.resolution);
    const bins = query.ranges.map((range, i) => getIndexOfValue(numBins, range[0], this.ranges[i]));
    let data = [];

    const mergeData = (currentData: any, newData: any) => {
      // TODO - Fill this in. With this functionality
      //        incomplete we will just return the
      //        closest data at the proper resolution
      //        and won't use the results from the
      //        coarser zoom levels.
      return newData;
    };

    while (currentResolution < resolution) {

      if (this.dataDimensions === 1) {
        const bin = bins[0];
        const offset = Math.pow(2, resolution - currentResolution - 1);
        if (bin < offset) {
          currentNode = currentNode.getChild(0);
        } else {
          currentNode = currentNode.getChild(1);
          bins[0] = bins[0] - offset;
        }
      } else if (this.dataDimensions === 2) {
        const xBin = bins[0];
        const yBin = bins[1];
        const offset = Math.pow(2, resolution - currentResolution - 1);
        if (xBin < offset) {
          if (yBin < offset) {
            currentNode = currentNode.getChild(0);
          } else {
            currentNode = currentNode.getChild(2);
            bins[1] = bins[1] - offset;
          }
        } else {
          if (yBin < offset) {
            currentNode = currentNode.getChild(1);
          } else {
            currentNode = currentNode.getChild(3);
            bins[1] = bins[1] - offset;
          }
          bins[0] = bins[0] - offset;
        }

      } else {
        throw new Error('Not implimented for more than 2 dimensions.');
      }

      data = mergeData(data, currentNode.get(query as TreeNodeQuery));
      currentResolution++;
    }

    return mergeData(data, currentNode.get(query as TreeNodeQuery));
  }

  private getSingleRange(query: CacheRangeQuery): {data: any, distance: number} {
    if (this.activeDimensions === 1) {
      const indexQueryA = Object.assign({}, query, {
        indices: [query.activeRangeIndices[0][0]] as [number]
      }) as CacheIndexQuery;
      const indexQueryB = Object.assign({}, query, {
        indices: [query.activeRangeIndices[0][1]] as [number]
      }) as CacheIndexQuery;

      const a = this.getAtIndices(indexQueryA);
      const b = this.getAtIndices(indexQueryB);

      if (a === null || b === null) {
        return { data: null, distance: Number.POSITIVE_INFINITY };
      }

      if (this.dataDimensions === 1) {
        return { data: (b as number[]).map((d, i) => d - (a as number[])[i]), distance: 1 };
      } else {
        return { data: (b as number[][]).map((d, i) => { return d.map((e, j) => { return e - (a as number[][])[i][j]; }) }), distance: 1 };
      }

    } else if (this.activeDimensions === 2) {
      const indexQueryA = Object.assign({}, query, {
        indices: [query.activeRangeIndices[0][0], query.activeRangeIndices[1][0]] as [number, number]
      }) as CacheIndexQuery;
      const indexQueryB = Object.assign({}, query, {
        indices: [query.activeRangeIndices[0][1], query.activeRangeIndices[1][0]] as [number, number]
      }) as CacheIndexQuery;
      const indexQueryC = Object.assign({}, query, {
        indices: [query.activeRangeIndices[0][0], query.activeRangeIndices[1][1]] as [number, number]
      }) as CacheIndexQuery;
      const indexQueryD = Object.assign({}, query, {
        indices: [query.activeRangeIndices[1][1], query.activeRangeIndices[1][1]] as [number, number]
      }) as CacheIndexQuery;


      let a = this.getAtIndices(indexQueryA);
      let b = this.getAtIndices(indexQueryB);
      let c = this.getAtIndices(indexQueryC);
      let d = this.getAtIndices(indexQueryD);

      if (a === null || b === null || c === null || d === null) {
        return { data: null, distance: Number.POSITIVE_INFINITY };
      }

      // Return
      // D - C - B + A
      if (this.dataDimensions === 1) {
        a = a as number[];
        b = b as number[];
        c = c as number[];
        d = d as number[];
        return { data: d.map((datum, i) => datum - (c as number[])[i] - (b as number[])[i] + (a as number[])[i]), distance: 1 };
      } else {
        a = a as number[][];
        b = b as number[][];
        c = c as number[][];
        d = d as number[][];
        return { data: d.map((arr, i) => arr.map((datum, j) => datum - (b as number[][])[i][j] - (c as number[][])[i][j] + (a as number[][])[i][j])), distance: 1 };
      }

    } else {
      throw new Error('Not implimented for more than 2 dimensions.');
    }
  }

  public get(query: CacheRangeQuery): {data: any, distance: number}  {
    const numBins = Math.pow(2, query.resolution);
    const lowerBins = query.ranges.map((range, i) => getIndexOfValue(numBins, range[0], this.ranges[i]));
    const upperBins = query.ranges.map((range, i) => getIndexOfValue(numBins, range[1], this.ranges[i]));
    let multipleRanges = false;
    lowerBins.forEach((lowerBin, i) => {
      const upperBin = upperBins[i];
      if (lowerBin !== upperBin && !isFullRange(numBins, query.ranges[i], this.ranges[i])) {
        multipleRanges = true;
      }
    });

    if (!multipleRanges) {
      return this.getSingleRange(query);
    }

    // TODO - Confirm this works properly for 2D as well.
    const ranges = lowerBins.map((bin, i) => {
      return getSnappedRange(bin, numBins, this.ranges[i]);
    }).concat(upperBins.map((bin, i) => {
      return getSnappedRange(bin, numBins, this.ranges[i])
    }));

    const results = ranges.map((range) => {
      return this.getSingleRange(Object.assign({}, query, {
        ranges: [range]
      }));
    });

    return results.reduce((acc, val, index) => {
      return {
        data: acc.data.concat(val.data),
        distance: acc.distance + val.distance
      };
    }, { data: [], distance: 0});
  }
}

export { ZoomTree, TreeNode };
