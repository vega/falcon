/// <reference path='../../interfaces.d.ts' />

import * as d3 from 'd3';
import * as _ from 'underscore';

const padding = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0
};

const binPadding = 1;

class BrushableBar {

  callbacks: any = {};
  x: any;
  y: any;
  brush: any;
  $content: any;
  bins: any;
  domain: any;

  constructor(selector: string, data, options = { width: 600, height: 400 }) {
    const {
      width,
      height
    } = options;

    const contentHeight = options.height - padding.bottom - padding.top;
    const contentWidth = options.width - padding.left - padding.right;

    this.domain = data.domain;

    this.x = d3.scale.linear().domain(data.domain).range([0, contentWidth]);
    this.brush = d3.svg.brush().x(this.x).on('brushend', this.brushed.bind(this));

    const $container = d3.select(selector);
    const $svg = $container.append('svg').attr('width', width).attr('height', height);

    this.$content = $svg.append('g').attr('transform', `translate(${padding.top}, ${padding.left})`);
    this.y = d3.scale.linear().domain([0, d3.max(data.values, (d: any) => { return d.count; })]).range([contentHeight, 0]);

    this.update(data);

    this.$content.append('g')
        .attr('class', 'x brush')
        .call(this.brush)
      .selectAll('rect')
        .attr('y', -6)
        .attr('height', contentHeight + 7);

    return this;
  }

  public update(data: any) {
    const $bars = this.$content.selectAll('.bar').data(data.values);
    $bars
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('fill', 'steelblue')
      .attr('y', this.y(0))
      .attr('height', 0);

    $bars
      .attr('x', (d, i: number) => {
        return this.x(d.bucket);
      })
      .attr('y', (d, i: number) => {
        return this.y(d.count);
      })
      .attr('width', (d, i: number) => {
        return this.x(data.values[1].bucket) - this.x(data.values[0].bucket) - 2 * binPadding;
      })
      .attr('height', (d) => {
        return this.y(0) - this.y(d.count);
      });

    return this;
  }

  public on(eventName: string, callback: any) {
    this.callbacks[eventName] = _.throttle(callback, 250);
    return this;
  }

  private brushed() {
    let extent = this.brush.extent();
    if (extent[1] === extent[0]) {
      extent = this.domain;
    }
    if (this.callbacks.brushed) {
      this.callbacks.brushed(extent);
    }
  }
}


export default BrushableBar;
