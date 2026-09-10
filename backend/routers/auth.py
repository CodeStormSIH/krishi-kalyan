import os
import requests
import random
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter()

def dispatch_real_sms(phone_number: str, otp_code: str) -> tuple[bool, str]:
    """
    Attempts to dispatch real SMS via configured SMS gateways:
    1. Twilio Verify API (Dedicated OTP SMS service - reliable globally)
    2. Fast2SMS (Indian numbers)
    3. Twilio Messages API
    4. 2Factor.in
    """
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"), override=True)

    cleaned_10 = "".join(filter(str.isdigit, phone_number))[-10:]
    to_num = phone_number if phone_number.startswith("+") else f"+91{cleaned_10}"

    # 1. Try Twilio Verify API (Best & dedicated OTP service)
    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
    twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
    verify_service_sid = os.getenv("TWILIO_VERIFY_SERVICE_SID")
    if twilio_sid and twilio_token and verify_service_sid:
        try:
            url = f"https://verify.twilio.com/v2/Services/{verify_service_sid}/Verifications"
            res = requests.post(url, data={"To": to_num, "Channel": "sms"}, auth=(twilio_sid, twilio_token), timeout=8)
            res_json = res.json()
            if res.status_code in [200, 201] and res_json.get("status") == "pending":
                print(f"[TWILIO VERIFY SUCCESS] Real SMS OTP dispatched to {to_num}")
                return True, "Twilio Verify"
            else:
                print(f"[TWILIO VERIFY RESPONSE] status={res.status_code}, data={res_json}")
        except Exception as e:
            print(f"[TWILIO VERIFY ERROR] {e}")

    # 2. Try Fast2SMS
    fast2sms_key = os.getenv("FAST2SMS_API_KEY")
    if fast2sms_key:
        try:
            url = "https://www.fast2sms.com/dev/bulkV2"
            payload = {
                "variables_values": otp_code,
                "route": "otp",
                "numbers": cleaned_10,
            }
            headers = {
                "authorization": fast2sms_key,
                "Content-Type": "application/x-www-form-urlencoded"
            }
            res = requests.post(url, data=payload, headers=headers, timeout=6)
            res_json = res.json()
            if res_json.get("return") is True:
                print(f"[FAST2SMS SUCCESS] Real SMS dispatched to {cleaned_10}")
                return True, "Fast2SMS"
            else:
                print(f"[FAST2SMS RESPONSE] {res_json}")
        except Exception as e:
            print(f"[FAST2SMS ERROR] {e}")

    # 3. Try Twilio Messages API
    twilio_from = os.getenv("TWILIO_PHONE_NUMBER")
    if twilio_sid and twilio_token and twilio_from:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json"
            payload = {
                "From": twilio_from,
                "To": to_num,
                "Body": f"Your Krishi Kalyan verification code is: {otp_code}. Valid for 5 minutes."
            }
            res = requests.post(url, data=payload, auth=(twilio_sid, twilio_token), timeout=6)
            if res.status_code in [200, 201]:
                print(f"[TWILIO SUCCESS] Real SMS dispatched to {to_num}")
                return True, "Twilio"
            else:
                print(f"[TWILIO ERROR] Status: {res.status_code}, Body: {res.text}")
        except Exception as e:
            print(f"[TWILIO ERROR] {e}")

    # 4. Try 2Factor.in
    twofactor_key = os.getenv("TWOFACTOR_API_KEY")
    if twofactor_key:
        try:
            url = f"https://2factor.in/v2/API/V1/{twofactor_key}/SMS/{cleaned_10}/{otp_code}"
            res = requests.get(url, timeout=6)
            if res.status_code == 200 and "Status" in res.text and "Success" in res.text:
                print(f"[2FACTOR SUCCESS] Real SMS dispatched to {cleaned_10}")
                return True, "2Factor"
        except Exception as e:
            print(f"[2FACTOR ERROR] {e}")

    return False, "NONE"

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

    # Attempt real SMS dispatch
    sms_sent, provider = dispatch_real_sms(phone_number, otp_code)

    if sms_sent:
        return schemas.SendOtpResponse(
            status="SUCCESS",
            phone_number=phone_number,
            message=f"Real OTP sent to {phone_number} via {provider}",
            dev_otp=None,
            delivery_method="SMS"
        )
    else:
        print(f"[SMS GATEWAY SIMULATION] No real SMS Gateway configured in .env. OTP for {phone_number}: {otp_code}")
        return schemas.SendOtpResponse(
            status="SUCCESS",
            phone_number=phone_number,
            message="OTP generated (simulation mode)",
            dev_otp=otp_code,
            delivery_method="SIMULATED"
        )

@router.post("/verify-otp", response_model=schemas.AuthResponse)
def verify_otp(request: schemas.VerifyOtpRequest, db: Session = Depends(get_db)):
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"), override=True)

    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
    twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
    verify_service_sid = os.getenv("TWILIO_VERIFY_SERVICE_SID")
    twilio_approved = False

    cleaned_10 = "".join(filter(str.isdigit, request.phone_number))[-10:]
    to_num = request.phone_number if request.phone_number.startswith("+") else f"+91{cleaned_10}"

    if twilio_sid and twilio_token and verify_service_sid:
        try:
            check_url = f"https://verify.twilio.com/v2/Services/{verify_service_sid}/VerificationCheck"
            check_res = requests.post(check_url, data={"To": to_num, "Code": request.otp_code}, auth=(twilio_sid, twilio_token), timeout=8)
            check_data = check_res.json()
            if check_res.status_code == 200 and check_data.get("status") == "approved":
                twilio_approved = True
                print(f"[TWILIO VERIFY APPROVED] for {to_num}")
        except Exception as e:
            print(f"[TWILIO CHECK ERROR] {e}")

    if not twilio_approved:
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
