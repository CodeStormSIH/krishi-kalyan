import React from "react";
export function Card({
  children,
  className = ""
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function SectionTitle({
  title,
  action
}) {
  return <div className="section-title"><h2>{title}</h2>{action && <span className="linkish">{action}</span>}</div>;
}
export function StatusBadge({
  children,
  tone = "green"
}) {
  return <span className={`status ${tone}`}>{children}</span>;
}
export function Stepper({
  steps,
  active = 0,
  compact = false
}) {
  return <div className={`stepper ${compact ? "compact" : ""}`}>
    {steps.map((s, i) => <React.Fragment key={s.label}>
      <div className={`step ${i < active ? "done" : i === active ? "current" : ""}`}>
        <div className="step-dot">{i < active ? "✓" : s.icon || i + 1}</div>
        <b>{s.label}</b>
        {s.time && <small>{s.time}</small>}
        {s.note && <small>{s.note}</small>}
      </div>
      {i < steps.length - 1 && <div className={`step-line ${i < active ? "done" : ""}`} />}
    </React.Fragment>)}
  </div>;
}
export function ProgressBar({
  value
}) {
  return <div className="progress"><span style={{
      width: `${value}%`
    }} /></div>;
}
export function EmptyNote({
  children
}) {
  return <div className="empty-note">{children}</div>;
}
