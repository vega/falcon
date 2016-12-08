import { Backend, Predicate } from './backend';
import * as PriorityQueue from 'js-priority-queue';
import {scaleLinear} from 'd3-scale';
import {range} from 'd3-array';

import * as config from '../config';

interface QueueElement {
  index: number;
  value: number;
};

// This is responsible for keeping the priority queue,
// rate limiting requests, and watching the cache.
class Session {

  private activeDimension: string;
  private queue: PriorityQueue<QueueElement>;
  private cache: any = [];
  private queryCount: number = 0;
  private scales: any = {};
  private closed: boolean = false;
  private hasUserInteracted: boolean = false;
  private _onQuery: (activeDimension: string, dimension: string, results: any, value: number) => any;

  constructor(public backend: Backend, public dimensions: Dimension[]) {
    this.activeDimension = dimensions[0].name;
  }

  private getPredicates(index: number, dimension: Dimension) {
    const predicates: Predicate[] = [];
    const activeDimension = this.getActiveDimension();
    if (dimension.name !== activeDimension.name) {
      predicates.push({
        name: dimension.name,
        lower: dimension.range[0],
        upper: dimension.range[1]
      });
    }
    predicates.push({
      name: activeDimension.name,
      upper: this.scales[activeDimension.name](index)
    });

    this.dimensions.forEach((dim) => {
      if (dim.name !== dimension.name && dim.name !== activeDimension.name) {
        predicates.push({
          name: dim.name,
          lower: (dim.currentRange || dim.range)[0],
          upper: (dim.currentRange || dim.range)[1]
        });
      }
    });

    return predicates;
  }

  private getActiveDimension() {
    return this.dimensions.find(d => d.name === this.activeDimension);
  }

  private getStaticDimensions() {
    if (!this.hasUserInteracted) {
      return this.dimensions;
    }
    return this.dimensions.filter(dimension => dimension.name !== this.activeDimension);
  }

  // Return the initial queries back to the client
  // This should take in Dimension resolution as well.
  public init(resolutions: { dimension: string, value: number }[]) {
    const ad = this.getActiveDimension();

    resolutions.forEach((resolution) => {
      const dimension = this.dimensions.find(d => d.name === resolution.dimension);
      if (dimension) {
        this.scales[resolution.dimension] = scaleLinear().domain([0, resolution.value]).range(dimension.range);
      }
    });

    this.dimensions.forEach((dimension) => {
      dimension.currentRange = dimension.range;
      this.queryCount++;

      const index0 = this.scales[ad.name].domain()[0];
      this.backend
        .query(dimension.name, this.getPredicates(index0, dimension))
        .then(this.handleQuery(ad, dimension, index0));

      const index1 = this.scales[ad.name].domain()[1];
      this.backend
        .query(dimension.name, this.getPredicates(index1, dimension))
        .then(this.handleQuery(ad, dimension, index1));
    });

    const staticDimensions = this.getStaticDimensions();
    const indexLength = this.scales[ad.name].domain()[1];

    // Subdivide the range so we get an optimal distribution
    // of preloaded values
    const subdivisionLevels = 6;
    let subdividedValues = [];
    let subdividedIndices = [];
    for (var i = 1; i < subdivisionLevels; i++) {
      for (var j = 1; j < Math.pow(2, i); j++) {
        const index = Math.round(j * indexLength / Math.pow(2, i));
        subdividedValues.push({
          index: index,
          value: i / 2
        });
        subdividedIndices.push(index);
      }
    }

    const initialValues = range(indexLength).filter((d) => subdividedIndices.indexOf(d) === -1).map((index) => {
      return {
        index: index,
        value: subdivisionLevels + index % config.optimizations.preloadResolution(indexLength)
      };
    }).concat(subdividedValues);

    this.queue = new PriorityQueue<QueueElement>({
      initialValues: initialValues,
      comparator: (a: QueueElement, b: QueueElement) => {
        return a.value - b.value;
      }
    });
  }

  public onQuery(cb: (activeDimension: string, dimension: string, results: any, value: number) => any) {
    this._onQuery = cb;
  }

