import React, { useState } from 'react';
const colors = ['#2382ff', '#22ac71', '#784ad1', '#ffb400'];
export function LineChart({
  period = 'Daily',
  series = ['Tokens Generated', 'Farmers Served', 'Procured (MT)'],
  seed = 0
}) {
  const [hover, setHover] = useState(null);
  const count = period === 'Monthly' ? 6 : period === 'Weekly' ? 8 : 14;
  const values = series.map((_, j) => Array.from({
    length: count
  }, (_, i) => Math.round(30 + j * 8 + i * 2.1 + Math.sin((i + seed) * 1.5 + j) * 10 + (2 - j) * 16)));
  return <div className="line-chart"><div className="chart-legend">{series.map((s, j) => <span key={s}><i style={{
          background: colors[j]
        }} />{s}</span>)}</div><svg viewBox="0 0 580 230" role="img" aria-label={`${period} ${series.join(', ')} chart`}>{[0, 1, 2, 3, 4].map(i => <g key={i}><line x1="35" y1={20 + i * 44} x2="565" y2={20 + i * 44} stroke="#e8edf2" /><text x="0" y={24 + i * 44} fill="#65718a" fontSize="10">{100 - i * 25}</text></g>)}{values.map((v, j) => <g key={j}><polyline points={v.map((n, i) => `${35 + i * 530 / (count - 1)},${196 - n * 1.55}`).join(' ')} fill="none" stroke={colors[j]} strokeWidth="2" />{v.map((n, i) => <circle key={i} cx={35 + i * 530 / (count - 1)} cy={196 - n * 1.55} r="3" fill={colors[j]} />)}</g>)}{Array.from({
        length: count
      }, (_, i) => <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}><rect x={20 + i * 530 / (count - 1)} y="5" width={530 / count} height="202" fill="transparent"><title>{series.map((s, j) => `${s}: ${values[j][i]}`).join(' • ')}</title></rect>{i % 2 === 0 && <text x={35 + i * 530 / (count - 1)} y="224" fontSize="10" textAnchor="middle" fill="#65718a">{period === 'Monthly' ? `Month ${i + 1}` : period === 'Weekly' ? `Week ${i + 1}` : `Day ${i + 1}`}</text>}</g>)}</svg><div className="chart-tooltip" aria-live="polite">{hover === null ? 'Hover over the chart to inspect values' : series.map((s, j) => `${s}: ${values[j][hover]}`).join(' · ')}</div></div>;
}
export function Donut({
  items = [['Completed', 58], ['In Queue', 29], ['In Process', 10], ['Cancelled', 3]],
  total,
  label = 'Total'
}) {
  const [active, setActive] = useState(null);
  const sum = items.reduce((s, i) => s + i[1], 0) || 1;
  let offset = 0;
  return <div className="donut-layout"><div className="donut"><svg viewBox="0 0 160 160" role="img" aria-label={items.map(i => i.join(': ')).join(', ')}>{items.map(([name, value], i) => {
          const length = value / sum * 100;
          const start = offset;
          offset += length;
          return <circle key={name} cx="80" cy="80" r="61" fill="none" stroke={colors[i % 4]} strokeWidth={active === i ? 26 : 23} pathLength="100" strokeDasharray={`${Math.max(0, length - .4)} ${100 - Math.max(0, length - .4)}`} strokeDashoffset={-start} transform="rotate(-90 80 80)" onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}><title>{name}: {value}</title></circle>;
        })}</svg><div><strong>{active === null ? total ?? sum : items[active][1]}</strong><small>{active === null ? label : items[active][0]}</small></div></div><div className="donut-legend">{items.map(([name, value], i) => <div key={name}><i style={{
          background: colors[i % 4]
        }} /><span>{name}<small>{value} ({(value / sum * 100).toFixed(1)}%)</small></span></div>)}</div></div>;
}
export function BarChart({
  items
}) {
  const max = Math.max(...items.map(i => i[1]), 1);
  return <div className="bar-chart">{items.map(([name, value], i) => <div key={name}><span>{name}</span><div><div style={{
          width: `${value / max * 100}%`,
          background: colors[i % 4]
        }} title={`${name}: ${value}`} /></div><b>{value}</b></div>)}</div>;
}
