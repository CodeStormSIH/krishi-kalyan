import uuid
import io
import base64
import qrcode
from fastapi import APIRouter, Depends, HTTPException

def generate_qr_base64(data: str) -> str:
    qr = qrcode.make(data)
    buf = io.BytesIO()
    qr.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import timedelta
from database import get_db
import models, schemas

SLOT_CAPACITY_LIMIT = 50

router = APIRouter(prefix="/api/v1/farmer", tags=["Farmer Module"])

@router.post("/booking/create", response_model=schemas.BookingResponse)
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

    # 1. Timezone strip and Capacity Check
    clean_time = req.slot_time.replace(tzinfo=None)
    slot_start = clean_time.replace(minute=0, second=0, microsecond=0)
    slot_end = slot_start + timedelta(hours=1)

    booked_count = db.query(func.count(models.Booking.id)).filter(
        models.Booking.slot_time >= slot_start,
        models.Booking.slot_time < slot_end,
        models.Booking.status.in_(["CONFIRMED", "RESCHEDULED"])
    ).scalar()

    if booked_count >= SLOT_CAPACITY_LIMIT:
        raise HTTPException(
            status_code=409,
            detail="Requested slot is already full. Please select an alternative time."
        )

    # Single-use Token generate karein
    new_token_id = "TK-" + str(uuid.uuid4())[:8].upper()
    qr_image_data = generate_qr_base64(new_token_id)

    new_booking = models.Booking(
        token_id=new_token_id,
        phone_number=req.phone_number,
        crop_name=req.crop_name,
        vehicle_number=req.vehicle_number.upper(),
        vehicle_type=v_type,
        transit_permit=req.transit_permit,
        quantity_quintal=req.quantity_quintal,
        slot_time=clean_time,
        channel=assigned_channel,
        status="CONFIRMED",
        qr_image=qr_image_data
    )

    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    return schemas.BookingResponse(
        status="SUCCESS",
        token_id=new_token_id,
        channel=assigned_channel,
        message=msg,
        slot_time=new_booking.slot_time,
        qr_image=new_booking.qr_image
    )
@router.get("/pass/{token_id}", response_model=schemas.GatePassDetailsResponse)
def get_pass(token_id: str, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.token_id == token_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Token not found.")
    return booking

@router.patch("/booking/{token_id}/reschedule", response_model=schemas.BookingResponse)
def reschedule_slot(token_id: str, req: schemas.BookingRescheduleRequest, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.token_id == token_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking record nahi mila.")

    # Gate in ya used gaadi reschedule nahi ho sakti
    if booking.status in ["GATE_IN", "USED", "CANCELLED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Status '{booking.status}' hone ke baad slot reschedule nahi kiya ja sakta."
        )

    # 1. Timezone strip karein taaki database comparison crash na ho
    clean_time = req.new_slot_time.replace(tzinfo=None)
    slot_start = clean_time.replace(minute=0, second=0, microsecond=0)
    slot_end = slot_start + timedelta(hours=1)

    # 2. Capacity Check
    booked_count = db.query(func.count(models.Booking.id)).filter(
        models.Booking.slot_time >= slot_start,
        models.Booking.slot_time < slot_end,
        models.Booking.status.in_(["CONFIRMED", "RESCHEDULED"])
    ).scalar()

    if booked_count >= SLOT_CAPACITY_LIMIT:
        raise HTTPException(
            status_code=409,
            detail="Requested new slot is already full. Please select an alternative time."
        )

    # 3. Update fields
    booking.slot_time = clean_time
    booking.status = "RESCHEDULED"
    db.commit()
    db.refresh(booking)

    return schemas.BookingResponse(
        status="SUCCESS",
        token_id=booking.token_id,
        channel=booking.channel,
        message="Slot successfully rescheduled.",
        slot_time=booking.slot_time,
        qr_image=booking.qr_image
    )
@router.put("/booking/{token_id}/cancel", response_model=schemas.BookingResponse)
def cancel_booking(token_id: str, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.token_id == token_id).first()

    if not booking:
        raise HTTPException(status_code=404, detail="Token not found.")

    if booking.status in ["USED", "GATE_IN"]:
        raise HTTPException(
            status_code=403,
            detail="This booking is already in progress or completed. Cannot cancel."
        )

    booking.status = "CANCELLED"
    db.commit()

    return schemas.BookingResponse(
        status="SUCCESS",
        token_id=token_id,
        channel=booking.channel,
        message="Booking cancelled successfully."
    )