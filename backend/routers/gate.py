from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter(prefix="/api/v1/gate", tags=["Gate & Weighment Module"])

@router.post("/verify", response_model=schemas.GateVerifyResponse)
def verify_gate_entry(req: schemas.GateVerifyRequest, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.token_id == req.token_id).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Token number invalid hai.")

    # Anti-Fraud Rule 4: Single-Use Token Check (Duplicate entry block)
    if booking.status in ["GATE_IN", "USED"]:
        raise HTTPException(
            status_code=403,
            detail="ENTRY REJECTED: Token already use ho chuka hai. Re-entry allow nahi hai."
        )

    # Status update: Vehicle Mandi ke andar aagayi
    booking.status = "GATE_IN"
    db.commit()

    bay = "Bay #1 (Express Scale)" if booking.channel == "GREEN" else "Bay #4 (Audit Section)"

    return schemas.GateVerifyResponse(
        entry_allowed=True,
        channel=booking.channel,
        message=f"Vehicle {booking.vehicle_number} cleared for entry.",
        assigned_bay=bay
    )