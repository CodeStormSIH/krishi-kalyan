from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from database import get_db
import models
from services.ml_engine import (
    calculate_mandi_congestion_and_wait,
    forecast_future_queue,
    predict_no_show_risk,
    forecast_hourly_arrivals,
    recommend_optimal_mandi_and_slot,
    simulate_dynamic_load_balancing
)

router = APIRouter(prefix="/api/v1/analytics", tags=["Mandi Intelligence"])

@router.get("/mandi/{center_id}/queue-intelligence")
def get_mandi_queue_intelligence(center_id: str, db: Session = Depends(get_db)):
    # 1. Query active vehicles in queue
    active_tokens = db.query(models.Booking).filter(
        models.Booking.intended_mandi_id == center_id,
        models.Booking.status.in_(["CONFIRMED", "GATE_IN", "QUALITY_APPROVED"])
    ).all()
    
    active_count = len(active_tokens)
    
    # 2. Query center capacity
    center = db.query(models.Mandi).filter(models.Mandi.id == center_id).first()
    holding_cap = getattr(center, "max_capacity", 40) or 40

    # 3. Calculate congestion & wait times
    queue_metrics = calculate_mandi_congestion_and_wait(
        active_vehicles_count=active_count,
        weighbridge_count=2,
        service_rate_per_hour=5.0,
        holding_capacity=holding_cap
    )

    # 4. Next 4-Hour Queue Forecast (mocked incoming distribution based on active load)
    mock_hourly_incoming = [max(2, active_count + 4), max(1, active_count + 1), max(3, active_count + 6), 3]
    forecast = forecast_future_queue(mock_hourly_incoming, weighbridge_count=2)

    return {
        "status": "success",
        "center_id": center_id,
        "metrics": queue_metrics,
        "forecast_4h": forecast
    }

@router.get("/mandi/{center_id}/arrivals-forecast")
def get_arrivals_forecast(center_id: str, db: Session = Depends(get_db)):
    bookings = db.query(models.Booking).filter(
        models.Booking.intended_mandi_id == center_id,
        models.Booking.status == "CONFIRMED"
    ).all()

    tokens_metadata = [
        {
            "distance_km": 5.5,
            "transport_mode": getattr(b, "transport_mode", "OWN") or "OWN",
            "slot_hour": 10
        }
        for b in bookings
    ]

    arrival_data = forecast_hourly_arrivals(tokens_metadata)
    return {"status": "success", "center_id": center_id, "data": arrival_data}

@router.post("/admin/load-balance-simulation")
def run_simulation(payload: Dict[str, float], db: Session = Depends(get_db)):
    surge = payload.get("surge_multiplier", 1.3)
    centers = db.query(models.Mandi).all()

    centers_data = [
        {
            "name": c.name or f"Center {c.id}",
            "active_load": db.query(models.Booking).filter(
                models.Booking.intended_mandi_id == str(c.id),
                models.Booking.status.in_(["CONFIRMED", "GATE_IN"])
            ).count() or 18,
            "capacity": getattr(c, "max_capacity", 40) or 40
        }
        for c in centers
    ] or [
        {"name": "Muzaffarpur Main Hub", "active_load": 28, "capacity": 35},
        {"name": "Sitamarhi Sub-Mandi", "active_load": 12, "capacity": 30},
        {"name": "Hajipur Center", "active_load": 22, "capacity": 25}
    ]

    sim_result = simulate_dynamic_load_balancing(centers_data, surge_multiplier=surge)
    return {"status": "success", "simulation": sim_result}
