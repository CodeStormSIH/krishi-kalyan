import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { UsersRound, Clock, CheckCircle2, MapPin } from 'lucide-react';
import { Card, SectionTitle, Stepper, ProgressBar } from '@shared/components/UI';
import { Badge, Button, DataTable, Details, Instructions, Stats } from '@shared/components/Shared';
import { useStore, money } from '@shared/services/store';
import { api } from '@shared/services/api';

const STAGES = ['CONFIRMED', 'GATE_IN', 'GROSS_WEIGHED', 'READY_FOR_AUCTION', 'WEIGHMENT_VERIFIED', 'COMPLETED'];

import { useFarmer } from '@shared/context/FarmerContext';

export function useMyToken() {
  const { activeBooking: token, loading } = useFarmer();
  return { token, loading };
}

export function MissingToken() {
  const { data, getCenterCrowd } = useStore();
  const centers = data?.centers || [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <Card>
        <h2>No Active Mandi Pass</h2>
        <p>Book a procurement slot to track your real-time queue position, center wait time, and procurement stage.</p>
        <div className="button-row mt">
          <NavLink className="button" to="/farmer/book-token">Book Procurement Slot</NavLink>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Live Center Crowd &amp; Waiting Times (All Centers)" />
        <p className="muted" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
          Check real-time crowd levels and estimated wait times before visiting or booking your slot.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {centers.map(c => {
            const crowd = getCenterCrowd ? getCenterCrowd(c.name) : {
              congestionLevel: 'GREEN',
              congestionLabel: 'Low Crowd',
              waitingCount: 3,
              estimatedWaitMins: 15,
              activeVehicles: 4,
              maxCapacity: 50,
              capacityPct: 15
            };
            return (
              <div
                key={c.id}
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  backgroundColor: 'var(--card-sub-bg, #f8fafc)',
                  borderLeft: `4px solid ${crowd.congestionLevel === 'RED' ? '#ef4444' : crowd.congestionLevel === 'AMBER' ? '#f59e0b' : '#22c55e'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.95rem' }}>{c.name}</strong>
                  <Badge className={crowd.congestionLevel === 'RED' ? 'danger' : crowd.congestionLevel === 'AMBER' ? 'warning' : 'success'}>
                    {crowd.congestionLabel}
                  </Badge>
                </div>
                <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <small className="muted">{crowd.waitingCount} in queue</small>
                  <strong style={{ color: crowd.congestionLevel === 'RED' ? '#dc2626' : crowd.congestionLevel === 'AMBER' ? '#d97706' : '#16a34a' }}>
                    ⏱ ~{crowd.estimatedWaitMins}m wait
                  </strong>
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.4rem', color: 'var(--muted)' }}>
                  {crowd.activeVehicles} / {crowd.maxCapacity} vehicles ({crowd.capacityPct}% capacity)
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export function ProcurementProgress({ token }) {
  const active = STAGES.indexOf(token.status);
  return <Stepper steps={STAGES.map(label => ({ label: label.replace(/_/g, ' ') }))} active={active >= 0 ? active : 0} />;
}

export function QueueStatus() {
  const { activeBooking: token, loading, user } = useFarmer();
  const { data, getFarmerEstimate, getCenterCrowd } = useStore();

  if (loading && !token) return <div>Loading...</div>;
  if (!token) return <MissingToken />;

  const centerName = token?.mandi_name || token?.center || 'Samastipur Center';
  const estimate = getFarmerEstimate
    ? getFarmerEstimate(token?.token_id || user?.phone_number, centerName)
    : {
        hasToken: true,
        position: 2,
        farmersAhead: 1,
        estimatedWaitMins: 15,
        congestionLevel: 'GREEN',
        congestionLabel: 'Low Crowd',
        activeVehicles: 5,
        capacityPct: 20,
        statusMessage: '1 farmer ahead of you in queue.'
      };

  const crowd = getCenterCrowd ? getCenterCrowd(centerName) : {
    waitingCount: 4,
    activeVehicles: 6,
    maxCapacity: 50,
    capacityPct: 20,
    statusMessage: 'Smooth flow'
  };

  return (
    <div className="page">
      <Card className="mt" style={{ borderLeft: `6px solid ${estimate.congestionLevel === 'RED' ? '#ef4444' : estimate.congestionLevel === 'AMBER' ? '#f59e0b' : '#22c55e'}` }}>
        <SectionTitle title="Live Center Crowd &amp; Estimated Wait Time" />
        <div className="grid three mt">
          <div style={{ padding: '0.5rem 0' }}>
            <small className="muted" style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.75rem' }}>Assigned Center</small>
            <h3 style={{ margin: '0.25rem 0' }}>{centerName}</h3>
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>{token?.mandi_district || 'District Mandi'}</p>
            <div style={{ marginTop: '0.5rem' }}>
              <Badge className={estimate.congestionLevel === 'RED' ? 'danger' : estimate.congestionLevel === 'AMBER' ? 'warning' : 'success'}>
                ● {estimate.congestionLabel} ({crowd.capacityPct}% Capacity)
              </Badge>
            </div>
          </div>

          <div style={{ padding: '0.5rem 0', borderLeft: '1px solid var(--border-color, #e2e8f0)', paddingLeft: '1.25rem' }}>
            <small className="muted" style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.75rem' }}>Your Queue Position</small>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.25rem 0' }}>
              <strong style={{ fontSize: '2rem', color: '#16a34a' }}>
                {estimate.position ? `#${estimate.position}` : 'At Gate'}
              </strong>
              <small className="muted">
                {estimate.farmersAhead ? `(${estimate.farmersAhead} ahead)` : '(Next in line)'}
              </small>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              {crowd.waitingCount} total farmers waiting in queue
            </p>
          </div>

          <div style={{ padding: '0.5rem 0', borderLeft: '1px solid var(--border-color, #e2e8f0)', paddingLeft: '1.25rem' }}>
            <small className="muted" style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.75rem' }}>Estimated Wait Time</small>
            <strong style={{ fontSize: '2rem', color: estimate.congestionLevel === 'RED' ? '#dc2626' : estimate.congestionLevel === 'AMBER' ? '#d97706' : '#16a34a', display: 'block', margin: '0.25rem 0' }}>
              ⏱ ~{estimate.estimatedWaitMins} mins
            </strong>
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              Avg turnaround: ~5 mins per farmer
            </p>
          </div>
        </div>

        <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--sub-bg, #f0fdf4)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} style={{ color: '#16a34a' }} />
          <span style={{ fontSize: '0.88rem', color: '#166534' }}>
            <strong>Arrival Advisory:</strong> {estimate.statusMessage}
          </span>
        </div>
      </Card>

      {token?.pool_id && (
        <Card className="mt tint-blue">
          <SectionTitle title="Tractor Pool Details" />
          <p><strong>Pool ID:</strong> {token?.pool_id}</p>
          <Badge>{token?.is_pool_master ? 'Pool Leader' : 'Pool Member'}</Badge>
        </Card>
      )}

      <Card className="mt">
        <SectionTitle title="Procurement Queue Stages &amp; Wait Breakdown" />
        <ProcurementProgress token={token} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '1.25rem' }}>
          {[
            ['1. Gate Entry', '~2 mins', 'Scan QR at entry gate'],
            ['2. Verification', '~5 mins', 'Farmer ID & crop verification'],
            ['3. Quality Assaying', '~6 mins', 'Moisture & foreign matter check'],
            ['4. Weighbridge', '~4 mins', 'Gross & tare weight recording'],
            ['5. Payment Order', '~3 mins', 'Direct DBT initiation'],
          ].map(([stageName, timeEst, desc]) => (
            <div key={stageName} style={{ padding: '0.75rem', borderRadius: '6px', background: 'var(--card-sub-bg, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)' }}>
              <b style={{ fontSize: '0.85rem', display: 'block' }}>{stageName}</b>
              <strong style={{ color: '#16a34a', fontSize: '0.95rem' }}>{timeEst}</strong>
              <small className="muted" style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.25rem' }}>{desc}</small>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function ProcurementStatus() {
  const { activeBooking: booking, loading } = useFarmer();
  
  if (loading && !booking) return <div>Loading...</div>;
  if (!booking) return (
    <Card>
      <h2>No Active Procurement Record</h2>
      <p>No active procurement record found for this session. Please book a token first.</p>
      <NavLink className="button" to="/farmer/book-token">Book Token</NavLink>
    </Card>
  );

  const rate = 2275; // Generic base rate
  const calcWeight = booking?.net_weight_quintal || booking?.quantity_quintal || 0;
  const calculatedTotal = calcWeight * rate;
  
  const isPaymentInitiated = booking?.status === 'COMPLETED' || booking?.status === 'USED';

  return (
    <div>
      <Card className="mt"><SectionTitle title="Procurement Progress" /><ProcurementProgress token={booking} /></Card>

      <div className="grid two mt">
        <Card>
          <SectionTitle title="Crop Information" />
          <div className="detail-grid">
            <div><small>Commodity</small><b>{booking?.crop_name || 'N/A'}</b></div>
            <div><small>Declared Quantity</small><b>{booking?.quantity_quintal ? booking.quantity_quintal + " Quintals" : 'N/A'}</b></div>
            <div><small>Assigned Center / Mandi</small><b>{booking?.intended_mandi_id || "Khanna Main Grain Yard"}</b></div>
            <div><small>Token Reference</small><b>{booking?.token_id || 'N/A'}</b></div>
            <div><small>Vehicle</small><b>{booking?.vehicle_number || 'N/A'}</b></div>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Weighbridge &amp; Net Weight Details" />
          <div className="detail-grid">
            <div><small>Gross Weight</small><b>{booking?.gross_weight_quintal ? booking.gross_weight_quintal + " Qtl" : "Pending Weighment"}</b></div>
            <div><small>Tare Weight</small><b>{booking?.tare_weight_quintal ? booking.tare_weight_quintal + " Qtl" : "Pending Post-Unloading"}</b></div>
            <div><small>Net Weight</small><b>{booking?.net_weight_quintal ? booking.net_weight_quintal + " Qtl" : (booking?.quantity_quintal ? booking.quantity_quintal + " Qtl (Declared)" : "N/A")}</b></div>
            <div><small>Discrepancy / Audit Flag</small>
              {booking?.fraud_flag ? (
                <Badge className="danger">Flagged for Audit (&gt;15% variance)</Badge>
              ) : (
                <Badge className="success">Verified</Badge>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid two mt">
        <Card>
          <SectionTitle title="Assaying &amp; Quality Parameters" />
          <div className="detail-grid">
            <div><small>Moisture Content</small><b>{booking?.moisture_percent ? booking.moisture_percent + "%" : "Awaiting Quality Lab"}</b></div>
            <div><small>Certified Grade</small><b>{booking?.crop_grade || "Under Inspection"}</b></div>
            <div><small>Allotted Floor / Bay</small><b>{booking?.assigned_auction_bay || "Pending Inspection"}</b></div>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Commercial / Payment Estimate" />
          <div className="detail-grid">
            <div><small>Calculated Total</small><b>{money(calculatedTotal)}</b> <small>(at ₹{rate}/Qtl MSP)</small></div>
            <div><small>Payment Status</small><b>{isPaymentInitiated ? "Payment Initiated / Processing via DBT" : "Pending Procurement Completion"}</b></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function PaymentStatus() { return <div>Payment tracking not yet dynamically available.</div>; }
export function History() { return <div>History tracking not yet dynamically available.</div>; }
