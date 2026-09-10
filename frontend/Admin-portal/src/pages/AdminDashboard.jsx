import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Card, SectionTitle } from '@shared/components/UI';
import { Badge, Button, Field, DataTable } from '@shared/components/Shared';
import { backendApi } from '@shared/services/api';

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [poolVehicle, setPoolVehicle] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/bookings');
      if (res.ok) {
        const data = await res.json();
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

  const handleAssignPool = async () => {
    if (!poolVehicle) return;
    setAssigning(true);
    const poolRequests = bookings.filter(b => b.status === 'PENDING_POOL').map(b => b.token_id);
    
    if (poolRequests.length === 0) {
        setAssigning(false);
        return;
    }

    try {
      const res = await fetch('http://localhost:8000/api/v1/admin/assign-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_ids: poolRequests, vehicle_number: poolVehicle })
      });
      if (res.ok) {
        setPoolVehicle('');
        fetchBookings();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAssigning(false);
    }
  };

  const deleteBooking = async (tokenId) => {
    if (!window.confirm(`Are you sure you want to delete token ${tokenId}?`)) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/bookings/${tokenId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setBookings(prev => prev.filter(b => b.token_id !== tokenId));
      } else {
        console.error('Failed to delete token');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const pendingPool = bookings.filter(b => b.status === 'PENDING_POOL');

  return (
    <div className="page">
      <h2>Admin Dashboard</h2>
      
      {pendingPool.length > 0 && (
        <Card className="mt">
          <SectionTitle title="Pending Pooling Requests" />
          <table className="data-table">
            <thead>
              <tr>
                <th>Token ID</th>
                <th>Farmer Phone</th>
                <th>Crop</th>
                <th>Quantity</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingPool.map(b => (
                <tr key={b.token_id}>
                  <td>{b.token_id}</td>
                  <td>{b.farmer_name}</td>
                  <td>{b.crop}</td>
                  <td>{b.quantity}</td>
                  <td>
                    <button className="linkish" style={{color: 'red'}} onClick={() => updateStatus(b.token_id, 'POOL_UNAVAILABLE')}>Mark Unavailable</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="form-grid mt" style={{display: 'flex', gap: '10px', alignItems: 'flex-end'}}>
            <Field label="Assign Tractor / Vehicle Number" value={poolVehicle} onChange={(e) => setPoolVehicle(e.target.value.toUpperCase())} placeholder="BR01AB1234" />
            <Button onClick={handleAssignPool} disabled={!poolVehicle || assigning}>Assign & Dispatch</Button>
          </div>
        </Card>
      )}

      <Card className="mt">
        <SectionTitle title="All Bookings Pipeline" />
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
                    <button className="linkish" style={{color: 'red', marginLeft: '10px'}} onClick={() => deleteBooking(b.token_id)}>Delete</button>
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
