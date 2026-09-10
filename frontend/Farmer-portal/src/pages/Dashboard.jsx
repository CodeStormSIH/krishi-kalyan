import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Building2, UsersRound, MapPin, CalendarDays, Bell, ArrowRight, Download, Tractor, Clock } from 'lucide-react';
import { Card, SectionTitle } from '@shared/components/UI';
import { Badge, Button, Details, Instructions } from '@shared/components/Shared';
import { ProcurementProgress, MissingToken } from './FarmerTracking';
import { useFarmer } from '@shared/context/FarmerContext';
import { useStore } from '@shared/services/store';

export default function Dashboard() {
  const { activeBooking: token, loading, user } = useFarmer();
  const { data, getFarmerEstimate, getCenterCrowd } = useStore();
  const [center, setCenter] = useState(null);

  if (loading) return <div className="farmer-dashboard">Loading...</div>;
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
        statusMessage: '1 farmer ahead in queue.'
      };

  return (
    <div className="farmer-dashboard">
      <div className="grid four dashboard-top">
        <Card className="tint-green">
          <SectionTitle title="My Current Token" />
          <div className="row-between"><span>Token Number</span><Badge>{token?.status}</Badge></div>
          <div className="token-big">{token?.token_id}</div>
          <div className="booking-meta">
            <div><small>Date</small><b>{token?.slot_time ? new Date(token.slot_time).toLocaleDateString() : ''}</b></div>
            <div><small>Time Slot</small><b>{token?.slot_time ? new Date(token.slot_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</b></div>
          </div>
          <NavLink className="outline-btn green" to="/farmer/book-token">View Token Details</NavLink>
        </Card>
        
        <Card className="tint-blue">
          <SectionTitle title="Vehicle & Transport" />
          <div className="place">
            <span className="round-icon blue"><Tractor /></span>
            <div><b>{token?.vehicle_number}</b><small>{token?.vehicle_type}</small></div>
          </div>
          {token?.pool_id && (
             <div className="mt" style={{ marginTop: '15px' }}>
                <Badge>{token.is_pool_master ? 'Pool Leader' : 'Pool Member'}</Badge>
                <small style={{display: 'block', marginTop: '5px'}}>ID: {token.pool_id}</small>
             </div>
          )}
        </Card>

        <Card className="tint-purple">
          <SectionTitle title="Center Crowd &amp; Wait Time" />
          <div className="place">
             <span className="round-icon purple"><Clock /></span>
             <div>
                <b>{centerName}</b>
                <small>{estimate.congestionLabel} · {estimate.activeVehicles} in center</small>
             </div>
          </div>
          <div className="mt" style={{ marginTop: '10px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Estimated Wait:</span>
                <strong style={{ fontSize: '1.2rem', color: estimate.congestionLevel === 'RED' ? '#dc2626' : estimate.congestionLevel === 'AMBER' ? '#d97706' : '#16a34a' }}>
                  ⏱ ~{estimate.estimatedWaitMins} mins
                </strong>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--muted)' }}>Queue Position:</span>
                <Badge className={estimate.position === 1 ? 'success' : 'neutral'}>
                  {estimate.position ? `#${estimate.position} in line` : 'At Verification Bay'}
                </Badge>
             </div>
             <div style={{ fontSize: '0.75rem', marginTop: '6px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{estimate.farmersAhead ? `${estimate.farmersAhead} ahead of you` : 'Next to be called'}</span>
                <Badge className={estimate.congestionLevel === 'RED' ? 'danger' : estimate.congestionLevel === 'AMBER' ? 'warning' : 'success'}>
                  {estimate.congestionLevel}
                </Badge>
             </div>
          </div>
        </Card>

        <Card className="tint-orange">
           <SectionTitle title="Crop Assaying" />
           {token?.moisture_percent ? (
              <div>
                 <h3>{token?.crop_grade} Grade</h3>
                 <p>Moisture: {token.moisture_percent}%</p>
                 <small>Bay: {token?.assigned_auction_bay || 'N/A'}</small>
              </div>
           ) : (
              <p>Quality check pending at the lab.</p>
           )}
        </Card>
      </div>

      <div className="farmer-body">
        <div className="dashboard-main">
          <Card>
            <SectionTitle title="Procurement Progress" />
            <ProcurementProgress token={token} />
          </Card>
          <div className="grid two mt">
            <Card>
              <SectionTitle title="Procurement Details" />
              <div className="detail-grid">
                <div><small>Crop Type</small><b>{token?.crop_name}</b></div>
                <div><small>Expected Quantity</small><b>{token?.quantity_quintal} Quintal</b></div>
                <div><small>Verified Net Weight</small><b>{token?.net_weight_quintal ? token.net_weight_quintal + ' Quintal' : 'Pending'}</b></div>
                <div><small>Channel</small><b>{token?.channel}</b></div>
              </div>
            </Card>
            <Instructions />
          </div>
        </div>
      </div>
    </div>
  );
}
