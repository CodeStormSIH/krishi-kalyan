import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
export default function DateCalendar({
  value,
  onChange,
  min
}) {
  const [month, setMonth] = useState(() => new Date((value || min) + 'T12:00:00'));
  const year = month.getFullYear(),
    index = month.getMonth();
  const offset = new Date(year, index, 1).getDay(),
    days = new Date(year, index + 1, 0).getDate();
  const move = amount => setMonth(new Date(year, index + amount, 1));
  return <div className="date-calendar"><div className="section-title"><button type="button" className="icon-btn" aria-label="Previous month" onClick={() => move(-1)}><ChevronLeft size={17} /></button><b>{month.toLocaleDateString('en-IN', {
          month: 'long',
          year: 'numeric'
        })}</b><button type="button" className="icon-btn" aria-label="Next month" onClick={() => move(1)}><ChevronRight size={17} /></button></div><div className="date-calendar-grid">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <small key={d}>{d}</small>)}{Array.from({
        length: offset
      }, (_, i) => <span key={`blank${i}`} />)}{Array.from({
        length: days
      }, (_, i) => {
        const date = `${year}-${String(index + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
        return <button type="button" key={date} aria-label={`Select ${date}`} aria-pressed={date === value} disabled={date < min} className={date === value ? 'selected' : ''} onClick={() => onChange(date)}>{i + 1}</button>;
      })}</div></div>;
}
