/// <reference path='../../interfaces.d.ts' />

import * as d3 from 'd3';

const padding = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0
};

const binPadding = 1;

class BrushableBar {
  private x: d3.ScaleLinear<number, number>;
  private y: d3.ScaleLinear<number, number>;
  private brush: d3.BrushBehavior<any>;
  private $content: any;
  private dimension: Dimension;

  constructor(dimension: Dimension, data: any, options: { width: number, height: number }) {
    const {
      width,
      height
    } = options;

    const contentHeight = height - padding.bottom - padding.top;
    const contentWidth = width - padding.left - padding.right;

    this.dimension = dimension;

    this.x = d3.scaleLinear()
      .range([0, contentWidth])
      .domain(dimension.range);
    this.brush = d3.brushX();

    d3.select('body').append('div').text(dimension.title || '');
    const $container = d3.select('body').append('div');
    const $svg = $container.append('svg').attr('width', width).attr('height', height);

    this.$content = $svg.append('g').attr('transform', `translate(${padding.top}, ${padding.left})`);
    const maxValue: number = d3.max(data, (d: any) => +d.count) || 0;
    this.y = d3.scaleLinear()
      .domain([0, maxValue])
      .range([contentHeight, 0]);

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
    const $bars = this.$content.selectAll('.bar').data(data, d => d.bucket);

    $bars
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('fill', 'steelblue')
      .attr('y', this.y(0))
      .attr('height', 0)
    .merge($bars)
      .attr('x', (d, i: number) => {
        const { range, bins } = this.dimension;
        return this.x(range[0] + (d.bucket - 1) * (range[1] - range[0]) / bins);
      })
      .attr('y', (d, i: number) => {
        return this.y(+d.count);
      })
      .attr('width', (d, i: number) => {
        const { range, bins } = this.dimension;
        return this.x(range[0] + (range[1] - range[0]) / bins) - 2 * binPadding;
      })
      .attr('height', (d) => {
        return this.y(0) - this.y(+d.count);
      });

    $bars.exit().remove();

    return this;
  }

  public on(eventName: string, callback: any) {
    this.brush.on(eventName, callback);
    // this.callbacks[eventName] = _.throttle(callback, 250);
    return this;
  }
}


export default BrushableBar;
