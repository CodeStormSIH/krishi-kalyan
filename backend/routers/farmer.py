import uuid
import io
import base64
import qrcode
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import timedelta, datetime
from typing import List, Optional

from database import get_db
import models, schemas

SLOT_CAPACITY_LIMIT = 50

router = APIRouter(prefix="/api/v1/farmer", tags=["Farmer Module"])


def generate_qr_base64(data: str) -> str:
    qr = qrcode.make(data)
    buf = io.BytesIO()
    qr.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")


@router.get("/mandis/traffic", response_model=List[schemas.MandiTrafficResponse])
def get_mandi_traffic(db: Session = Depends(get_db)):
    mandis = db.query(models.Mandi).all()
    result = []
    # Calculate congestion
    for m in mandis:
        # Calculate congestion
        percentage = (m.current_active_vehicles / m.max_capacity) * 100 if m.max_capacity > 0 else 0
        if percentage < 50:
            congestion = "GREEN"
        elif percentage <= 80:
            congestion = "AMBER"
        else:
            congestion = "RED"

        # Simplified estimated turnaround (e.g. 15 mins per 10% capacity used)
        eta = max(15, int(percentage * 0.5))
        
        result.append(schemas.MandiTrafficResponse(
            mandi_id=m.id,
            name=m.name,
            district=m.district,
            active_vehicles=m.current_active_vehicles,
            max_capacity=m.max_capacity,
            congestion_level=congestion,
            estimated_turnaround_time_mins=eta
        ))
    return result


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
        qr_image=qr_image_data,
        intended_mandi_id=req.intended_mandi_id
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

    # Anti-Fraud Rule 4: Ek baar process hone ke baad slot modify nahi hoga
    if booking.status in ["GATE_IN", "USED", "CANCELLED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Status '{booking.status}' hone ke baad slot reschedule nahi kiya ja sakta."
        )

    # Strip TZ + Set to next hour start
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

    # 3. Update Status
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
    db.refresh(booking)

    return schemas.BookingResponse(
        status="SUCCESS",
        token_id=token_id,
        channel=booking.channel,
        message="Booking cancelled successfully.",
        slot_time=booking.slot_time,
        qr_image=booking.qr_image
    )


@router.post("/pool/create", response_model=schemas.BookingResponse)
def create_pool(req: schemas.CreatePoolRequest, db: Session = Depends(get_db)):
    pool_id = f"POOL-{str(uuid.uuid4())[:6].upper()}"
    token_id = f"TK-{str(uuid.uuid4())[:8].upper()}"
    qr_image_data = generate_qr_base64(token_id)

    clean_time = datetime.utcnow()
    assigned_channel = "GREEN" if req.quantity_quintal <= 50 else "AMBER"

    booking = models.Booking(
        token_id=token_id,
        phone_number=req.phone_number,
        crop_name=req.crop_name,
        quantity_quintal=req.quantity_quintal,
        vehicle_number=req.vehicle_number.upper(),
        vehicle_type=req.vehicle_type,
        intended_mandi_id=req.intended_mandi_id,
        slot_time=clean_time,
        qr_image=qr_image_data,
        is_pool_master=True,
        pool_id=pool_id,
        status="CONFIRMED",
        channel=assigned_channel
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    return schemas.BookingResponse(
        status="SUCCESS",
        token_id=token_id,
        pool_id=pool_id,  # <-- Added
        channel=assigned_channel,
        message=f"Pool created successfully. Share Pool ID: {pool_id} with other farmers.",
        slot_time=booking.slot_time,
        qr_image=booking.qr_image
    )


@router.post("/pool/join", response_model=schemas.BookingResponse)
def join_pool(req: schemas.JoinPoolRequest, db: Session = Depends(get_db)):
    master = db.query(models.Booking).filter(
        models.Booking.pool_id == req.pool_id,
        models.Booking.is_pool_master == True
    ).first()

    if not master:
        raise HTTPException(status_code=404, detail="Invalid Pool ID or Pool Leader not found.")

    if master.status in ["GATE_IN", "USED", "CANCELLED"]:
        raise HTTPException(status_code=400, detail="Cannot join pool: Tractor already checked in or cancelled.")

    token_id = f"TK-{str(uuid.uuid4())[:8].upper()}"
    qr_image_data = generate_qr_base64(token_id)
    assigned_channel = "GREEN" if req.quantity_quintal <= 50 else "AMBER"

    sub_booking = models.Booking(
        token_id=token_id,
        phone_number=req.phone_number,
        crop_name=req.crop_name,
        quantity_quintal=req.quantity_quintal,
        vehicle_number=master.vehicle_number,
        vehicle_type=master.vehicle_type,
        intended_mandi_id=master.intended_mandi_id,
        slot_time=master.slot_time,
        qr_image=qr_image_data,
        is_pool_master=False,
        pool_id=req.pool_id,
        parent_token_id=master.token_id,
        status="CONFIRMED",
        channel=assigned_channel
    )
    db.add(sub_booking)
    db.commit()
    db.refresh(sub_booking)

    return schemas.BookingResponse(
        status="SUCCESS",
        token_id=token_id,
        pool_id=req.pool_id,  # <-- Added
        channel=assigned_channel,
        message=f"Successfully joined pool {req.pool_id}.",
        slot_time=sub_booking.slot_time,
        qr_image=sub_booking.qr_image
    )


@router.get("/pool/{pool_id}/manifest", response_model=schemas.PoolManifestResponse)
def get_pool_manifest(pool_id: str, db: Session = Depends(get_db)):
    bookings = db.query(models.Booking).filter(models.Booking.pool_id == pool_id).all()
    if not bookings:
        raise HTTPException(status_code=404, detail="Pool ID not found.")

    total_qty = sum(b.quantity_quintal for b in bookings)
    members = [
        schemas.PoolMemberDetail(
            token_id=b.token_id,
            phone_number=b.phone_number,
            crop_name=b.crop_name,
            quantity_quintal=b.quantity_quintal,
            is_leader=b.is_pool_master or False
        )
        for b in bookings
    ]

    return schemas.PoolManifestResponse(
        pool_id=pool_id,
        vehicle_number=bookings[0].vehicle_number,
        total_quantity_quintal=round(total_qty, 2),
        total_farmers=len(bookings),
        members=members
    )