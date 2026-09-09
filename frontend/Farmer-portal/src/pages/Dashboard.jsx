import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Building2, UsersRound, MapPin, CalendarDays, Bell, ArrowRight, Download, Tractor } from 'lucide-react';
import { Card, SectionTitle } from '@shared/components/UI';
import { Badge, Button, Details, Instructions } from '@shared/components/Shared';
import { ProcurementProgress, MissingToken } from './FarmerTracking';
import { useFarmer } from '@shared/context/FarmerContext';

export default function Dashboard() {
  const { activeBooking: token, loading, user } = useFarmer();
  const [center, setCenter] = useState(null);

  if (loading) return <div className="farmer-dashboard">Loading...</div>;
  if (!token) return <MissingToken />;

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
          <SectionTitle title="Live Mandi Details" />
          <div className="place">
             <span className="round-icon purple"><Building2 /></span>
             <div>
                <b>{token?.mandi_name || 'Assigned Mandi'}</b>
                <small>{token?.mandi_district || 'District'}</small>
             </div>
          </div>
          <div className="mt" style={{ marginTop: '15px' }}>
             <small>Live Congestion: </small>
             <Badge className={token?.mandi_congestion === 'RED' ? 'danger' : token?.mandi_congestion === 'AMBER' ? 'warning' : 'success'}>
               {token?.mandi_congestion || 'GREEN'}
             </Badge>
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
