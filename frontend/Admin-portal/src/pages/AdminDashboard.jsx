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

  const [centers, setCenters] = useState([]);
  const [showCenterModal, setShowCenterModal] = useState(false);
  const [centerForm, setCenterForm] = useState({
    center_name: '', location: '', capacity_quintals: '', operator_phone: '', operator_name: '', password: ''
  });
  const [centerCreating, setCenterCreating] = useState(false);

  // Simulation states
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.3);
  const [simData, setSimData] = useState(null);

  useEffect(() => {
    fetchBookings();
    fetchCenters();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      runSimulation(surgeMultiplier);
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [surgeMultiplier, centers]);

  const runSimulation = async (surge) => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/analytics/admin/load-balance-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surge_multiplier: surge })
      });
      if (res.ok) {
        const data = await res.json();
        setSimData(data.simulation);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCenters = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/admin/centers');
      if (res.ok) {
        setCenters(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

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

  const handleCreateCenter = async (e) => {
    e.preventDefault();
    setCenterCreating(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/admin/centers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(centerForm)
      });
      if (res.ok) {
        alert('Center & Operator created successfully');
        setShowCenterModal(false);
        setCenterForm({ center_name: '', location: '', capacity_quintals: '', operator_phone: '', operator_name: '', password: '' });
        fetchCenters();
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to create center');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCenterCreating(false);
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

      <Card className="mt-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionTitle title="Mandi Centers & Staff" />
          <Button onClick={() => setShowCenterModal(true)} style={{ background: '#16a34a' }}>+ Create New Mandi Center</Button>
        </div>
        
        <table className="data-table mt-4">
          <thead>
            <tr>
              <th>Center ID</th>
              <th>Mandi Name</th>
              <th>District</th>
              <th>Assigned Operator</th>
              <th>Active Capacity</th>
            </tr>
          </thead>
          <tbody>
            {centers.map(c => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.name}</td>
                <td>{c.location}</td>
                <td>{c.operator_name} ({c.operator_phone})</td>
                <td>{c.active_vehicles} / {c.capacity_quintals}</td>
              </tr>
            ))}
            {centers.length === 0 && <tr><td colSpan="5" style={{textAlign: 'center'}}>No centers registered yet.</td></tr>}
          </tbody>
        </table>
      </Card>

      {showCenterModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card style={{ zIndex: 1001, background: 'var(--surface)', margin: '1rem', width: '100%', maxWidth: '500px' }}>
            <SectionTitle title="Create New Mandi Center" />
            <form onSubmit={handleCreateCenter}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Field label="Mandi Name" required value={centerForm.center_name} onChange={e => setCenterForm({...centerForm, center_name: e.target.value})} />
                <Field label="Location / District" required value={centerForm.location} onChange={e => setCenterForm({...centerForm, location: e.target.value})} />
                <Field label="Total Capacity (Quintals)" type="number" required value={centerForm.capacity_quintals} onChange={e => setCenterForm({...centerForm, capacity_quintals: e.target.value})} />
                <Field label="Operator Phone" type="tel" required value={centerForm.operator_phone} onChange={e => setCenterForm({...centerForm, operator_phone: e.target.value})} />
                <Field label="Operator Name" required value={centerForm.operator_name} onChange={e => setCenterForm({...centerForm, operator_name: e.target.value})} />
                <Field label="Operator Password" type="password" required minLength={8} value={centerForm.password} onChange={e => setCenterForm({...centerForm, password: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                <Button type="submit" disabled={centerCreating}>{centerCreating ? 'Creating...' : 'Submit'}</Button>
                <Button type="button" onClick={() => setShowCenterModal(false)} className="outline">Cancel</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <label style={{marginRight: '10px', fontWeight: '600'}}>Filter by Mandi:</label>
        <select value={selectedMandi} onChange={e => setSelectedMandi(e.target.value)} style={{padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}>
          <option value="ALL">All Mandis</option>
          {centers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.location})</option>)}
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

      <Card className="mt-6" style={{background: '#f8fafc', borderColor: '#cbd5e1'}}>
        <SectionTitle title="🌾 Dynamic Harvest Surge & Network Load Balancer" />
        <div style={{display: 'flex', alignItems: 'center', gap: '20px', marginTop: '10px'}}>
          <div style={{flex: 1}}>
            <label style={{fontWeight: '600', display: 'block', marginBottom: '8px'}}>Surge Multiplier (Simulated Peak Traffic)</label>
            <input 
              type="range" 
              min="1.0" 
              max="2.5" 
              step="0.1" 
              value={surgeMultiplier} 
              onChange={e => setSurgeMultiplier(parseFloat(e.target.value))} 
              style={{width: '100%'}}
            />
          </div>
          <div style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', minWidth: '80px', textAlign: 'center'}}>
            {surgeMultiplier.toFixed(1)}x
          </div>
          <div style={{color: '#64748b', fontStyle: 'italic', flex: 2}}>
            Simulating {((surgeMultiplier - 1) * 100).toFixed(0)}% additional harvest volume across the network.
          </div>
        </div>

        {simData && simData.total_diverted_overflow > 0 && (
          <div style={{background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '12px', borderRadius: '6px', marginTop: '16px', fontWeight: '500'}}>
            ⚠️ Bottleneck Alert: {simData.total_diverted_overflow} excess Quintals/Vehicles detected across network. 
            Automated recommendation: {simData.recommended_redirection}
          </div>
        )}

        {simData && (
          <table className="data-table mt-4" style={{fontSize: '0.875rem'}}>
            <thead>
              <tr>
                <th>Mandi Name</th>
                <th>Base Load</th>
                <th>Simulated Surge Load</th>
                <th>Max Capacity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {simData.centers.map((c, i) => (
                <tr key={i} style={c.bottleneck ? {backgroundColor: '#fee2e2'} : {}}>
                  <td style={{fontWeight: 'bold'}}>{c.center_name}</td>
                  <td>{c.base_load}</td>
                  <td style={{fontWeight: 'bold', color: c.bottleneck ? '#b91c1c' : 'inherit'}}>{c.simulated_load}</td>
                  <td>{c.max_capacity}</td>
                  <td>
                    {c.bottleneck ? (
                      <Badge style={{backgroundColor: '#ef4444', color: 'white'}}>BOTTLENECK</Badge>
                    ) : (
                      <Badge style={{backgroundColor: '#10b981', color: 'white'}}>OPTIMAL</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

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
