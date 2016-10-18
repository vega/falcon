/// <reference path='../../interfaces.d.ts' />

import * as d3 from 'd3';

const padding = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0
};

const binPadding = 2.5;

class BrushableBar {

  callbacks: any = {};
  x: any;
  y: any;
  brush: any;
  $content: any;
  bins: any;

  constructor(selector: string, data: any, options = { width: 600, height: 400 }) {
    const {
      width,
      height
    } = options;

    const contentHeight = options.height - padding.bottom - padding.top;
    const contentWidth = options.width - padding.left - padding.right;

    this.x = d3.scale.linear().domain(data.domain).range([0, contentWidth]);
    this.brush = d3.svg.brush().x(this.x).on('brush', this.brushed.bind(this));

    const $container = d3.select(selector);
    const $svg = $container.append('svg').attr('width', width).attr('height', height);

    this.$content = $svg.append('g').attr('transform', `translate(${padding.top}, ${padding.left})`);

    const tempScale = d3.scale.linear().domain([0, data.y.length]).range(data.domain);
    this.bins = d3.range(data.y.length).map(tempScale);

    this.y = d3.scale.linear().domain([0, d3.max(data.y)]).range([contentHeight, 0]);

    this.update(data);

    this.$content.append('g')
        .attr('class', 'x brush')
        .call(this.brush)
      .selectAll('rect')
        .attr('y', -6)
        .attr('height', contentHeight + 7);

    return this;
  }

  update(data: any) {
    const $bars = this.$content.selectAll('.bar').data(data.y).enter().append('rect').attr('class', 'bar');

    $bars
      .attr('x', (d: number, i: number) => {
        return this.x(this.bins[i]) + binPadding;
      })
      .attr('y', (d: number, i: number) => {
        return this.y(d);
      })
      .attr('width', (d: number, i: number) => {
        return this.x(this.bins[1]) - this.x(this.bins[0]) - 2 * binPadding;
      })
      .attr('height', (d: number) => {
        return this.y(0) - this.y(d);
      })
      .attr('fill', 'steelblue');
  }

  on(eventName: string, callback: any) {
    this.callbacks[eventName] = callback;
  }

  brushed() {
    const extent = this.brush.extent();
    this.callbacks.brushed ? this.callbacks.brushed(extent) : null;
  }

}


export default BrushableBar;
