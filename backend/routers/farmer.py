import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter(prefix="/api/v1/booking", tags=["Farmer Module"])

@router.post("/create", response_model=schemas.BookingResponse)
def create_booking(req: schemas.BookingCreateRequest, db: Session = Depends(get_db)):
    # Anti-Fraud Rule 1: One Phone = One Active Token
    active_token = db.query(models.Booking).filter(
        models.Booking.phone_number == req.phone_number,
        models.Booking.status.in_(["CONFIRMED", "GATE_IN"])
    ).first()

    if active_token:
        raise HTTPException(
            status_code=400,
            detail=f"Active token '{active_token.token_id}' pehle se maujood hai. Naya slot book karne ke liye ise complete karein."
        )

    # Anti-Fraud Rule 2: Commercial Truck ke liye Transit Permit zaroori hai
    v_type = req.vehicle_type.upper()
    if v_type == "COMMERCIAL_TRUCK" and not req.transit_permit:
        raise HTTPException(
            status_code=403,
            detail="Commercial heavy trucks ke liye state e-Way / transit permit number mandatory hai."
        )

    # Anti-Fraud Rule 3: Volume Triage (Green vs Amber Channel)
    if req.quantity_quintal > 100.0:
        assigned_channel = "AMBER"
        msg = "Amber Channel Pass: Mandi gate par verification required hogi."
    else:
        assigned_channel = "GREEN"
        msg = "Green Channel Express Pass: Direct weighbridge entry."

    # Single-use Token generate karein
    new_token_id = "TK-" + str(uuid.uuid4())[:8].upper()

    new_booking = models.Booking(
        token_id=new_token_id,
        phone_number=req.phone_number,
        vehicle_number=req.vehicle_number.upper(),
        vehicle_type=v_type,
        transit_permit=req.transit_permit,
        quantity_quintal=req.quantity_quintal,
        channel=assigned_channel,
        status="CONFIRMED"
    )

    db.add(new_booking)
    db.commit()

    return schemas.BookingResponse(
        status="SUCCESS",
        token_id=new_token_id,
        channel=assigned_channel,
        message=msg
    )