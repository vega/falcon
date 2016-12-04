import { Backend, Predicate } from './backend';
import * as PriorityQueue from 'js-priority-queue';
import {scaleLinear} from 'd3-scale';
import {range} from 'd3-array';

import * as config from '../config';

interface QueueElement {
  index: number;
  value: number;
  dimension: Dimension;
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
    return this.dimensions.find(d => d.name === this.activeDimension) || this.dimensions[0];
  }

  private getStaticDimensions() {
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
    this.queue = new PriorityQueue<QueueElement>({
       // Random sampling at the beginning
       // TODO: update this to favor evenly distributed values.
      initialValues: range(staticDimensions.length * this.scales[ad.name].domain()[1]).map((i) => {
        const index = Math.floor(i / staticDimensions.length);
        return {
          index: index,
          value: Math.random(),
          dimension: staticDimensions[i % staticDimensions.length]
        };
      }),
      comparator: (a: QueueElement, b: QueueElement) => {
        return a.value - b.value;
      }
    });
  }

  public onQuery(cb: (activeDimension: string, dimension: string, results: any, value: number) => any) {
    this._onQuery = cb;
  }

  public preload(dimension: string, value: number, velocity: number) {
    this.hasUserInteracted = true;
    this.setActiveDimension(dimension);
    const staticDimensions = this.getStaticDimensions();
    const ad = this.getActiveDimension();
    this.queue = new PriorityQueue<QueueElement>({
      initialValues: range(staticDimensions.length * this.scales[ad.name].domain()[1]).map((i) => {
        const index = Math.floor(i / staticDimensions.length);
        return {
          index: index,
          value: Math.abs(index - value),
          dimension: staticDimensions[i % staticDimensions.length]
        };
      }),
      comparator: (a: QueueElement, b: QueueElement) => {
        return a.value - b.value;
      }
    });
  }

  public setRange(dimension: string, range: Interval) {
    this.hasUserInteracted = true;
    this.setActiveDimension(dimension);
    const ad = this.getActiveDimension();
    ad.currentRange = range;
  }

  // Load a particular value immediately.
  // Should this just immediately place the item at
  // the front of the queue?
  public load(dimension: string, value: number) {
    this.hasUserInteracted = true;
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
      let next = this.queue.dequeue();
      if (this.cache[next.index] && this.cache[next.index][next.dimension.name]) {
        continue;
      }
      cacheMiss = true;
      this.queryCount++;
      this.backend
        .query(next.dimension.name, this.getPredicates(next.index, next.dimension))
        .then(this.handleQuery(activeDimension, next.dimension, next.index));
    } while (!cacheMiss && this.queue.length);
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
      this._onQuery && this._onQuery(activeDimension.name, staticDimension.name, results, index);
    };
  }

  public close() {
    this.closed = true;
  }
}


export default Session;
