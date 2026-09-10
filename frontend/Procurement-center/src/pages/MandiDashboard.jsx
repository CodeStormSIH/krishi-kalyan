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
  }, []);

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
