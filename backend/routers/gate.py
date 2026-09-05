from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
import models, schemas

router = APIRouter(prefix="/api/v1/gate", tags=["Gate & Weighment Module"])

@router.post("/scan", response_model=schemas.GateScanResponse)
def scan_gate_pass(req: schemas.GateScanRequest, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.token_id == req.token_id).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Invalid Token. Mandi entry blocked.")

    valid = True
    message = "Token is valid."
    requires_transit_verification = False
    
    if booking.status in ["USED", "CANCELLED"]:
        valid = False
        message = f"Access Denied: Token already {booking.status}."
    
    assigned_bay = "BAY-GREEN-1" if booking.channel == "GREEN" else "BAY-AMBER-AUDIT"
    
    if booking.channel == "GREEN":
        requires_transit_verification = True

    return schemas.GateScanResponse(
        valid=valid,
        token_id=booking.token_id,
        phone_number=booking.phone_number,
        crop_name=booking.crop_name,
        vehicle_number=booking.vehicle_number,
        vehicle_type=booking.vehicle_type,
        quantity_quintal=booking.quantity_quintal,
        channel=booking.channel,
        status=booking.status,
        assigned_bay=assigned_bay,
        requires_transit_verification=requires_transit_verification,
        transit_permit=booking.transit_permit,
        message=message
    )

@router.post("/entry", response_model=schemas.GateActionResponse)
def log_gate_entry(req: schemas.GateEntryLogRequest, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.token_id == req.token_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Invalid Token")
        
    if booking.status not in ["CONFIRMED", "RESCHEDULED"]:
        raise HTTPException(status_code=400, detail=f"Cannot log entry. Status is {booking.status}")

    booking.status = "GATE_IN"
    booking.entry_gate_in_time = datetime.utcnow()
    booking.vehicle_entry_operator = req.operator_name
    booking.manual_entry_gate = req.gate_number
    booking.is_manual_gate_in = req.is_manual
    booking.vehicle_in_status = "SCANNED"
    
    # Multi-Mandi handling
    booking.actual_mandi_id = req.mandi_id
    if booking.intended_mandi_id and booking.intended_mandi_id != req.mandi_id:
        booking.is_rerouted = True
        
    mandi = db.query(models.Mandi).filter(models.Mandi.id == req.mandi_id).first()
    if mandi:
        mandi.current_active_vehicles += 1
    
    db.commit()
    return schemas.GateActionResponse(
        status="success",
        token_id=booking.token_id,
        message="Vehicle entry logged successfully."
    )

@router.post("/transit/verify", response_model=schemas.GateActionResponse)
def verify_transit(req: schemas.TransitVerifyRequest, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.token_id == req.token_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Invalid Token")
        
    if booking.channel != "GREEN":
        raise HTTPException(status_code=400, detail="Transit verification only applicable for GREEN channel.")
        
    booking.is_transit_verified = True
    booking.transit_verified_at = datetime.utcnow()
    booking.verified_by = req.verified_by
    if req.remarks:
        booking.audit_remark = req.remarks
        
    db.commit()
    return schemas.GateActionResponse(
        status="success",
        token_id=booking.token_id,
        message="Transit verified successfully."
    )

@router.post("/exit", response_model=schemas.GateActionResponse)
def log_gate_exit(req: schemas.GateExitLogRequest, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.token_id == req.token_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Invalid Token")
        
    if booking.status != "GATE_IN":
        raise HTTPException(status_code=400, detail=f"Cannot log exit. Current status is {booking.status}")
        
    booking.status = "USED"
    booking.exit_gate_time = datetime.utcnow()
    booking.vehicle_exit_operator = req.operator_name
    booking.manual_exit_gate = req.gate_number
    booking.is_manual_gate_out = req.is_manual
    booking.exit_gate_status = "SCANNED"
    booking.vehicle_out_status = "SCANNED"
    
    total_time_str = None
    if booking.entry_gate_in_time:
        duration = booking.exit_gate_time - booking.entry_gate_in_time
        total_seconds = int(duration.total_seconds())
        hours, remainder = divmod(total_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        total_time_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        booking.total_vehicle_time = total_time_str
        
    if booking.actual_mandi_id:
        mandi = db.query(models.Mandi).filter(models.Mandi.id == booking.actual_mandi_id).first()
        if mandi and mandi.current_active_vehicles > 0:
            mandi.current_active_vehicles -= 1
            
    db.commit()
    return schemas.GateActionResponse(
        status="success",
        token_id=booking.token_id,
        message="Vehicle exit logged successfully.",
        total_vehicle_time=total_time_str
    )