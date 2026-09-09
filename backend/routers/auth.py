from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random
import uuid

import models
import schemas
from database import get_db

router = APIRouter()

@router.post("/send-otp", response_model=schemas.SendOtpResponse)
def send_otp(request: schemas.SendOtpRequest, db: Session = Depends(get_db)):
    phone_number = request.phone_number
    otp_code = str(random.randint(100000, 999999))
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    otp_session = models.OtpSession(
        phone_number=phone_number,
        otp_code=otp_code,
        expires_at=expires_at
    )
    db.add(otp_session)
    db.commit()

    print(f"[SMS GATEWAY SIMULATION] OTP for {phone_number}: {otp_code}")

    return schemas.SendOtpResponse(
        status="SUCCESS",
        phone_number=phone_number,
        message="OTP sent successfully",
        dev_otp=otp_code
    )

@router.post("/verify-otp", response_model=schemas.AuthResponse)
def verify_otp(request: schemas.VerifyOtpRequest, db: Session = Depends(get_db)):
    otp_session = db.query(models.OtpSession).filter(
        models.OtpSession.phone_number == request.phone_number,
        models.OtpSession.is_verified == False
    ).order_by(models.OtpSession.id.desc()).first()

    if not otp_session:
        raise HTTPException(status_code=400, detail="Invalid session or OTP already verified")
    
    if otp_session.otp_code != request.otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    if otp_session.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")
    
    otp_session.is_verified = True
    db.commit()

    user = db.query(models.User).filter(models.User.phone_number == request.phone_number).first()
    
    if not user:
        full_name = request.full_name or f"User - {request.phone_number[-4:]}"
        user = models.User(
            phone_number=request.phone_number,
            email=request.email,
            full_name=full_name,
            role="FARMER"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update email if provided and user doesn't have one, or if they want to update it
        if request.email and not user.email:
            user.email = request.email
            db.commit()
            db.refresh(user)

    access_token = f"TOKEN-{uuid.uuid4()}"

    return schemas.AuthResponse(
        access_token=access_token,
        user_id=str(user.id),
        phone_number=user.phone_number,
        email=user.email,
        full_name=user.full_name,
        role=user.role
    )

@router.get("/me")
def get_current_user():
    # Simplified mock for the hackathon /me endpoint if no token is passed
    return {"status": "success", "message": "Currently this requires JWT logic, but the route exists"}
