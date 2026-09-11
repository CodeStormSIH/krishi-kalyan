import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Card, SectionTitle } from '@shared/components/UI';
import { Badge, Button, Field, DataTable } from '@shared/components/Shared';
import { backendApi } from '@shared/services/api';

export default function MandiDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
    
    // ML Polling
    fetchMlData();
    const interval = setInterval(fetchMlData, 30000);
    return () => clearInterval(interval);
  }, []);

  const [mlData, setMlData] = useState(null);

  const fetchMlData = async () => {
    try {
      const centerId = JSON.parse(localStorage.getItem('krishi_user') || '{}')?.center_id || 'MANDI-1';
      const [queueRes, arrivalsRes] = await Promise.all([
        fetch(`http://localhost:8000/api/v1/analytics/mandi/${centerId}/queue-intelligence`),
        fetch(`http://localhost:8000/api/v1/analytics/mandi/${centerId}/arrivals-forecast`)
      ]);
      
      if (queueRes.ok && arrivalsRes.ok) {
        const queueData = await queueRes.json();
        const arrivalsData = await arrivalsRes.json();
        setMlData({ ...queueData, arrivals: arrivalsData });
      }
    } catch (err) {
      console.error("Failed to fetch ML data", err);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/bookings');
      if (res.ok) {
        const data = await res.json();
        // Mock filtering to logged in center. In production, use user.mandi_id.
        setBookings(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (tokenId, newStatus) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/bookings/${tokenId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchBookings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page">
      <h2>Mandi Operational Dashboard</h2>
      
      {mlData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '1.5rem'}}>
          {/* Card 1: Congestion Gauge */}
          <Card style={{borderColor: mlData.metrics.status_color, borderTopWidth: '4px'}}>
            <p style={{fontSize: '0.875rem', color: '#4b5563', fontWeight: '600'}}>Congestion Gauge</p>
            <h3 style={{fontSize: '2rem', margin: '5px 0', color: mlData.metrics.status_color}}>{mlData.metrics.congestion_percentage}%</h3>
            <Badge style={{backgroundColor: mlData.metrics.status_color, color: 'white'}}>{mlData.metrics.congestion_level}</Badge>
          </Card>

          {/* Card 2: Predicted Wait Time */}
          <Card>
            <p style={{fontSize: '0.875rem', color: '#4b5563', fontWeight: '600'}}>Predicted Wait Time</p>
            <h3 style={{fontSize: '2rem', margin: '5px 0'}}>~{mlData.metrics.estimated_wait_minutes} Mins</h3>
            <p style={{fontSize: '0.75rem', color: '#6b7280'}}>Current average processing delay at gate & weighbridge</p>
          </Card>

          {/* Card 3: 4-Hour Forward Queue Forecast */}
          <Card>
            <p style={{fontSize: '0.875rem', color: '#4b5563', fontWeight: '600'}}>4-Hour Queue Forecast</p>
            <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '10px'}}>
              {mlData.forecast_4h.map((f, i) => (
                <div key={i} style={{textAlign: 'center', fontSize: '0.8rem'}}>
                  <div style={{fontWeight: 'bold'}}>{f.time_slot}</div>
                  <div style={{color: '#ef4444', fontWeight: 'bold'}}>{f.projected_queue_size} Q</div>
                  <div style={{color: '#6b7280'}}>{f.expected_wait_minutes}m</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Card 4: Net Expected Physical Inflow */}
          <Card>
            <p style={{fontSize: '0.875rem', color: '#4b5563', fontWeight: '600'}}>Net Expected Inflow</p>
            <h3 style={{fontSize: '2rem', margin: '5px 0'}}>{mlData.arrivals.data?.net_expected_arrivals || 0} Vehicles</h3>
            <Badge style={{backgroundColor: '#e5e7eb', color: '#374151'}}>-{mlData.arrivals.data?.predicted_no_shows || 0} predicted no-shows deducted</Badge>
          </Card>
        </div>
      )}
      
      <Card className="mt">
        <SectionTitle title="Procurement Queue" />
        {loading ? <p>Loading...</p> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Token ID</th>
                <th>Farmer Phone</th>
                <th>Crop</th>
                <th>Status</th>
                <th>Mode</th>
                <th>Assigned Vehicle</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.token_id}>
                  <td>{b.token_id}</td>
                  <td>{b.farmer_name}</td>
                  <td>{b.crop}</td>
                  <td><Badge>{b.status}</Badge></td>
                  <td>{b.transport_mode}</td>
                  <td>{b.assigned_vehicle || b.vehicle_number || (b.transport_mode === 'POOL' ? 'Pending Allocation' : '-')}</td>
                  <td>
                    {b.status === 'BOOKED' || b.status === 'CONFIRMED' ? (
                      <button className="linkish" onClick={() => updateStatus(b.token_id, 'GATE_IN')}>Mark Gate-In</button>
                    ) : b.status === 'GATE_IN' ? (
                      <button className="linkish" onClick={() => updateStatus(b.token_id, 'QUALITY_APPROVED')}>Approve Quality</button>
                    ) : b.status === 'QUALITY_APPROVED' ? (
                      <button className="linkish" onClick={() => updateStatus(b.token_id, 'WEIGHED')}>Record Weight</button>
                    ) : b.status === 'WEIGHED' ? (
                      <button className="linkish" onClick={() => updateStatus(b.token_id, 'COMPLETED')}>Complete</button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
