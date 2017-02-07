
import { createKdTree } from 'kd.tree';

interface TreeNodeQuery {
  indices: [number] | [number, number];
  brushes: { [dimension: string]: Interval<number> };
}

const distanceGenerator = (n) => {
  return (a, b) => {
    let d = 0;
    for (let i = 0; i < n; i++) {
      d += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(d);
  };
};

class TreeNode {
  public children: TreeNode[];
  private rangeIndex: any;

  constructor(private numDimensions: number, private indexLength: [number] | [number, number], private inactiveDimensions: string[]) {
    const childrenLength: number = Math.pow(2, numDimensions);
    this.children = Array(childrenLength);
    this.rangeIndex = {};
  }

  private getIndex(query: TreeNodeQuery) {
    const indexKeys = this.inactiveDimensions.map((d) => {
      // TODO - We should snap these values to something.
      const brushes = query.brushes[d];
      if (brushes) {
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
      const searchTree = createKdTree([], distanceGenerator(this.numDimensions) , query.indices.map((_, i) => i));
      index.searchTree = searchTree;
    }

    if (!index.dataIndex) {
      index.dataIndex = {};
    }

    if (this.numDimensions === 1) {
      index.dataIndex[query.indices[0]] = data;
    } else {
      if (!index.dataIndex[query.indices[0]]) {
        index.dataIndex[query.indices[0]] = {};
      }
      index.dataIndex[query.indices[0]][query.indices[1]] = data;
    }

    // Insert the value into the KD-tree
    const formattedPoint = {};
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

    const formattedPoint = {};
    query.indices.forEach((d, i) => {
      formattedPoint[i] = d;
    });
    let point = index.searchTree.nearest(formattedPoint, 1);
    if (!point.length || !point[0].length) {
      return null;
    }

    point = point[0][0];
    let currentDataIndex = index.dataIndex;
    for (let i = 0; i < this.numDimensions; i++) {
      currentDataIndex = currentDataIndex[point[i]];
    }
    return currentDataIndex;
  }

  public getChild(index: number): TreeNode {
    if (this.children[index]) {
      return this.children[index];
    }

    this.children[index] = new TreeNode(this.numDimensions, this.indexLength, this.inactiveDimensions);
    return this.children[index];
  }
};

class ZoomTree {

  private root: TreeNode;

  constructor(public numDimensions: number, public indexLength: [number] | [number, number], public ranges: [Interval<number>] | [Interval<number>, Interval<number>], private inactiveDimensions: string[]) {
    this.root = new TreeNode(this.numDimensions, this.indexLength, this.inactiveDimensions);
  }

  public set(query: CacheIndexQuery, data: number[] | number[][]): void {
    let currentResolution = 0;
    let currentNode = this.root;
    const resolution = query.resolution;

    // Calculate the bin # of the start and end of the
    // query dataRange
    const numBins = Math.pow(2, query.resolution);

    const lowerBins = query.ranges.map((range, i) => Math.floor(range[0] - this.ranges[i][0] / (this.ranges[i][1] - this.ranges[i][0]) / numBins));
    const upperBins = query.ranges.map((range, i) => Math.floor(range[1] - this.ranges[i][0] / (this.ranges[i][1] - this.ranges[i][0]) / numBins));

    lowerBins.forEach((lowerBin, i) => {
      const upperBin = upperBins[i];
      if (lowerBin !== upperBin && query.ranges[i][1] !== query.ranges[i][0] + (this.ranges[i][1] - this.ranges[i][0]) / numBins) {
        throw new Error('Invalid range. Both ends of the provided range must fall in the same node on the tree');
      }
    });

    const bins = lowerBins;

    while (currentResolution < resolution) {

      if (this.numDimensions === 1) {
        const bin = bins[0];
        const offset = Math.pow(2, resolution - currentResolution - 1);
        if (bin < offset) {
          currentNode = currentNode.getChild(0);
        } else {
          currentNode = currentNode.getChild(1);
          bins[0] = bins[0] - offset;
        }
      } else if (this.numDimensions === 2) {
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

    const lowerBins = query.ranges.map((range, i) => Math.floor(range[0] - this.ranges[i][0] / (this.ranges[i][1] - this.ranges[i][0]) / numBins));
    const upperBins = query.ranges.map((range, i) => Math.floor(range[1] - this.ranges[i][0] / (this.ranges[i][1] - this.ranges[i][0]) / numBins));

    lowerBins.forEach((lowerBin, i) => {
      const upperBin = upperBins[i];
      if (lowerBin !== upperBin && query.ranges[i][1] !== query.ranges[i][0] + (this.ranges[i][1] - this.ranges[i][0]) / numBins) {
        throw new Error('Invalid range. Both ends of the provided range must fall in the same node on the tree');
      }
    });

    const bins = lowerBins;
    let data = [];

    const mergeData = (currentData, newData) => {
      // TODO - Fill this in. With this functionality
      //        incomplete we will just return the
      //        closest data at the proper resolution
      //        and won't use the results from the
      //        coarser zoom levels.
      return newData;
    };

    while (currentResolution < resolution) {

      if (this.numDimensions === 1) {
        const bin = bins[0];
        const offset = Math.pow(2, resolution - currentResolution - 1);
        if (bin < offset) {
          currentNode = currentNode.getChild(0);
        } else {
          currentNode = currentNode.getChild(1);
          bins[0] = bins[0] - offset;
        }
      } else if (this.numDimensions === 2) {
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

  public get(query: CacheRangeQuery)  {
    /**
     * TODO - For now this just handles exact ranges
     *        e.g. if our data range is 0-100, ranges
     *        in the form 0-100, 50-100, 25-50, etc.
     *        It probably makes sense to make this function
     *        smart enough to combine the ranges itself
     */
    if (this.numDimensions === 1) {
      const indexQueryA = Object.assign({}, query, {
        indices: [query.activeRangeIndices[0][0]] as [number]
      }) as CacheIndexQuery;
      const indexQueryB = Object.assign({}, query, {
        indices: [query.activeRangeIndices[0][1]] as [number]
      }) as CacheIndexQuery;

      const a = this.getAtIndices(indexQueryA) as number[];
      const b = this.getAtIndices(indexQueryB) as number[];

      if (a === null || b === null) {
        return null;
      }

      return b.map((d, i) => d - a[i]);
    } else if (this.numDimensions === 2) {
      // throw new Error('Not implimented for 2 dimensions.');
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


      const a = this.getAtIndices(indexQueryA) as number[][];
      const b = this.getAtIndices(indexQueryB) as number[][];
      const c = this.getAtIndices(indexQueryC) as number[][];
      const d = this.getAtIndices(indexQueryD) as number[][];

      if (a === null || b === null || c === null || d === null) {
        return null;
      }

      // Return
      // D - C - B + A
      return d.map((arr, i) => arr.map((datum, j) => datum - b[i][j] - c[i][j] + a[i][j]));

    } else {
      throw new Error('Not implimented for more than 2 dimensions.');
    }
  }
}

export { ZoomTree, TreeNode };
