import * as d3 from 'd3';

export const padding = {
  top: 10,
  bottom: 30,
  left: 80,
  right: 20
};

const binPadding = 1;

class BrushableBar {
  public x: d3.ScaleLinear<number, number>;
  private y: d3.ScaleLinear<number, number>;
  private brush: d3.BrushBehavior<any>;
  private $content: any;
  private $group: d3.Selection<any, any, any, any>;
  private xAxis: d3.Axis<number | { valueOf(): number}>;
  private yAxis: d3.Axis<number | { valueOf(): number}>;
  public contentWidth: number;
  public contentHeight: number;

  constructor(private dimension: Dimension, options: { width: number, height: number }) {
    const {
      width,
      height
    } = options;

    const contentHeight = height - padding.bottom - padding.top;
    const contentWidth = width - padding.left - padding.right;

    this.x = d3.scaleLinear()
      .range([0, contentWidth])
      .domain(dimension.range);

    this.y = d3.scaleLinear()
      .domain([0, 100])
      .range([contentHeight, 0]);

    this.xAxis = d3.axisBottom(this.x);
    this.yAxis = d3.axisLeft(this.y);

    this.brush = d3.brushX().extent([[0, 0], [contentWidth, contentHeight]]);

    d3.select('body').append('div').text(dimension.title || '');
    const $container = d3.select('body').append('div');
    const $svg = $container.append('svg').attr('width', width).attr('height', height);

    this.$group = $svg.append('g').attr('transform', `translate(${padding.left}, ${padding.top})`);

    this.$content = this.$group.append('g');

    this.$group.append('g')
        .attr('class', 'x brush')
        .call(this.brush);
        // .call(this.brush.move, this.x.range());

    this.$group.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', 'translate(0,' + contentHeight + ')')
      .call(this.xAxis);

    this.$group.append('g')
      .attr('class', 'axis axis--y')
      .call(this.yAxis);

    this.contentWidth = contentWidth;
    this.contentHeight = contentHeight;
    return this;
  }

  /**
   * Update with new data and the range that was used for this data.
   */
  public update(data: number[]) {
    const $bars = this.$content.selectAll('.bar').data(data, d => d);

    const maxValue: number = d3.max([d3.max(data), this.y.domain()[1]]) || 0;
    this.y.domain([0, maxValue]);
    this.$group.select('.axis--y').call(this.yAxis);

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
        return this.x(range[0] + (i - 1) * (range[1] - range[0]) / bins);
      })
      .attr('y', (d, i: number) => {
        return this.y(d);
      })
      .attr('width', (d, i: number) => {
        const { range, bins } = this.dimension;
        return this.x(range[0] + (range[1] - range[0]) / bins) - 2 * binPadding;
      })
      .attr('height', (d) => {
        return this.y(0) - this.y(d);
      });

    $bars.exit().remove();

    return this;
  }

  public onBrush(eventName: string, callback: any) {
    this.brush.on(eventName, callback);
    return this;
  }

  public on(eventName: string, callback: any) {
    this.$content.on(eventName, callback);
    return this;
  }
}


export default BrushableBar;
