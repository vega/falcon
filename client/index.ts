import * as d3 from 'd3';

const data = d3.range(1000).map(d3.randomBates(10));

const formatCount = d3.format(',.0f');

const svg = d3.select('svg');

const margin = {top: 10, right: 30, bottom: 30, left: 30};
const width = +svg.attr('width') - margin.left - margin.right;
const height = +svg.attr('height') - margin.top - margin.bottom;
const g = svg.append('g').attr('transform', `translate( ${margin.left}, ${margin.top})`);

const x = d3.scaleLinear()
  .rangeRound([0, width]);

const bins = d3.histogram()
  .domain(x.domain() as [number, number])
  .thresholds(x.ticks(20))
  (data);

const y = d3.scaleLinear()
  .domain([0, d3.max(bins, d => d.length)!])
  .range([height, 0]);

const bar = g.selectAll('.bar')
  .data(bins)
  .enter().append('g')
    .attr('class', 'bar')
    .attr('transform', d => `translate(${x(d.x0)}, ${y(d.length)})`);

bar.append('rect')
  .attr('x', 1)
  .attr('width', x(bins[0].x1) - x(bins[0].x0) - 1)
  .attr('height', d => height - y(d.length));

bar.append('text')
  .attr('dy', '.75em')
  .attr('y', 6)
  .attr('x', (x(bins[0].x1) - x(bins[0].x0)) / 2)
  .attr('text-anchor', 'middle')
  .text(d => formatCount(d.length));

g.append('g')
  .attr('class', 'axis axis--x')
  .attr('transform', `translate(0, ${height})`)
  .call(d3.axisBottom(x));

g.append('g')
  .attr('class', 'axis axis--y')
  .attr('transform', `translate(0, 0)`)
  .call(d3.axisLeft(y));
