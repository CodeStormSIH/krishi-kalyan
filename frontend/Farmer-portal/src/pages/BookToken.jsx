import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Building2 } from 'lucide-react';
import { Card, SectionTitle } from '@shared/components/UI';
import { Badge, Button, Field, Modal } from '@shared/components/Shared';
import { useStore, download } from '@shared/services/store';
import { backendApi } from '@shared/services/api';
import { dateISO } from '@shared/data/seed';
import DateCalendar from '../components/DateCalendar';
import { api } from '@shared/services/api';
import { useFarmer } from '@shared/context/FarmerContext';
const slots = ['09:00 AM - 10:00 AM', '10:30 AM - 11:30 AM', '12:00 PM - 01:00 PM', '01:30 PM - 02:30 PM', '04:00 PM - 05:00 PM'];
const slotStarts = ['09:00', '10:30', '12:00', '13:30', '16:00'];
export default function BookToken() {
  const {
    data,
    update,
    patch,
    notify,
    toast,
    session
  } = useStore();
  const { user, activeBooking, updateBookingState, syncActiveBooking } = useFarmer();
  const nav = useNavigate();
  let active = null;
  if (activeBooking && !['Cancelled', 'Completed', 'USED'].includes(activeBooking.status)) {
    active = activeBooking;
  }
  const [step, setStep] = useState(0),
    [search, setSearch] = useState(''),
    [center, setCenter] = useState(active?.center || data.centers?.[0]?.name || ""),
    [date, setDate] = useState(active?.date >= dateISO() ? active.date : dateISO()),
    [slot, setSlot] = useState(''),
    [crop, setCrop] = useState(active?.crop || 'Wheat'),
    [quantity, setQuantity] = useState(active?.quantity || 20),
    [transportMode, setTransportMode] = useState('OWN'),
    [isNonMotorized, setIsNonMotorized] = useState(false),
    [vehicleNumber, setVehicleNumber] = useState(active?.vehicleNumber || ''),
    [vehicleType, setVehicleType] = useState(active?.vehicleType || 'TRACTOR_TROLLEY'),
    [transitPermit, setTransitPermit] = useState(active?.transitPermit || ''),
    [reschedule, setReschedule] = useState(false),
    [cancel, setCancel] = useState(false),
    [success, setSuccess] = useState(null),
    [submitting, setSubmitting] = useState(false),
    [showOwnVehicleInput, setShowOwnVehicleInput] = useState(false),
    [ownVehicleInput, setOwnVehicleInput] = useState('');
  const selected = data.centers?.find(c => c.name === center);
  const availability = value => {
    const count = data.tokens.filter(t => t.center === center && t.date === date && t.slot === value && t.status !== 'Cancelled').length;
    return count >= 10 ? 'Unavailable' : count >= 7 ? 'Limited' : 'Available';
  };
  async function book(e) {
    e.preventDefault();
    if (!slot || !date) {
      toast('Please select date and slot');
      return;
    }
    setSubmitting(true);
    try {
      const slotTime = new Date(`${date}T${slotStarts[slots.indexOf(slot)] || '09:00'}:00`).toISOString();
      
      const resolvedVehicleNumber = transportMode === 'POOL' ? "" : (isNonMotorized ? "RICKSHAW / MANUAL" : (vehicleNumber || "BR-01-XX-1234"));
      const resolvedVehicleType = transportMode === 'POOL' ? "" : (isNonMotorized ? "MANUAL_CART" : (vehicleType || "TRACTOR"));
      const payload = {
        phone_number: user?.phone_number || session?.phone || data.profiles?.farmer?.phone || "",
        crop_name: crop,
        transport_mode: transportMode,
        vehicle_number: resolvedVehicleNumber,
        vehicle_type: resolvedVehicleType,
        quantity_quintal: Number(quantity),
        slot_time: slotTime,
        transit_permit: transitPermit || "",
        intended_mandi_id: selected?.id || "",
      };
      console.log("Submitting booking with payload:", payload);
      
      const response = reschedule
        ? await backendApi.farmer.rescheduleBooking(active?.id || active?.token_id, { new_slot_time: slotTime })
        : await backendApi.farmer.createBooking(payload);
      const record = {
        ...(reschedule ? active : {}),
        id: response.token_id,
        farmerId: 'KRN123456',
        phone: user?.phone_number || session?.phone || data.profiles?.farmer?.phone || "",
        name: data.profiles?.farmer?.name || user?.name || "Farmer",
        center,
        date,
        slot,
        crop,
        quantity: Number(quantity),
        vehicleNumber: resolvedVehicleNumber,
        vehicleType: resolvedVehicleType,
        transitPermit,
        channel: response.channel,
        qrImage: response.qr_image,
        variety: crop === 'Wheat' ? 'HD 2967' : crop === 'Paddy' ? 'Swarna' : 'Hybrid',
        rate: 2125,
        status: transportMode === 'POOL' ? 'PENDING_POOL' : 'In Queue',
        stage: 0,
        payment: 'Pending',
        position: data.tokens.length + 1,
        notes: reschedule && active ? active.notes : [],
        source: 'backend'
      };
      if (reschedule && active) patch('tokens', active.id || active.token_id, record);else update('tokens', rows => [record, ...rows]);
      
      if (updateBookingState) {
        updateBookingState({
          ...record,
          token_id: response.token_id,
          status: transportMode === 'POOL' ? "PENDING_POOL" : "CONFIRMED"
        });
      }
      
      notify(reschedule ? 'Booking Rescheduled' : 'Token Generated', `Your token ${record.id} is confirmed at ${center} on ${date}, ${slot}.`);
      setSuccess(record);
      setReschedule(false);
      setStep(0);
      if (!reschedule) nav('/farmer/dashboard');
    } catch (error) {
      toast(`Error: ${error.message || 'Booking failed'}`);
    } finally {
      setSubmitting(false);
    }
  }
  if (success) return <Card className="booking-success"><CheckCircle2 size={64} /><h2>Your booking is confirmed!</h2><p>Your procurement token</p><div className="token-big">{success.id || success.token_id}</div><p>{success.center || success.mandi_name} · {success.date || new Date(success.slot_time).toLocaleDateString()}</p><p>{success.slot || new Date(success.slot_time).toLocaleTimeString()}</p><p>{success.quantity || success.quantity_quintal} Quintal {success.crop || success.crop_name}</p><div className="button-row"><Button onClick={() => download('booking', success)}>Download Token</Button><Button secondary onClick={() => nav('/farmer/queue')}>View Queue</Button></div></Card>;
  return <div className="page">{active && !reschedule ? <Card className="current-booking"><div><Badge>{active.status}</Badge><h2>Active Token Slip</h2><p><b>Token ID:</b> {active.id || active.token_id}</p><p><b>Crop:</b> {active.crop || active.crop_name}</p><p><b>Quantity:</b> {active.quantity || active.quantity_quintal} Quintal</p><p><b>Transport Mode:</b> {active.transport_mode}</p>{active.status === 'PENDING_POOL' && <div style={{backgroundColor: '#fff3cd', color: '#856404', padding: '10px', borderRadius: '5px', marginTop: '10px'}}><b>Provisional Booking:</b> Tractor assignment in progress. Your Mandi Gate QR will unlock once a tractor is dispatched.</div>}{active.status === 'POOL_UNAVAILABLE' && <div style={{backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '5px', marginTop: '10px'}}><b>Notice:</b> Tractor could not be assigned for this slot.</div>}{active.status === 'CONFIRMED' && <div style={{marginTop: '10px'}}><img src={active.qr_image || active.qrImage} alt="QR Code" style={{maxWidth: '150px'}} /></div>}{active.transport_mode === 'POOL' && active.assigned_vehicle && <p><b>Assigned Tractor:</b> {active.assigned_vehicle}</p>}</div>{showOwnVehicleInput && <div style={{marginTop: '15px', padding: '15px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb'}}><Field label="Enter Your Vehicle Number" placeholder="BR01XX1234" value={ownVehicleInput} onChange={e => { if(e && e.target) setOwnVehicleInput(e.target.value.toUpperCase()) }} /><div className="button-row" style={{marginTop: '10px'}}><Button disabled={submitting || !ownVehicleInput} onClick={async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/bookings/${active.id || active.token_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CONFIRMED', transport_mode: 'OWN', vehicle_number: ownVehicleInput })
      });
      if (!res.ok) throw new Error('Failed to update transport mode');
      patch('tokens', active.id || active.token_id, { status: 'CONFIRMED', transport_mode: 'OWN', vehicleNumber: ownVehicleInput });
      if (updateBookingState) updateBookingState({ ...active, status: 'CONFIRMED', transport_mode: 'OWN', assigned_vehicle: ownVehicleInput });
      toast('Transport mode updated. Gate pass confirmed.');
      setShowOwnVehicleInput(false);
    } catch (error) {
      toast(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }}>Confirm Vehicle</Button><Button secondary onClick={() => setShowOwnVehicleInput(false)}>Cancel</Button></div></div>}{!showOwnVehicleInput && (active.status === 'POOL_UNAVAILABLE' ? <div className="button-row"><Button onClick={() => {
          setReschedule(true);
          setSlot(active.slot || '');
        }}>Reschedule Slot</Button><Button secondary onClick={() => setShowOwnVehicleInput(true)}>Bring Own Vehicle</Button></div> : <div className="button-row"><Button secondary onClick={() => download('token', active)}>Download Token</Button><Button onClick={() => {
          setReschedule(true);
          setSlot(active.slot || '');
        }}>Reschedule</Button><Button secondary onClick={() => setCancel(true)}>Cancel Booking</Button></div>)}</Card> : <><div className="booking-steps">{['Select Center', 'Select Date & Slot', 'Confirm & Book'].map((s, i) => <span className={i <= step ? 'selected' : ''} key={s}><b>{i + 1}</b> {s}</span>)}</div><form onSubmit={book}>{step === 0 && <Card><SectionTitle title="Select Procurement Center" /><Field label="Search centers" placeholder="Search by center or district" value={search} onChange={e => setSearch(e.target.value)} /><div className="center-list">{data.centers?.filter(c => c.status === 'Active' && ((c.name || "") + (c.district || "")).toLowerCase().includes(search.toLowerCase())).map(c => <label key={c.id} className="radio-row"><input type="radio" name="center" checked={center === c.name} onChange={() => {
                setCenter(c.name);
                setSlot('');
              }} /><Building2 size={24} /><div><b>{c.name}</b><small>{c.address}</small></div><span>{c.distance || 10} km</span></label>)}</div><div className="button-row"><Button onClick={() => setStep(1)}>Continue</Button></div></Card>}{step === 1 && <div className="grid two"><Card><SectionTitle title="Select Date" /><Field label="Procurement date" type="date" min={dateISO()} required value={date} onChange={e => {
              setDate(e.target.value);
              setSlot('');
            }} /><p className="muted">Bookings are available during center operating hours. Arrive 30 minutes before your slot.</p><DateCalendar value={date} min={dateISO()} onChange={value => {
              setDate(value);
              setSlot('');
            }} /></Card><Card><SectionTitle title="Available Time Slots" />{slots.map(s => <label className="slot" key={s}><input type="radio" name="slot" checked={slot === s} disabled={availability(s) === 'Unavailable'} onChange={() => setSlot(s)} /><b>{s}</b><Badge>{availability(s)}</Badge></label>)}<div className="button-row"><Button secondary onClick={() => setStep(0)}>Back</Button><Button disabled={!slot || !date || date < dateISO()} onClick={() => setStep(2)}>Continue</Button></div></Card></div>}{step === 2 && <Card><SectionTitle title="Confirm & Book" /><div className="detail-list"><p><span>Center</span><b>{center}</b></p><p><span>Date</span><b>{date}</b></p><p><span>Time slot</span><b>{slot}</b></p></div><div className="form-grid mt"><Field label="Crop" options={['Wheat', 'Paddy', 'Maize']} value={crop} onChange={e => setCrop(e.target.value)} /><Field label="Quantity (Quintal)" type="number" min="1" max="500" step="0.1" required value={quantity} onChange={e => setQuantity(e.target.value)} />{!reschedule && <><div className="mt-6" style={{ gridColumn: '1 / -1' }}><label className="block text-sm font-semibold text-gray-700 mb-3" style={{display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '12px'}}>Transport Option</label><div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px'}}><div onClick={() => setTransportMode("OWN")} className={`p-4 border rounded-xl cursor-pointer flex items-center gap-3 transition-all ${transportMode === "OWN" ? "border-green-600 bg-green-50 shadow-sm" : "border-gray-200 hover:border-gray-300"}`} style={{padding: '16px', border: transportMode === 'OWN' ? '2px solid #16a34a' : '1px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: transportMode === 'OWN' ? '#f0fdf4' : '#fff'}}><input type="radio" name="transport_mode" value="OWN" checked={transportMode === "OWN"} onChange={() => setTransportMode("OWN")} className="w-4 h-4 text-green-600" style={{accentColor: '#16a34a', width: '16px', height: '16px'}} /><div><p className="font-medium text-gray-900 text-sm" style={{margin: 0, fontWeight: 500, fontSize: '0.875rem'}}>Mere paas tractor hai</p><p className="text-xs text-gray-500" style={{margin: 0, fontSize: '0.75rem', color: '#6b7280'}}>Instant gate-pass confirmed</p></div></div><div onClick={() => setTransportMode("POOL")} className={`p-4 border rounded-xl cursor-pointer flex items-center gap-3 transition-all ${transportMode === "POOL" ? "border-green-600 bg-green-50 shadow-sm" : "border-gray-200 hover:border-gray-300"}`} style={{padding: '16px', border: transportMode === 'POOL' ? '2px solid #16a34a' : '1px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: transportMode === 'POOL' ? '#f0fdf4' : '#fff'}}><input type="radio" name="transport_mode" value="POOL" checked={transportMode === "POOL"} onChange={() => setTransportMode("POOL")} className="w-4 h-4 text-green-600" style={{accentColor: '#16a34a', width: '16px', height: '16px'}} /><div><p className="font-medium text-gray-900 text-sm" style={{margin: 0, fontWeight: 500, fontSize: '0.875rem'}}>Mujhe tractor pooling chahiye (Share)</p><p className="text-xs text-gray-500" style={{margin: 0, fontSize: '0.75rem', color: '#6b7280'}}>Mandi / Cluster assign karegi</p></div></div></div></div>{transportMode === 'OWN' && <><div style={{ gridColumn: '1 / -1', marginTop: '6px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}><label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0 }}><input type="checkbox" checked={isNonMotorized} onChange={e => { setIsNonMotorized(e.target.checked); if (e.target.checked) { setVehicleNumber('RICKSHAW / MANUAL'); setVehicleType('MANUAL_CART'); } else { setVehicleNumber(''); setVehicleType('TRACTOR_TROLLEY'); } }} style={{ width: '18px', height: '18px', accentColor: '#16a34a', cursor: 'pointer' }} /><div><span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Bina number plate wala wahan (Cycle-Rickshaw / Thela / Jugad)</span><p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>Is option se RTO number plate validation bypass ho jayegi.</p></div></label></div>{!isNonMotorized ? <><Field label="Vehicle number" required={transportMode === 'OWN' && !isNonMotorized} value={vehicleNumber} onChange={e => { if(e && e.target) setVehicleNumber(e.target.value.toUpperCase()) }} placeholder="BR01AB1234" /><Field label="Vehicle type" options={[{ value: 'TRACTOR_TROLLEY', label: 'Tractor trolley' }, { value: 'COMMERCIAL_TRUCK', label: 'Commercial truck' }]} value={vehicleType} onChange={e => { if(e && e.target) setVehicleType(e.target.value) }} />{vehicleType === 'COMMERCIAL_TRUCK' && <Field label="Transit permit" required={transportMode === 'OWN'} value={transitPermit} onChange={e => { if(e && e.target) setTransitPermit(e.target.value) }} />}</> : <div style={{ gridColumn: '1 / -1', padding: '10px 14px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '0.85rem' }}>ℹ️ <b>Wahan: Manual Cart / Rickshaw.</b> Gate aur weighbridge par entry QR code token se identify hogi.</div>}</>}</>}</div><label className="check-field"><input type="checkbox" required /> I confirm that the details are correct and will bring the required documents.</label><div className="button-row"><Button secondary disabled={submitting} onClick={() => setStep(1)}>Back</Button><Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : reschedule ? 'Confirm Reschedule' : 'Confirm & Book'}</Button></div></Card>}</form></>}{reschedule && <Button secondary onClick={() => {
      setReschedule(false);
      setStep(0);
    }}>Keep Existing Booking</Button>}{cancel && <Modal title="Cancel this booking?" onClose={() => setCancel(false)}><p>Token {active.id || active.token_id} will be cancelled and removed from the waiting queue.</p><div className="button-row"><Button disabled={submitting} onClick={async () => {
          setSubmitting(true);
          try {
            const res = await fetch(`http://localhost:8000/api/v1/bookings/${active.id || active.token_id}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'CANCELLED' })
            });
            if (!res.ok) throw new Error('Failed to cancel token');
            
            patch('tokens', active.id || active.token_id, { status: 'CANCELLED' });
            if (updateBookingState) updateBookingState(null);
            notify('Booking Cancelled', `Token ${active.id || active.token_id} has been cancelled.`, 'Alerts');
            setCancel(false);
            toast('Booking cancelled. You can now book another token.');
          } catch (error) {
            toast(`Error: ${error.message}`);
          } finally {
            setSubmitting(false);
          }
        }}>Confirm Cancellation</Button><Button secondary onClick={() => setCancel(false)}>Keep Booking</Button></div></Modal>}</div>;
}
