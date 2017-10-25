import * as d3 from 'd3';
import {views} from '../shared/config';

const element = d3.select('#view');

for (const view of views) {
  const data = d3.range(1000).map(d3.randomBates(10));
  const el = renderView(element, view.title || '');

  updateChart(el, data);

  const data2 = d3.range(1000).map(d3.randomBates(10));
  updateChart(el, data2);
}

type Selection = d3.Selection<d3.BaseType, {}, HTMLElement, any>;

function renderView(el: Selection, title: string) {
  const svg = el.append('svg');

  const w = 600;
  const h = 220;
  const margin = {top: 10, right: 10, bottom: 50, left: 40};
  const width = w - margin.left - margin.right;
  const height = h - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate( ${margin.left}, ${margin.top})`);

  svg.attr('width', w).attr('height', h);

  const x = d3.scaleLinear()
    .rangeRound([0, width]);

  g.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', `translate(0, ${height})`)
    .call(d3.axisBottom(x));

  g.append('g')
    .attr('class', 'axis axis--y')
    .attr('transform', `translate(0, 0)`);

  g.append('text')
    .attr('class', 'title')
    .attr('x', width / 2)
    .attr('y', height + 30)
    .attr('text-anchor', 'middle')
    .text(title);

  return g;
}

function updateChart(el: Selection, data: number[]) {
  const formatCount = d3.format(',.0f');

  const w = 600;
  const h = 220;
  const margin = {top: 10, right: 10, bottom: 50, left: 40};
  const width = w - margin.left - margin.right;
  const height = h - margin.top - margin.bottom;

  const x = d3.scaleLinear()
    .rangeRound([0, width]);

  const bins = d3.histogram()
    .domain(x.domain() as [number, number])
    .thresholds(x.ticks(20))(data);

  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length)!])
    .range([height, 0]);

  const bar = el.selectAll('.bar')
    .data(bins)
    .enter().append('g')
      .attr('class', 'bar')
      .attr('transform', d => `translate(${x(d.x0)}, ${y(d.length)})`);

  bar.append('rect')
    .attr('x', 1)
    .attr('width', x(bins[0].x1) - x(bins[0].x0) - 1)
    .attr('height', d => height - y(d.length));

  el.select('axis axis--y')
    .call(d3.axisLeft(y));

  bar.append('text')
    .attr('dy', '.75em')
    .attr('y', 6)
    .attr('x', (x(bins[0].x1) - x(bins[0].x0)) / 2)
    .attr('text-anchor', 'middle')
    .text(d => formatCount(d.length));
}
