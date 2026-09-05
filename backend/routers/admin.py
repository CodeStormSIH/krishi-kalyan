from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import datetime, date
from typing import List
from database import get_db
import models, schemas

router = APIRouter(prefix="/api/v1/admin", tags=["Admin & Analytics Module"])

@router.get("/live-stats", response_model=schemas.MandiLiveStatsResponse)
def get_live_stats(db: Session = Depends(get_db)):
    today = date.today()
    
    # Base query for today's bookings based on slot_time
    today_bookings = db.query(models.Booking).filter(
        cast(models.Booking.slot_time, Date) == today
    ).all()
    
    total_bookings = len(today_bookings)
    green_count = sum(1 for b in today_bookings if b.channel == "GREEN")
    amber_count = sum(1 for b in today_bookings if b.channel == "AMBER")
    cancelled = sum(1 for b in today_bookings if b.status == "CANCELLED")
    
    # Vehicles currently inside (can be from any day, but typically today)
    vehicles_inside = db.query(models.Booking).filter(models.Booking.status == "GATE_IN").count()
    
    completed_today = [b for b in today_bookings if b.status == "USED" and b.entry_gate_in_time and b.exit_gate_time]
    
    completed_turnarounds = len(completed_today)
    
    total_minutes = 0
    for b in completed_today:
        duration = b.exit_gate_time - b.entry_gate_in_time
        total_minutes += duration.total_seconds() / 60.0
        
    avg_turnaround = 0.0
    if completed_turnarounds > 0:
        avg_turnaround = total_minutes / completed_turnarounds
        
    return schemas.MandiLiveStatsResponse(
        total_bookings_today=total_bookings,
        vehicles_inside_mandi=vehicles_inside,
        completed_turnarounds_today=completed_turnarounds,
        cancelled_today=cancelled,
        avg_turnaround_minutes=round(avg_turnaround, 2),
        green_channel_count=green_count,
        amber_channel_count=amber_count
    )

@router.get("/congestion-metrics", response_model=List[schemas.HourlyCongestionMetric])
def get_congestion_metrics(db: Session = Depends(get_db)):
    today = date.today()
    
    today_bookings = db.query(models.Booking).filter(
        cast(models.Booking.slot_time, Date) == today
    ).all()
    
    # Group by hour
    hourly_data = {}
    for i in range(24):
        hourly_data[f"{i:02d}:00"] = {"booked": 0, "entered": 0}
        
    for b in today_bookings:
        hour_str = b.slot_time.strftime("%H:00")
        if hour_str in hourly_data:
            hourly_data[hour_str]["booked"] += 1
            if b.entry_gate_in_time:
                hourly_data[hour_str]["entered"] += 1
                
    metrics = []
    for slot, counts in hourly_data.items():
        # Only include hours where there's some activity
        if counts["booked"] > 0 or counts["entered"] > 0:
            metrics.append(schemas.HourlyCongestionMetric(
                slot_hour=slot,
                booked_count=counts["booked"],
                entered_count=counts["entered"],
                capacity_limit=10
            ))
            
    # Sort by hour
    metrics.sort(key=lambda x: x.slot_hour)
    return metrics

@router.get("/active-vehicles", response_model=List[schemas.ActiveVehicleDetail])
def get_active_vehicles(db: Session = Depends(get_db)):
    active_bookings = db.query(models.Booking).filter(models.Booking.status == "GATE_IN").all()
    
    result = []
    now = datetime.utcnow()
    for b in active_bookings:
        dwell = 0
        if b.entry_gate_in_time:
            dwell = int((now - b.entry_gate_in_time).total_seconds() / 60)
            
        result.append(schemas.ActiveVehicleDetail(
            token_id=b.token_id,
            vehicle_number=b.vehicle_number,
            phone_number=b.phone_number,
            crop_name=b.crop_name,
            channel=b.channel,
            entry_time=b.entry_gate_in_time.isoformat() if b.entry_gate_in_time else "",
            dwell_minutes=dwell
        ))
        
    return result