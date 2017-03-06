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

const getResolution = (range: [number, number], totalRange: [number, number]) => {
  const a = range[1] - range[0];
  const b = totalRange[1] - totalRange[0];
  return Math.round(b / a) - 1;
};

/**
 * Helpers for the TreeNode class
 */
interface TreeNodeQuery {
  indices: [number] | [number, number];
  brushes: { [dimension: string]: Interval<number> };
}

interface CacheResults {
  data: number[] | number[][] | null,
  distance: number
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

  public get(query: TreeNodeQuery): CacheResults {
    const index = this.getIndex(query);

    if (!index.searchTree) {
      return { data: null, distance: Number.POSITIVE_INFINITY };
    }

    const formattedPoint: {[key: string]: number} = {};
    query.indices.forEach((d, i) => {
      formattedPoint[i] = d;
    });
    let point = index.searchTree.nearest(formattedPoint, 1);
    if (!point.length || !point[0].length) {
      return { data: null, distance: Number.POSITIVE_INFINITY };
    }

    point = point[0][0];
    let currentDataIndex = index.dataIndex;
    let distance = 0;
    for (let i = 0; i < this.activeDimensions; i++) {
      distance += Math.pow(point[i] - query.indices[i], 2);
      currentDataIndex = currentDataIndex[point[i]];
    }
    return { data: currentDataIndex, distance: Math.sqrt(distance) };
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

  public set(query: CacheIndexSet, data: number[] | number[][]): void {
    let currentResolution = 0;
    let currentNode = this.root;

    const resolution = query.ranges.length ? getResolution(query.ranges[0], this.ranges[0]) : 0;
    const numBins = Math.pow(2, resolution);
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

  private getAtIndices(query: CacheIndexQuery): CacheResults {
    let currentResolution = 0;
    let currentNode = this.root;
    let resolution = query.resolution;

    // Calculate the bin # of the start and end of the
    // query dataRange
    const numBins = Math.pow(2, query.resolution);
    const bins = query.ranges.map((range, i) => getIndexOfValue(numBins, range[0], this.ranges[i]));
    let data: CacheResults = { data: null, distance: Number.POSITIVE_INFINITY };

    const mergeData = (currentResults: CacheResults, newResults: CacheResults, index: number): CacheResults => {
      if (!currentResults.data) {
        return newResults;
      }

      if (newResults.data && newResults.distance < currentResults.distance) {
        return newResults;
      }
      console.log('MERGING!!!');

      if (this.dataDimensions === 1) {
        const mergedResults: number[] = [];
        const len = currentResults.data.length;
        let half = Math.ceil(currentResults.data.length / 2);
        switch (index) {
          case 0:
            (currentResults.data as number[]).slice(0, half).forEach((d, i) => {
              mergedResults.push(d);
              if (len % 2 === 0 || i !== half - 1) {
                mergedResults.push(d);
              }
            });
            break;
          case 1:
            if (len % 2 !== 0) {
              half -= 1;
            }
            (currentResults.data as number[]).slice(half).forEach((d, i) => {
              if (len % 2 === 0 || i !== 0) {
                mergedResults.push(d);
              }
              mergedResults.push(d);
            });
            break;
        }
        console.log(mergedResults);
        return { data: mergedResults, distance: currentResults.distance };
      } else {
        return currentResults;
      }
    };

    let childIndex = 0;
    while (currentResolution < resolution) {

      if (this.dataDimensions === 1) {
        const bin = bins[0];
        const offset = Math.pow(2, resolution - currentResolution - 1);
        if (bin < offset) {
          childIndex = 0;
        } else {
          childIndex = 1;
          bins[0] = bins[0] - offset;
        }
      } else if (this.dataDimensions === 2) {
        const xBin = bins[0];
        const yBin = bins[1];
        const offset = Math.pow(2, resolution - currentResolution - 1);
        if (xBin < offset) {
          if (yBin < offset) {
            childIndex = 0;
          } else {
            childIndex = 2;
            bins[1] = bins[1] - offset;
          }
        } else {
          if (yBin < offset) {
            childIndex = 1;
          } else {
            childIndex = 3;
            bins[1] = bins[1] - offset;
          }
          bins[0] = bins[0] - offset;
        }

      } else {
        throw new Error('Not implimented for more than 2 dimensions.');
      }

      currentNode = currentNode.getChild(childIndex);
      data = mergeData(data, currentNode.get(query as TreeNodeQuery), childIndex);
      currentResolution++;
    }

    return mergeData(data, currentNode.get(query as TreeNodeQuery), childIndex);;
  }

  private getSingleRange(query: CacheRangeQuery): CacheResults {
    if (this.activeDimensions === 1) {
      const indexQueryA = Object.assign({}, query, {
        indices: [query.activeRangeIndices[0][0]] as [number]
      }) as CacheIndexQuery;
      const indexQueryB = Object.assign({}, query, {
        indices: [query.activeRangeIndices[0][1]] as [number]
      }) as CacheIndexQuery;

      const a = this.getAtIndices(indexQueryA);
      const b = this.getAtIndices(indexQueryB);

      if (a.data === null || b.data === null) {
        return { data: null, distance: Number.POSITIVE_INFINITY };
      }

      if (this.dataDimensions === 1) {
        return { data: (b.data as number[]).map((d, i) => d - (a.data as number[])[i]), distance: 1 };
      } else {
        return { data: (b.data as number[][]).map((d, i) => { return d.map((e, j) => { return e - (a.data as number[][])[i][j]; }) }), distance: 1 };
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

      if (a.data === null || b.data === null || c.data === null || d.data === null) {
        return { data: null, distance: Number.POSITIVE_INFINITY };
      }

      // Return
      // D - C - B + A
      if (this.dataDimensions === 1) {
        return { data: (d.data as number[]).map((datum, i) => datum - (c.data as number[])[i] - (b.data as number[])[i] + (a.data as number[])[i]), distance: 1 };
      } else {
        return { data: (d.data as number[][]).map((arr, i) => arr.map((datum, j) => datum - (b.data as number[][])[i][j] - (c.data as number[][])[i][j] + (a.data as number[][])[i][j])), distance: 1 };
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

    return results.reduce((acc: CacheResults, val, index) => {
      const currentData = acc.data as any[];
      const newData = val.data as any[];
      return {
        data: currentData.concat(newData),
        distance: acc.distance + val.distance
      };
    }, { data: [], distance: 0});
  }
}

export { ZoomTree, TreeNode };
