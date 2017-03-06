import * as d3 from 'd3';

export const padding = {
  top: 10,
  bottom: 30,
  left: 80,
  right: 20
};

class Brushable2D {
  public x: d3.ScaleLinear<number, number>;
  public y: d3.ScaleLinear<number, number>;
  private color: d3.ScaleSequential<any>;
  public brush: d3.BrushBehavior<any>;
  public $content: any;
  private $group: d3.Selection<any, any, any, any>;
  private $groupX: d3.Selection<any, any, any, any>;
  private $groupY: d3.Selection<any, any, any, any>;
  private xAxis: d3.Axis<number | { valueOf(): number}>;
  private yAxis: d3.Axis<number | { valueOf(): number}>;
  private zoom: d3.ZoomBehavior<any, number>;
  public contentWidth: number;
  public contentHeight: number;
  public resolution: number;
  private _transformCallback: (transform: d3.ZoomTransform, resolutionChanged: boolean) => void;

  constructor(private view: View2D, options: { width: number, height: number }) {
    const {
      width,
      height
    } = options;

    const contentHeight = height - padding.bottom - padding.top;
    const contentWidth = width - padding.left - padding.right;
    this.resolution = 0;

    this.x = d3.scaleLinear()
      .range([0, contentWidth])
      .domain(view.ranges[0]);

    this.y = d3.scaleLinear()
      .range([0, contentHeight])
      .domain(view.ranges[1]);

    this.color = d3.scaleSequential(d3.interpolateViridis)
      .domain([0, 100]);

    this.xAxis = d3.axisBottom(this.x);
    this.yAxis = d3.axisLeft(this.y);

    this.brush = d3.brush().extent([[0, 0], [contentWidth, contentHeight]]);

    const $vizContainer = d3.select('body').append('div').style('display', 'inline-block');
    $vizContainer.append('div').text(view.title || '');
    const $container = $vizContainer.append('div');
    const $svg = $container.append('svg').attr('width', width).attr('height', height);

    this.$group = $svg.append('g')
      .attr('transform', `translate(${padding.left}, ${padding.top})`)
      .classed('group', true);

    this.$content = this.$group.append('g').classed('content', true);

    this.$group.append('g')
        .attr('class', 'brush')
        .call(this.brush);

    this.$groupX = this.$group.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', 'translate(0,' + contentHeight + ')')
      .call(this.xAxis);

    this.$groupY = this.$group.append('g')
      .attr('class', 'axis axis--y')
      .call(this.yAxis);

    this.zoom = d3.zoom()
        .scaleExtent([1, 10])
        .translateExtent([[0, 0], [contentWidth, contentHeight]])
        .on('zoom', this._zoomed.bind(this));

    $svg.call(this.zoom);

    this.contentWidth = contentWidth;
    this.contentHeight = contentHeight;
    return this;
  }

  /**
   * Handler for d3 zoom event.
   */
  private _zoomed() {
  // view.attr("transform", d3.event.transform);
    const k = Math.round(d3.event.transform.k);
    const transform = d3.zoomIdentity.translate(d3.event.transform.x, d3.event.transform.y).scale(k);
    let resolutionChanged = false;
    if (this.resolution !== k - 1) {
      this.resolution = k - 1;
      resolutionChanged = true;
    }
    this._transformCallback && this._transformCallback(transform, resolutionChanged);
    this.$groupX.call(this.xAxis.scale(transform.rescaleX(this.x)));
    this.$groupY.call(this.yAxis.scale(transform.rescaleY(this.y)));
    // gY.call(yAxis.scale(d3.event.transform.rescaleY(y)));
  }

  public onTransform(_onTransform: (transform: d3.ZoomTransform, resolutionChanged: boolean) => void) {
    this._transformCallback = _onTransform;
    return this;
  }
  /**
   * Update with new data and the range that was used for this data.
   */
  public update(data: number[][], rangeError: number) {
    this.$content.selectAll('.data-group').remove();

    const maxValue: number = d3.max(data.map((arr) => { return d3.max(arr) as number; })) as number;

    if (maxValue === 0) {
      return;
    }
    this.color.domain([0, maxValue]);

    const snapToResolution = (x: number, r: number) => {
      // return Math.round(x);
      return Math.round(x * r) / r;
    };

    const $groups = (this.$content.selectAll('.data-group') as d3.Selection<any, any, any, any>).data(data, d => d)
      .enter()
      .append('g')
      .attr('class', 'data-group')
      .attr('transform', (d, i) => {
        const { ranges, bins } = this.view;
        const range = ranges[0];
        return `translate(${snapToResolution(this.x(range[0] + (i) * (range[1] - range[0]) / bins[0]), 1)}, 0)`;
      });

    // this.$group.select('.axis--y').call(this.yAxis);
    const $bins = $groups.selectAll('.bin').data((d) => d);
    $bins
      .enter()
      .append('rect')
      .attr('class', 'bin')

    .merge($bins)
      .attr('width', () => {
        const { ranges, bins } = this.view;
        const range = ranges[0];
        return snapToResolution(this.x(range[0] + (range[1] - range[0]) / bins[0]), 1);
      })
      .attr('height', (d) => {
        const { ranges, bins } = this.view;
        const range = ranges[1];
        return snapToResolution(this.y(range[0] + (range[1] - range[0]) / bins[1]), 2);
      })
      .attr('y', (_, i: number) => {
        const { ranges, bins } = this.view;
        const range = ranges[1];
        return snapToResolution(this.y(range[0] + (i) * (range[1] - range[0]) / bins[1]), 2);
      })
      .attr('fill', (d) => {
        return this.color(d);
      })
      .attr('opacity',  1 - rangeError);

    $bins.exit().remove();

    return this;
  }

  /**
   * Subscribe to brush event.
   */
  public onBrush(eventName: string, callback: any) {
    this.brush.on(eventName, callback);
    return this;
  }

  /**
   * Subscribe to events on the brush overlay (not the brush itself).
   */
  public onOverlay(eventName: string, callback: any) {
    this.$group.select('.overlay').on(eventName, callback);
    return this;
  }

  public onSelection(eventName: string, callback: any) {
    this.$group.select('.selection').on(eventName, callback);
    return this;
  }
}


export default Brushable2D;