  public preload(dimension: string, value: number | number[], velocity: number) {

    this.setActiveDimension(dimension);
    const staticDimensions = this.getStaticDimensions();
    const ad = this.getActiveDimension();
    const indexLength = this.scales[ad.name].domain()[1];


    // Velocity is measured in pixels per millisecond
    // so we need to amplify the value a little bit.
    const amplification = 300;
    const velocityOffset = velocity * amplification;
    this.queue = new PriorityQueue<QueueElement>({
      initialValues: range(indexLength).map((index) => {
        const offsetIndex = Math.max(0, Math.min(indexLength - 1, index + Math.floor(velocityOffset)));
        if (Array.isArray(value)) {
          const v = Math.min.apply(null, value.map((d) => Math.abs(index - d)));
          return {
            index: offsetIndex,
            value: v + index % config.optimizations.preloadResolution(indexLength) * indexLength
          };
        }
        return {
          index: offsetIndex,
          value: Math.abs(index - value) + index % config.optimizations.preloadResolution(indexLength) * indexLength / 4
        };
      }).concat(range(Math.abs(velocityOffset)).map((index) => {
        if (velocityOffset > 0) {
          return {
            index: index,
            value: indexLength * indexLength
          }
        } else {
          return {
            index: indexLength - index - 1,
            value: indexLength * indexLength
          }
        }
      })),
      comparator: (a: QueueElement, b: QueueElement) => {
        return a.value - b.value;
      }
    });
    this.hasUserInteracted = true;
  }

  public setRange(dimension: string, range: Interval) {
    this.setActiveDimension(dimension);
    const ad = this.getActiveDimension();
    ad.currentRange = range;
    this.hasUserInteracted = true;
  }

  // Load a particular value immediately.
  // Should this just immediately place the item at
  // the front of the queue?
  public load(dimension: string, value: number) {
    this.setActiveDimension(dimension);

    const activeDimension = this.getActiveDimension();
    this.getStaticDimensions().forEach((staticDimension) => {
      // Check if it is already loaded
      if (this.cache[value] && this.cache[value][staticDimension.name]) {
        return;
      }

      this.queryCount++;
      this.backend
        .query(staticDimension.name, this.getPredicates(value, staticDimension))
        .then(this.handleQuery(activeDimension, staticDimension, value));
    });
    this.hasUserInteracted = true;
  }

  private setActiveDimension(dimension: string) {
    if (dimension !== this.activeDimension) {
      // Clear the cache:
      this.cache = [];
    }
    this.activeDimension = dimension;
  }

  private nextQuery() {
    if (!this.queue.length || this.closed) {
      return;
    }

    const activeDimension = this.getActiveDimension();

    // Peek at the first one. If it is a cache-miss in any dimension
    // procede with the query and dequeue. If not dequeue and repeat.
    let cacheMiss = false;
    do {
      let next = this.queue.peek();
      this.getStaticDimensions().forEach((staticDimension) => {
        // Check if it is already loaded
        if (this.cache[next.index] && this.cache[next.index][staticDimension.name]) {
          return;
        }

        cacheMiss = true;
        this.queryCount++;
        this.backend
          .query(staticDimension.name, this.getPredicates(next.index, staticDimension))
          .then(this.handleQuery(activeDimension, staticDimension, next.index));
      });

      this.queue.dequeue();
    } while (!cacheMiss && this.queue.length && !this.closed);
  }

  private handleQuery(activeDimension: Dimension, staticDimension: Dimension, index: number) {
    return (results) => {
      if (this.closed) {
        return;
      }

      if (!this.cache[index]) {
        this.cache[index] = {};
      }

      this.queryCount--;
      if ((config.optimizations.startOnPageload || this.hasUserInteracted) && config.optimizations.preload && this.queryCount < config.database.max_connections - (this.dimensions.length - 1)) {
        this.nextQuery();
      }

      this.cache[index][staticDimension.name] = results;
      if (this._onQuery) {
        this._onQuery(activeDimension.name, staticDimension.name, results, index);
      }
    };
  }

  public close() {
    this.closed = true;
  }
}


export default Session;
