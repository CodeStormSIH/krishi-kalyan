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
  const [selectedMandi, setSelectedMandi] = useState('ALL');

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
  const filteredBookings = selectedMandi === 'ALL' ? bookings : bookings.filter(b => b.intended_mandi_id === selectedMandi);

  const totalQuantity = filteredBookings.reduce((sum, b) => sum + (b.quantity || 0), 0);
  const activeTokens = filteredBookings.filter(b => !['COMPLETED', 'CANCELLED'].includes(b.status)).length;

  return (
    <div className="page">
      <h2>State Admin Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px'}}>
        <Card style={{backgroundColor: '#eff6ff', borderColor: '#bfdbfe'}}>
          <p style={{fontSize: '0.875rem', color: '#1e3a8a', fontWeight: '600'}}>Total Quantity</p>
          <h3 style={{fontSize: '2rem', margin: '5px 0'}}>{totalQuantity} Quintal</h3>
        </Card>
        <Card style={{backgroundColor: '#fdf4ff', borderColor: '#fbcfe8'}}>
          <p style={{fontSize: '0.875rem', color: '#831843', fontWeight: '600'}}>Active Tokens</p>
          <h3 style={{fontSize: '2rem', margin: '5px 0'}}>{activeTokens}</h3>
        </Card>
        <Card style={{backgroundColor: '#f0fdf4', borderColor: '#bbf7d0'}}>
          <p style={{fontSize: '0.875rem', color: '#14532d', fontWeight: '600'}}>Capacity Utilization</p>
          <h3 style={{fontSize: '2rem', margin: '5px 0'}}>76%</h3>
        </Card>
      </div>

      <div className="mt-6">
        <label style={{marginRight: '10px', fontWeight: '600'}}>Filter by Mandi:</label>
        <select value={selectedMandi} onChange={e => setSelectedMandi(e.target.value)} style={{padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}>
          <option value="ALL">All Mandis</option>
          <option value="MANDI-1">Mandi 1 (Patna)</option>
          <option value="MANDI-2">Mandi 2 (Gaya)</option>
        </select>
      </div>

      {pendingPool.length > 0 && (
        <Card className="mt-6">
          <SectionTitle title="Pending Pooling Requests" />
          <table className="data-table">
            <thead>
              <tr>
                <th>Token ID</th>
                <th>Farmer Phone</th>
                <th>Crop</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {pendingPool.map(b => (
                <tr key={b.token_id}>
                  <td>{b.token_id}</td>
                  <td>{b.farmer_name}</td>
                  <td>{b.crop}</td>
                  <td>{b.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="form-grid mt-4" style={{display: 'flex', gap: '10px', alignItems: 'flex-end'}}>
            <Field label="Assign Tractor / Vehicle Number" value={poolVehicle} onChange={(e) => setPoolVehicle(e.target.value.toUpperCase())} placeholder="BR01AB1234" />
            <Button onClick={handleAssignPool} disabled={!poolVehicle || assigning}>Assign & Dispatch</Button>
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <SectionTitle title="All Bookings Overview" />
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
              {filteredBookings.map(b => (
                <tr key={b.token_id}>
                  <td>{b.token_id}</td>
                  <td>{b.farmer_name}</td>
                  <td>{b.crop}</td>
                  <td><Badge>{b.status}</Badge></td>
                  <td>{b.transport_mode}</td>
                  <td>{b.assigned_vehicle || b.vehicle_number || (b.transport_mode === 'POOL' ? 'Pending Allocation' : '-')}</td>
                  <td>
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
