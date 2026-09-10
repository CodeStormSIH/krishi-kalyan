import React, { useState } from 'react';
import { Card } from '@shared/components/UI';
import { Button } from '@shared/components/Shared';

const MOCK_DRIVERS = [
  { id: 1, name: 'Ramesh Kumar', model: 'Mahindra 575 DI', capacity: 35, distance: 2.5, eta: 15, rating: 4.8 },
  { id: 2, name: 'Gurpreet Singh', model: 'John Deere 5050', capacity: 55, distance: 4.8, eta: 25, rating: 4.9 },
  { id: 3, name: 'Baldev Yadav', model: 'Swaraj 855 FE', capacity: 60, distance: 7.2, eta: 35, rating: 4.7 },
  { id: 4, name: 'Mandi Community Fleet', model: 'Sonalika 60', capacity: 70, distance: 10.0, eta: 45, rating: 5.0 },
];

export default function UberTractorPool({ quantity, onSelectDriver }) {
  const [selectedDriverId, setSelectedDriverId] = useState(null);

  const calculateFare = (distance) => {
    const base = 150;
    const qtyRate = quantity * 18;
    const distRate = distance * 22;
    return base + qtyRate + distRate;
  };

  const handleSelect = (driver) => {
    setSelectedDriverId(driver.id);
    const fare = calculateFare(driver.distance);
    onSelectDriver({
      driver_name: driver.name,
      assigned_vehicle: `${driver.model} (${driver.name})`,
      estimated_fare: fare
    });
  };

  return (
    <div className="mt-6">
      <h3 style={{fontSize: '1.2rem', fontWeight: '600', marginBottom: '10px'}}>Available Nearby Tractors</h3>
      <p style={{fontSize: '0.9rem', color: '#6b7280', marginBottom: '20px'}}>Select a tractor to pool with. Fares are dynamically calculated.</p>
      
      <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
        {MOCK_DRIVERS.map(driver => {
          const fare = calculateFare(driver.distance);
          const isSelected = selectedDriverId === driver.id;
          
          return (
            <div 
              key={driver.id}
              onClick={() => handleSelect(driver)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                border: isSelected ? '2px solid #16a34a' : '1px solid #e5e7eb',
                borderRadius: '12px',
                backgroundColor: isSelected ? '#f0fdf4' : '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <div>
                <h4 style={{fontWeight: '700', fontSize: '1.1rem', margin: '0'}}>{driver.name}</h4>
                <p style={{margin: '4px 0', color: '#4b5563', fontSize: '0.9rem'}}>{driver.model} • {driver.capacity} Qtl Cap.</p>
                <div style={{display: 'flex', gap: '12px', fontSize: '0.85rem', color: '#6b7280'}}>
                  <span>📍 {driver.distance} km away</span>
                  <span>⏱ {driver.eta} mins ETA</span>
                  <span>⭐ {driver.rating}</span>
                </div>
              </div>
              <div style={{textAlign: 'right'}}>
                <h3 style={{fontSize: '1.4rem', fontWeight: '800', margin: '0', color: '#16a34a'}}>₹{fare.toFixed(0)}</h3>
                <p style={{margin: '0', fontSize: '0.8rem', color: '#9ca3af'}}>Est. Fare</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
