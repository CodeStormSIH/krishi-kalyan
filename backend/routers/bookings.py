from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas

router = APIRouter(prefix="/api/v1", tags=["Bookings"])

@router.get("/bookings")
def get_all_bookings(db: Session = Depends(get_db)):
    bookings = db.query(models.Booking).filter(models.Booking.status != 'CANCELLED').order_by(models.Booking.created_at.desc()).all()
    # We can use schemas.ActiveBookingResponse or return raw dicts/orm objects.
    # We will map to a custom dict to match what frontend needs.
    result = []
    for b in bookings:
        result.append({
            "token_id": b.token_id,
            "farmer_name": b.phone_number, # Ideally we would join with users to get name, but phone is used heavily
            "crop": b.crop_name,
            "status": b.status,
            "transport_mode": b.transport_mode,
            "vehicle_number": b.vehicle_number,
            "assigned_vehicle": b.assigned_vehicle,
            "quantity": b.quantity_quintal,
            "created_at": b.created_at
        })
    return result

@router.delete("/bookings/{token_id}")
def delete_booking(token_id: str, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.token_id == token_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Token not found.")
        
    db.delete(booking)
    db.commit()
    return {"status": "success", "message": "Booking deleted successfully."}

@router.post("/admin/assign-pool")
def assign_pool(req: schemas.AssignPoolRequest, db: Session = Depends(get_db)):
    bookings = db.query(models.Booking).filter(models.Booking.token_id.in_(req.token_ids)).all()
    
    if not bookings:
        raise HTTPException(status_code=404, detail="No matching bookings found.")
        
    for b in bookings:
        b.assigned_vehicle = req.vehicle_number
        if b.status in ["BOOKED", "PENDING_POOL"]:
            b.status = "CONFIRMED"
            
    db.commit()
    return {"status": "success", "message": "Tractor assigned successfully", "vehicle": req.vehicle_number}

@router.patch("/bookings/{token_id}/status")
def update_booking_status(token_id: str, req: schemas.StatusUpdateRequest, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.token_id == token_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Token not found.")
        
    booking.status = req.status
    if req.transport_mode is not None:
        booking.transport_mode = req.transport_mode
    if req.vehicle_number is not None:
        booking.vehicle_number = req.vehicle_number
        
    db.commit()
    return {"status": "success", "token_id": token_id, "new_status": req.status}
