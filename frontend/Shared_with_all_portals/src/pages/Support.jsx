import React, { useState } from 'react';
import { Ticket, Clock, CheckCircle2, MessageSquare } from 'lucide-react';
import { Card, SectionTitle } from '../components/UI';
import { Badge, Button, Field, DataTable, Details, Stats } from '../components/Shared';
import { useStore } from '../services/store';
import { dateISO } from '../data/seed';
const faqs = [['How to book a token?', 'Open Book / My Token, choose a procurement center, select a date and time slot, enter your crop quantity and confirm. Your token is generated immediately.'], ['How to check queue status?', 'Open My Queue Status to see your current position. Enable the demo live simulation to observe updates every 15 seconds.'], ['What documents are required?', 'Bring your Aadhaar card, Kisan card, bank details and land document.'], ['How is payment calculated?', 'Payment is the accepted quantity multiplied by the applicable procurement rate. This demo uses an illustrative rate of ₹2,125 per quintal.'], ['How do I reschedule or cancel?', 'Open Book / My Token and select Reschedule or Cancel Booking on your current token.'], ['How can I contact support?', 'Create a ticket using this form. The support team can respond and update the ticket status in the admin portal.']];
export default function Support() {
  const {
    data,
    session,
    update,
    patch,
    toast
  } = useStore();
  const admin = session.role === 'admin';
  const [detail, setDetail] = useState(null);
  const tickets = admin ? data.tickets : data.tickets.filter(t => t.role === session.role);
  const current = detail && data.tickets.find(t => t.id === detail.id);
  function submit(e) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    const ticket = {
      ...values,
      id: `TKT${Date.now().toString().slice(-7)}`,
      name: data.profiles[session.role].name,
      role: session.role,
      status: 'Open',
      date: dateISO(),
      replies: []
    };
    update('tickets', rows => [ticket, ...rows]);
    e.currentTarget.reset();
    toast(`Ticket ${ticket.id} created successfully.`);
  }
  return <>{admin && <Stats items={[["Total Tickets", tickets.length, Ticket], ['Open', tickets.filter(t => t.status === 'Open').length, MessageSquare], ['In Progress', tickets.filter(t => t.status === 'In Progress').length, Clock], ['Resolved', tickets.filter(t => t.status === 'Resolved').length, CheckCircle2]]} />}<div className="grid two mt"><Card><SectionTitle title="How can we help you?" />{faqs.map(([q, a]) => <details className="faq-item" key={q}><summary>{q}</summary><p>{a}</p></details>)}<div className="contact-box"><b>Contact Support</b><p>1800-123-4567 · Mon – Sat, 9 AM – 6 PM</p><small>Demo helpdesk · Submit a ticket for a tracked response.</small></div></Card><Card><SectionTitle title="Raise a Ticket" /><form onSubmit={submit}><div className="form-grid"><Field label="Category" name="category" required options={[{
              value: '',
              label: 'Select Category'
            }, 'Token / Booking', 'Payment', 'Procurement', 'Technical', 'Other']} /><Field label="Priority" name="priority" options={['Low', 'Medium', 'High']} /></div><Field label="Subject" name="subject" required minLength={5} maxLength={120} /><Field label="Description" name="description" multiline required minLength={15} /><Button type="submit">Submit Ticket</Button></form></Card></div><div className="mt"><DataTable title={admin ? 'Support Helpdesk' : 'My Tickets'} rows={tickets} filters={[{
        key: 'status',
        label: 'statuses'
      }, {
        key: 'priority',
        label: 'priorities'
      }]} columns={[{
        key: 'id',
        label: 'Ticket ID'
      }, {
        key: 'name',
        label: 'Name'
      }, {
        key: 'subject',
        label: 'Subject'
      }, {
        key: 'category',
        label: 'Category'
      }, {
        key: 'priority',
        label: 'Priority',
        render: v => <Badge>{v}</Badge>
      }, {
        key: 'status',
        label: 'Status',
        render: v => <Badge>{v}</Badge>
      }, {
        key: 'date',
        label: 'Created On'
      }]} actions={r => <button className="linkish" onClick={() => setDetail(r)}>View</button>} /></div>{current && <Details title={`Support Ticket ${current.id}`} row={current} onClose={() => setDetail(null)}><div className="ticket-replies">{current.replies.map((r, i) => <p key={i}><b>{r.by}</b> · {r.date}<br />{r.message}</p>)}</div><form onSubmit={e => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        patch('tickets', current.id, {
          status: admin ? f.get('status') : current.status,
          replies: [...current.replies, {
            by: data.profiles[session.role].name,
            date: dateISO(),
            message: f.get('message')
          }]
        });
        e.currentTarget.reset();
        toast('Ticket reply saved.');
      }}>{admin && <Field label="Ticket Status" name="status" defaultValue={current.status} options={['Open', 'In Progress', 'Resolved']} />}<Field label="Reply" name="message" multiline required minLength={5} /><Button type="submit">{admin ? 'Update Ticket & Reply' : 'Send Reply'}</Button></form></Details>}</>;
}
