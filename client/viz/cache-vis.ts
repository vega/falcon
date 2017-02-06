import * as d3 from 'd3';
import {padding} from './brushable-bar';

class CacheView {
  public x: {[dimension: string]: d3.ScaleLinear<number, number>} = {};
  private y: d3.ScaleBand<string>;
  private $content: d3.Selection<any, any, any, any>;
  private yAxis: d3.Axis<string>;
  public contentWidth: number;
  public contentHeight: number;

  constructor(dimensions: Dimension[], options: { width: number, height: number }) {
    const {
      width,
      height
    } = options;

    const contentHeight = height - padding.bottom - padding.top;
    const contentWidth = width - padding.left - padding.right;

    dimensions.forEach(d => {
      this.x[d.name] = d3.scaleLinear()
        .range([0, contentWidth])
        .domain(d.range);
    });

    this.y = d3.scaleBand()
      .domain(dimensions.map(d => d.name))
      .range([contentHeight, 0]);

    this.yAxis = d3.axisLeft(this.y);

    const $svg = d3.select('body').append('svg').attr('width', width).attr('height', height);
    this.$content = $svg.append('g').attr('transform', `translate(${padding.left}, ${padding.top})`);

    this.$content.append('g')
      .attr('class', 'axis axis--y')
      .call(this.yAxis);

    this.contentWidth = contentWidth;
    this.contentHeight = contentHeight;
    return this;
  }

  public update(data: {dimension: string, caches: number[]}[]) {
    const $dims = this.$content.selectAll('.dim').data(data, (d: {dimension: string})  => d.dimension);

    const id: (_: any) => any = (d) => d;

    const tick = $dims
      .enter()
      .append('g')
      .attr('class', 'dim')
      .attr('transform', d => `translate(0, ${this.y(d.dimension)})`)
      .merge($dims)
      .selectAll('line').data(d => d.caches, id);

    $dims.exit().remove();

    tick.enter()
        .append('line')
        .attr('x1', d => d)
        .attr('x2', d => d)
        .attr('y1', '0')
        .attr('y2', this.y.bandwidth)
        .attr('strokeWidth', 0.5)
        .attr('stroke', 'black');

    tick.exit().remove();

    return this;
  }
}


export default CacheView;
