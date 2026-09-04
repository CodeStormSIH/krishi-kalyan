import { ProcurementProgress } from '@shared/components/ProcurementProgress';
export { ProcurementProgress } from '@shared/components/ProcurementProgress';
import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { UsersRound, Clock, CheckCircle2 } from 'lucide-react';
import { Card, SectionTitle, Stepper, ProgressBar } from '@shared/components/UI';
import { Badge, Button, DataTable, Details, Instructions, Stats } from '@shared/components/Shared';
import { useStore, money } from '@shared/services/store';
import { stages } from '@shared/data/seed';
export function useMyToken() {
  const {
    data
  } = useStore();
  return data.tokens.find(t => t.farmerId === 'KRN123456' && t.status !== 'Cancelled');
}
export function PaymentProgress({
  token
}) {
  const active = token.payment === 'Paid' ? 4 : token.payment === 'In Process' ? 2 : token.stage === 5 ? 1 : 0;
  return <Stepper steps={['Procurement Completed', 'Data Sent for Payment', 'Payment Under Process', 'Payment Credited'].map(label => ({
    label
  }))} active={active} />;
}
export function MissingToken() {
  return <Card><h2>No active token</h2><p>Book a procurement slot to track your queue, procurement and payment.</p><NavLink className="button" to="/farmer/book-token">Book New Token</NavLink></Card>;
}
export function QueueStatus() {
  const {
    data,
    advanceQueue
  } = useStore();
  const token = useMyToken();
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => advanceQueue(token?.center), 15000);
    return () => clearInterval(id);
  }, [live, token?.center]);
  if (!token) return <MissingToken />;
  const queue = data.tokens.filter(t => t.center === token.center && ['In Queue', 'Checked In'].includes(t.status));
  const position = queue.findIndex(t => t.id === token.id) + 1;
  return <div className="page"><div className="toolbar"><Badge>● Live mock queue</Badge><Button secondary onClick={() => setLive(!live)}>{live ? 'Pause simulation' : 'Start live simulation'}</Button><Button secondary onClick={() => advanceQueue(token.center)}>Refresh / Process Next</Button><small>Simulation advances every 15 seconds.</small></div><Stats items={[["Current Position", position ? `${position} / ${queue.length}` : 'Called', UsersRound, 'Your place in the queue'], ['Farmers Ahead', Math.max(0, position - 1), UsersRound], ['Farmers Behind', position ? queue.length - position : 0, UsersRound], ['Estimated Waiting', `${Math.max(0, position - 1) * 5} min`, Clock]]} /><Card className="mt"><SectionTitle title="Queue Progress" /><div className="queue-number"><strong>{position || 'Your turn'}</strong>{position > 0 && <span> / {queue.length}</span>}<b>{position ? 'Please keep your documents ready.' : 'Proceed to the verification desk.'}</b></div><ProgressBar value={position ? Math.round((queue.length - position) / Math.max(1, queue.length) * 100) : 100} /><div className="queue-people">{queue.map((t, i) => <UsersRound key={t.id} className={i < position ? 'on' : ''} aria-label={`${t.name}, position ${i + 1}`} />)}</div></Card><div className="grid two mt"><Card><SectionTitle title="Live Queue Updates" />{[{
          time: new Date().toLocaleTimeString(),
          message: position ? `Your position is ${position} in the queue.` : 'You have been called for procurement.'
        }, ...data.queueLog].map((v, i) => <div className="update-row" key={i}><small>{v.time}</small><span>{v.message}</span></div>)}</Card><Instructions /></div></div>;
}
export function ProcurementStatus() {
  const token = useMyToken();
  if (!token) return <MissingToken />;
  return <div><div className="grid three"><Card><small>My Current Token</small><h2>{token.id}</h2><Badge>{token.status}</Badge></Card><Card><small>Procurement Center</small><h3>{token.center}</h3><p>Bihar</p></Card><Card><small>Time Slot</small><h3>{token.slot}</h3><p>{token.date}</p></Card></div><Card className="mt"><SectionTitle title="Procurement Progress" /><ProcurementProgress token={token} /></Card><div className="grid two mt"><Card><SectionTitle title="Stage Details" />{stages.map((s, i) => <div className="table-row" key={s}><b>{s}</b><span>{i <= token.stage ? token.date : 'Awaiting previous stage'}</span><Badge>{i < token.stage || token.stage === 5 ? 'Completed' : i === token.stage ? 'In Process' : 'Pending'}</Badge></div>)}</Card><Card><SectionTitle title="Procurement Details" /><div className="detail-grid">{[['Crop', token.crop], ['Variety', token.variety], ['Quantity', `${token.quantity} Quintal`], ['Demo rate', `${money(token.rate)} / Quintal`]].map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}</div><h3>Documents Verified</h3>{['Aadhaar Card', 'Kisan Card', 'Land Document'].map(x => <div className="info-row" key={x}><span>{x}</span><Badge>{token.stage >= 2 ? 'Verified' : 'Pending'}</Badge></div>)}</Card></div></div>;
}
export function PaymentStatus() {
  const token = useMyToken();
  const {
    data
  } = useStore();
  if (!token) return <MissingToken />;
  return <div><Card><SectionTitle title="Payment Overview" /><PaymentProgress token={token} /></Card><div className="grid two mt"><Card><SectionTitle title="Payment Details" /><div className="detail-list">{[['Expected Payment', money(token.quantity * token.rate)], ['Quantity', `${token.quantity} Quintal`], ['Rate (demo)', `${money(token.rate)} / Quintal`], ['Payment Status', token.payment], ['Procurement Completed On', token.stage === 5 ? token.date : 'Awaiting procurement completion'], ['Payment Mode', 'Bank Transfer'], ['Bank Name', 'State Bank of India'], ['Account Number', 'XXXX-XXXX-5678'], ['IFSC Code', 'SBIN0001234']].map(([k, v]) => <p key={k}><span>{k}</span><b>{v}</b></p>)}</div></Card><Card><SectionTitle title="Payment History" />{data.history.filter(t => t.payment === 'Paid').slice(0, 5).map(t => <div className="history-payment" key={t.id}><span>{t.date}<br />{t.id}</span><b>{money(t.quantity * t.rate)}</b><Badge>{t.payment}</Badge></div>)}<NavLink className="outline-btn blue" to="/farmer/history">View All History</NavLink></Card></div><Card className="mt success-note">You will receive an in-app notification when the center updates your payment.</Card></div>;
}
export function History() {
  const {
    data
  } = useStore();
  const [detail, setDetail] = useState(null);
  const rows = [...data.tokens.filter(t => t.farmerId === 'KRN123456'), ...data.history];
  return <><DataTable title="My Procurement History" rows={rows} filters={[{
      key: 'status',
      label: 'statuses'
    }, {
      key: 'crop',
      label: 'crops'
    }]} columns={[{
      key: 'id',
      label: 'Token No.'
    }, {
      key: 'center',
      label: 'Center'
    }, {
      key: 'date',
      label: 'Date'
    }, {
      key: 'crop',
      label: 'Crop'
    }, {
      key: 'quantity',
      label: 'Quantity (Qtl)'
    }, {
      key: 'status',
      label: 'Status',
      render: v => <Badge>{v}</Badge>
    }, {
      key: 'amount',
      label: 'Amount',
      render: (_, r) => r.status === 'Cancelled' ? '—' : money(r.quantity * r.rate)
    }]} actions={r => <button className="linkish" onClick={() => setDetail(r)}>View</button>} exportName="my-history" />{detail && <Details row={detail} onClose={() => setDetail(null)} />}</>;
}
