import React, { useEffect, useRef, useState } from 'react';
import { Search, Download, X, ChevronLeft, ChevronRight, Check, Info } from 'lucide-react';
import { Card, SectionTitle, StatusBadge } from './UI';
import { download } from '../services/store';
export function Badge({
  children
}) {
  const s = String(children);
  return <StatusBadge tone={/Failed|Cancelled|Inactive|High/.test(s) ? 'red' : /Pending|Process|Verification|Medium|Investigating|Quality/.test(s) ? 'orange' : /Queue|Open/.test(s) ? 'blue' : 'green'}>{children}</StatusBadge>;
}
export function Button({
  children,
  onClick,
  type = 'button',
  secondary = false,
  ...props
}) {
  return <button type={type} className={secondary ? 'button secondary' : 'button'} onClick={onClick} {...props}>{children}</button>;
}
export function Field({
  label,
  options,
  ...props
}) {
  return <label className="field"><span>{label}</span>{options ? <select {...props}>{options.map(o => <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>{typeof o === 'string' ? o : o.label}</option>)}</select> : props.multiline ? <textarea {...Object.fromEntries(Object.entries(props).filter(([k]) => k !== 'multiline'))} /> : <input {...props} />}</label>;
}
export function Tabs({
  items,
  value,
  onChange
}) {
  return <div className="tabs" role="tablist">{items.map(t => <button key={t} role="tab" aria-selected={value === t} className={value === t ? 'selected' : ''} onClick={() => onChange(t)}>{t}</button>)}</div>;
}
export function Modal({
  title,
  children,
  onClose
}) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    return () => {
      previous?.focus();
    };
  }, []);
  return <dialog aria-label={title} ref={ref} className="modal" onCancel={onClose} onClick={e => {
    if (e.target === ref.current) onClose();
  }}><div className="section-title"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div>{children}</dialog>;
}
export function Details({
  row,
  onClose,
  title = 'Record details',
  children
}) {
  return <Modal title={title} onClose={onClose}><dl className="record-details">{Object.entries(row).filter(([k, v]) => !['notes', 'replies', 'photo', 'password'].includes(k) && typeof v !== 'object').map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, ' $1')}</dt><dd>{String(value)}</dd></div>)}</dl>{children}<Button secondary onClick={() => download(row.id || 'details', row)}><Download size={15} /> Download record</Button></Modal>;
}
export function DataTable({
  title,
  rows,
  columns,
  filters = [],
  actions,
  extra,
  pageSize = 8,
  exportName = 'records'
}) {
  const [search, setSearch] = useState(''),
    [selected, setSelected] = useState({}),
    [page, setPage] = useState(1);
  const filtered = rows.filter(r => (!search || Object.values(r).join(' ').toLowerCase().includes(search.toLowerCase())) && filters.every(f => !selected[f.key] || String(r[f.key]) === selected[f.key]));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize)),
    current = Math.min(page, pages),
    slice = filtered.slice((current - 1) * pageSize, current * pageSize);
  return <Card>{title && <SectionTitle title={title} />}<div className="toolbar"><div className="search-box"><Search size={16} /><input aria-label={`Search ${title || exportName}`} placeholder="Search by name, token or keyword…" value={search} onChange={e => {
          setSearch(e.target.value);
          setPage(1);
        }} /></div>{filters.map(f => <select key={f.key} aria-label={f.label} value={selected[f.key] || ''} onChange={e => {
        setSelected({
          ...selected,
          [f.key]: e.target.value
        });
        setPage(1);
      }}><option value="">All {f.label}</option>{[...new Set(rows.map(r => r[f.key]))].sort().map(v => <option key={v}>{v}</option>)}</select>)}{extra}<Button secondary onClick={() => download(exportName, filtered)}><Download size={14} /> Export</Button></div><div className="table-wrap"><table><thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}{actions && <th>Action</th>}</tr></thead><tbody>{slice.map(r => <tr key={r.id}>{columns.map(c => <td key={c.key}>{c.render ? c.render(r[c.key], r) : r[c.key]}</td>)}{actions && <td><div className="table-actions">{actions(r)}</div></td>}</tr>)}</tbody></table>{!slice.length && <div className="empty-note"><Info size={22} /><p>No matching records. Try another search or filter.</p></div>}</div><div className="pagination"><span>Showing {filtered.length ? (current - 1) * pageSize + 1 : 0}–{Math.min(current * pageSize, filtered.length)} of {filtered.length} entries</span><div><button aria-label="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)}><ChevronLeft size={14} /></button>{Array.from({
          length: pages
        }, (_, i) => i + 1).filter(n => n === 1 || n === pages || Math.abs(n - current) < 2).map(n => <button key={n} aria-label={`Page ${n}`} aria-current={n === current ? 'page' : undefined} className={n === current ? 'selected' : ''} onClick={() => setPage(n)}>{n}</button>)}<button aria-label="Next page" disabled={current === pages} onClick={() => setPage(current + 1)}><ChevronRight size={14} /></button></div></div></Card>;
}
export function Stats({
  items
}) {
  return <div className="stats-grid" style={{
    '--count': items.length
  }}>{items.map(([label, value, Icon, note, tone = 'green']) => <Card key={label}><div className={`stat-icon ${tone}`}>{Icon && <Icon size={27} />}</div><div><span>{label}</span><strong>{value}</strong><small>{note || 'Live demo records'}</small></div></Card>)}</div>;
}
export function Instructions() {
  return <Card className="instructions"><SectionTitle title="Important Instructions" />{['Please reach the center 30 minutes before your time slot.', 'Bring original Aadhaar card and other documents.', 'Bring your crop for quality verification.', 'Follow the center’s guidelines and instructions.'].map(t => <p className="instruction" key={t}><Check size={15} />{t}</p>)}</Card>;
}

