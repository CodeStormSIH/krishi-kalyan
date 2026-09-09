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
  return (
    <Card>
      <h2>No Active Mandi Pass</h2>
      <p>Book a procurement slot to track your queue, procurement and payment.</p>
      <NavLink className="button" to="/farmer/book-token">Book Slot</NavLink>
    </Card>
  );
}

export function ProcurementProgress({ token }) {
  const active = STAGES.indexOf(token.status);
  return <Stepper steps={STAGES.map(label => ({ label: label.replace(/_/g, ' ') }))} active={active >= 0 ? active : 0} />;
}

export function QueueStatus() {
  const { activeBooking: token, loading } = useFarmer();
  if (loading && !token) return <div>Loading...</div>;
  if (!token) return <MissingToken />;
  
  return (
    <div className="page">
      <Card className="mt">
        <SectionTitle title="Live Mandi Details" />
        <div className="grid two">
          <div>
            <h3>{token?.mandi_name || 'Assigned Mandi'}</h3>
            <p>{token?.mandi_district || 'District'}</p>
          </div>
          <div>
            <Badge className={token?.mandi_congestion === 'RED' ? 'danger' : token?.mandi_congestion === 'AMBER' ? 'warning' : 'success'}>
              Congestion: {token?.mandi_congestion || 'GREEN'}
            </Badge>
          </div>
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
        <SectionTitle title="Queue Progress" />
        <ProcurementProgress token={token} />
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
