# backend/routers/gate.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter(prefix="/api/v1/gate", tags=["Gate & Weighment Module"])

@router.post("/verify", response_model=schemas.GateVerifyResponse)
def verify_gate_entry(req: schemas.GateVerifyRequest, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.token_id == req.token_id).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Invalid Token. Mandi entry blocked.")

    if booking.status in ["USED", "CANCELLED"]:
        return schemas.GateVerifyResponse(
            entry_allowed=False,
            channel=booking.channel,
            message=f"Access Denied: Token already {booking.status}.",
            assigned_bay="NONE"
        )

    # Status update to GATE_IN
    booking.status = "GATE_IN"
    db.commit()

    assigned_bay = "BAY-GREEN-1" if booking.channel == "GREEN" else "BAY-AMBER-AUDIT"

    return schemas.GateVerifyResponse(
        entry_allowed=True,
        channel=booking.channel,
        message=f"Entry Granted on {booking.channel} Channel.",
        assigned_bay=assigned_bay
    )