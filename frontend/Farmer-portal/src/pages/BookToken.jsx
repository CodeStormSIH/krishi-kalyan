import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Building2 } from 'lucide-react';
import { Card, SectionTitle } from '@shared/components/UI';
import { Badge, Button, Field, Modal } from '@shared/components/Shared';
import { useStore, download } from '@shared/services/store';
import { dateISO } from '@shared/data/seed';
import DateCalendar from '../components/DateCalendar';
const slots = ['09:00 AM - 10:00 AM', '10:30 AM - 11:30 AM', '12:00 PM - 01:00 PM', '01:30 PM - 02:30 PM', '04:00 PM - 05:00 PM'];
export default function BookToken() {
  const {
    data,
    update,
    patch,
    notify,
    toast
  } = useStore();
  const nav = useNavigate();
  const active = data.tokens.find(t => t.farmerId === 'KRN123456' && !['Cancelled', 'Completed'].includes(t.status));
  const [step, setStep] = useState(0),
    [search, setSearch] = useState(''),
    [center, setCenter] = useState(active?.center || data.centers[0].name),
    [date, setDate] = useState(active?.date >= dateISO() ? active.date : dateISO()),
    [slot, setSlot] = useState(''),
    [crop, setCrop] = useState(active?.crop || 'Wheat'),
    [quantity, setQuantity] = useState(active?.quantity || 20),
    [reschedule, setReschedule] = useState(false),
    [cancel, setCancel] = useState(false),
    [success, setSuccess] = useState(null);
  const selected = data.centers.find(c => c.name === center);
  const availability = value => {
    const count = data.tokens.filter(t => t.center === center && t.date === date && t.slot === value && t.status !== 'Cancelled').length;
    return count >= 10 ? 'Unavailable' : count >= 7 ? 'Limited' : 'Available';
  };
  function book(e) {
    e.preventDefault();
    if (active && !reschedule) {
      toast('Reschedule or cancel your active booking before booking again.');
      return;
    }
    const record = {
      ...(reschedule ? active : {}),
      id: reschedule ? active.id : `TK${Date.now().toString().slice(-8)}`,
      farmerId: 'KRN123456',
      name: data.profiles.farmer.name,
      center,
      date,
      slot,
      crop,
      quantity: Number(quantity),
      variety: crop === 'Wheat' ? 'HD 2967' : crop === 'Paddy' ? 'Swarna' : 'Hybrid',
      rate: 2125,
      status: 'In Queue',
      stage: 0,
      payment: 'Pending',
      position: data.tokens.length + 1,
      notes: []
    };
    if (reschedule) patch('tokens', active.id, record);else update('tokens', rows => [record, ...rows]);
    notify(reschedule ? 'Booking Rescheduled' : 'Token Generated', `Your token ${record.id} is confirmed at ${center} on ${date}, ${slot}.`);
    setSuccess(record);
    setReschedule(false);
    setStep(0);
  }
  if (success) return <Card className="booking-success"><CheckCircle2 size={64} /><h2>Your booking is confirmed!</h2><p>Your procurement token</p><div className="token-big">{success.id}</div><p>{success.center} · {success.date}</p><p>{success.slot}</p><p>{success.quantity} Quintal {success.crop}</p><div className="button-row"><Button onClick={() => download('booking', success)}>Download Token</Button><Button secondary onClick={() => nav('/farmer/queue')}>View Queue</Button></div></Card>;
  return <div className="page">{active && !reschedule ? <Card className="current-booking"><div><Badge>{active.status}</Badge><h2>My current token · {active.id}</h2><p>{active.center} · {active.date} · {active.slot}</p><p>{active.quantity} Quintal {active.crop}</p></div><div className="button-row"><Button secondary onClick={() => download('token', active)}>Download Token</Button><Button onClick={() => {
          setReschedule(true);
          setSlot(active.slot);
        }}>Reschedule</Button><Button secondary onClick={() => setCancel(true)}>Cancel Booking</Button></div></Card> : <><div className="booking-steps">{['Select Center', 'Select Date & Slot', 'Confirm & Book'].map((s, i) => <span className={i <= step ? 'selected' : ''} key={s}><b>{i + 1}</b> {s}</span>)}</div><form onSubmit={book}>{step === 0 && <Card><SectionTitle title="Select Procurement Center" /><Field label="Search centers" placeholder="Search by center or district" value={search} onChange={e => setSearch(e.target.value)} /><div className="center-list">{data.centers.filter(c => c.status === 'Active' && (c.name + c.district).toLowerCase().includes(search.toLowerCase())).map(c => <label key={c.id} className="radio-row"><input type="radio" name="center" checked={center === c.name} onChange={() => {
                setCenter(c.name);
                setSlot('');
              }} /><Building2 size={24} /><div><b>{c.name}</b><small>{c.address}</small></div><span>{c.distance || 10} km</span></label>)}</div><div className="button-row"><Button disabled={!selected || selected.status !== 'Active'} onClick={() => setStep(1)}>Continue</Button></div></Card>}{step === 1 && <div className="grid two"><Card><SectionTitle title="Select Date" /><Field label="Procurement date" type="date" min={dateISO()} required value={date} onChange={e => {
              setDate(e.target.value);
              setSlot('');
            }} /><p className="muted">Bookings are available during center operating hours. Arrive 30 minutes before your slot.</p><DateCalendar value={date} min={dateISO()} onChange={value => {
              setDate(value);
              setSlot('');
            }} /></Card><Card><SectionTitle title="Available Time Slots" />{slots.map(s => <label className="slot" key={s}><input type="radio" name="slot" checked={slot === s} disabled={availability(s) === 'Unavailable'} onChange={() => setSlot(s)} /><b>{s}</b><Badge>{availability(s)}</Badge></label>)}<div className="button-row"><Button secondary onClick={() => setStep(0)}>Back</Button><Button disabled={!slot || !date || date < dateISO()} onClick={() => setStep(2)}>Continue</Button></div></Card></div>}{step === 2 && <Card><SectionTitle title="Confirm & Book" /><div className="detail-list"><p><span>Center</span><b>{center}</b></p><p><span>Date</span><b>{date}</b></p><p><span>Time slot</span><b>{slot}</b></p></div><div className="form-grid mt"><Field label="Crop" options={['Wheat', 'Paddy', 'Maize']} value={crop} onChange={e => setCrop(e.target.value)} /><Field label="Quantity (Quintal)" type="number" min="1" max="500" step="0.1" required value={quantity} onChange={e => setQuantity(e.target.value)} /></div><label className="check-field"><input type="checkbox" required /> I confirm that the details are correct and will bring the required documents.</label><div className="button-row"><Button secondary onClick={() => setStep(1)}>Back</Button><Button type="submit">{reschedule ? 'Confirm Reschedule' : 'Confirm & Book'}</Button></div></Card>}</form></>}{reschedule && <Button secondary onClick={() => {
      setReschedule(false);
      setStep(0);
    }}>Keep Existing Booking</Button>}{cancel && <Modal title="Cancel this booking?" onClose={() => setCancel(false)}><p>Token {active.id} will be cancelled and removed from the waiting queue.</p><div className="button-row"><Button onClick={() => {
          patch('tokens', active.id, {
            status: 'Cancelled'
          });
          notify('Booking Cancelled', `Token ${active.id} has been cancelled.`, 'Alerts');
          setCancel(false);
          toast('Booking cancelled. You can now book another token.');
        }}>Confirm Cancellation</Button><Button secondary onClick={() => setCancel(false)}>Keep Booking</Button></div></Modal>}</div>;
}
