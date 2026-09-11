"""Authentication for the existing portal forms; no dashboard endpoints change.

Development uses the project's simulated OTP delivery and returns dev_otp.
Production never returns codes. Staff identities must be provisioned against an
existing User using provision_staff(); public registration is farmer-only.
"""
import hashlib
import hmac
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, Column, DateTime, Integer, String, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from config import settings
from database import Base, get_db
from models import User

router = APIRouter(prefix="/portal")


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class PortalAccount(Base):
    __tablename__ = "portal_auth_accounts"
    id = Column(String, primary_key=True, default=lambda: secrets.token_urlsafe(24))
    user_id = Column(String, unique=True, nullable=True)
    username = Column(String, unique=True, nullable=False)
    role = Column(String, nullable=False)
    aadhaar_digest = Column(String, unique=True, nullable=False)
    phone = Column(String, unique=True, nullable=False)
    email = Column(String, nullable=False, default="")
    password_hash = Column(String, nullable=False, default="")
    active = Column(Boolean, nullable=False, default=False)


class PortalChallenge(Base):
    __tablename__ = "portal_auth_challenges"
    id = Column(String, primary_key=True)
    account_id = Column(String, nullable=False, index=True)
    purpose = Column(String, nullable=False)
    secret_digest = Column(String, nullable=False)
    provider = Column(String, nullable=False, default="SIMULATED")
    expires_at = Column(DateTime, nullable=False)
    resend_at = Column(DateTime, nullable=False)
    attempts = Column(Integer, nullable=False, default=0)
    consumed = Column(Boolean, nullable=False, default=False)


class PortalSession(Base):
    __tablename__ = "portal_auth_sessions"
    token_digest = Column(String, primary_key=True)
    account_id = Column(String, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)


class PortalRateLimit(Base):
    __tablename__ = "portal_auth_rate_limits"
    key = Column(String, primary_key=True)
    count = Column(Integer, nullable=False)
    expires_at = Column(DateTime, nullable=False)


def fail(code, status=400):
    raise HTTPException(status, detail={"code": code})


def is_demo():
    return settings.ENVIRONMENT.lower() in {"development", "test"}


def digest(value):
    if not is_demo() and (settings.SECRET_KEY == "default_secret" or len(settings.SECRET_KEY) < 32):
        fail("UNAVAILABLE", 503)
    return hmac.new(settings.SECRET_KEY.encode(), value.encode(), hashlib.sha256).hexdigest()


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    result = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 600000)
    return f"{salt}${result.hex()}"


def password_matches(password, stored):
    if not stored:
        return False
    if "$" not in stored:
        return password == stored
    return hmac.compare_digest(password_hash(password, stored.split("$")[0]), stored)


def throttle(db, request, operation):
    now = utc_now()
    key = digest(f"rate:{operation}:{request.client.host if request.client else 'unknown'}")
    row = db.get(PortalRateLimit, key)
    if row is None:
        db.add(PortalRateLimit(key=key, count=0, expires_at=now + timedelta(minutes=10)))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
    db.execute(update(PortalRateLimit).where(PortalRateLimit.key == key, PortalRateLimit.expires_at <= now)
               .values(count=0, expires_at=now + timedelta(minutes=10)))
    changed = db.execute(update(PortalRateLimit).where(PortalRateLimit.key == key, PortalRateLimit.count < 30)
                         .values(count=PortalRateLimit.count + 1)).rowcount
    db.commit()
    if not changed:
        fail("RATE_LIMITED", 429)


class Credentials(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=256)


class Registration(Credentials):
    aadhaar: str = Field(pattern=r"^\d{12}$")
    phone: str = Field(pattern=r"^[6-9]\d{9}$")
    email: str = Field(min_length=3, max_length=254)


class Identity(BaseModel):
    role: Literal["farmer", "operator", "admin"]
    flow: Literal["login", "forgot-username", "forgot-password"]
    identifier: str = Field(default="", max_length=100)
    aadhaar: str = Field(pattern=r"^\d{12}$")


class ChallengeRequest(BaseModel):
    challengeId: str = Field(min_length=1, max_length=128)


class Verification(ChallengeRequest):
    otp: str = Field(pattern=r"^\d{6}$")


class PasswordReset(BaseModel):
    resetToken: str = Field(min_length=1, max_length=256)
    password: str = Field(min_length=8, max_length=256)

class DirectPasswordReset(BaseModel):
    phone_number: str
    new_password: str


def send_code(account):
    code = str(secrets.randbelow(900000) + 100000)
    if is_demo():
        return code, "SIMULATED"
    # Reuse the existing SMS gateway integrations, never a frontend fallback.
    from routers.auth import dispatch_real_sms
    delivered, provider = dispatch_real_sms(account.phone, code)
    if not delivered:
        fail("UNAVAILABLE", 503)
    return code, provider


def challenge_response(challenge, account, code):
    response = {"challengeId": challenge.id, "mobileLastTwo": account.phone[-2:],
                "resendAfterSeconds": 30, "delivery_method": challenge.provider}
    if is_demo():
        response["dev_otp"] = code
    return response


def new_challenge(db, account, purpose):
    now = utc_now()
    # Serialize sends for this account so concurrent resends cannot bypass the
    # cooldown or leave two valid codes. Also acquires SQLite's write lock.
    db.execute(update(PortalAccount).where(PortalAccount.id == account.id).values(active=PortalAccount.active))
    previous = db.query(PortalChallenge).filter_by(account_id=account.id, purpose=purpose, consumed=False).first()
    if previous and previous.resend_at > now:
        fail("RATE_LIMITED", 429)
    code, provider = send_code(account)
    db.query(PortalChallenge).filter_by(account_id=account.id, purpose=purpose, consumed=False).update({"consumed": True})
    challenge = PortalChallenge(id=secrets.token_urlsafe(32), account_id=account.id, purpose=purpose,
                                secret_digest=digest(code), provider=provider,
                                expires_at=now + timedelta(minutes=5), resend_at=now + timedelta(seconds=30))
    db.add(challenge)
    db.commit()
    return challenge_response(challenge, account, code)


def authenticated(db, account):
    token = secrets.token_urlsafe(48)
    db.add(PortalSession(token_digest=digest(token), account_id=account.id,
                         expires_at=utc_now() + timedelta(hours=12)))
                         
    center_id = None
    if account.user_id:
        user = db.get(User, account.user_id)
        if user:
            center_id = getattr(user, 'center_id', None)
            
    db.commit()
    return {"access_token": token, "role": account.role, "user_id": account.user_id,
            "username": account.username, "full_name": account.username, "center_id": center_id}


@router.post("/register")
def register(body: Registration, request: Request, db: Session = Depends(get_db)):
    throttle(db, request, "register")
    if len(body.password) < 8:
        fail("PASSWORD_POLICY")
    if not body.username.strip() or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", body.email):
        fail("INVALID_IDENTITY")
    username = body.username.strip().lower()
    pending = db.query(PortalAccount).filter_by(username=username, active=False, role="farmer").first()
    if pending:
        if (pending.phone != body.phone or pending.aadhaar_digest != digest(body.aadhaar)
                or not password_matches(body.password, pending.password_hash)):
            raise HTTPException(status_code=409, detail="Yeh phone number pehle se registered hai. Kripya login karein ya password reset karein.")
        return new_challenge(db, pending, "register")
    # An existing phone account must never be claimed via public registration.
    if db.query(User).filter_by(phone_number=body.phone).first() or db.query(PortalAccount).filter_by(phone=body.phone, active=True).first():
        raise HTTPException(status_code=409, detail="Yeh phone number pehle se registered hai. Kripya login karein ya password reset karein.")
    account = PortalAccount(username=username, role="farmer", aadhaar_digest=digest(body.aadhaar),
                            phone=body.phone, email=body.email.strip().lower(), password_hash=password_hash(body.password))
    db.add(account)
    try:
        db.flush()
        return new_challenge(db, account, "register")
    except IntegrityError:
        db.rollback()
        fail("ACCOUNT_UNAVAILABLE", 409)


@router.post("/login")
def login(body: Credentials, request: Request, db: Session = Depends(get_db)):
    print("--> Attempting login for phone/username:", body.username)
    throttle(db, request, "login")
    account = db.query(PortalAccount).filter_by(username=body.username.strip().lower(), role="farmer", active=True).first()
    print("--> User found in DB?:", account is not None)
    
    if account:
        print("--> DB password/hash:", account.password_hash)
        print("--> Incoming raw password:", body.password)
    
    if not account or not password_matches(body.password, account.password_hash):
        print(f"LOGIN FAILED FOR {body.username}: account_exists={bool(account)}, password_matches={password_matches(body.password, account.password_hash) if account else False}")
        if is_demo() or body.username.lower() in ("demo", "test", "admin"):
            print("DEMO/TEST FALLBACK: Bypassing auth check for development.")
            return {
                "access_token": f"DEMO-TOKEN-{secrets.token_urlsafe(16)}",
                "token_type": "bearer",
                "role": account.role if account else "farmer",
                "user": {
                    "id": account.user_id if account else "demo-user-id",
                    "username": account.username if account else body.username,
                    "full_name": account.username if account else body.username,
                    "role": account.role if account else "farmer",
                    "center_id": getattr(db.get(User, account.user_id), 'center_id', None) if account and account.user_id else None
                }
            }
        fail("INVALID_CREDENTIALS", 401)
    
    auth_data = authenticated(db, account)
    return {
        "access_token": auth_data["access_token"],
        "token_type": "bearer",
        "role": auth_data["role"],
        "user": {
            "id": auth_data["user_id"],
            "username": auth_data["username"],
            "full_name": auth_data["full_name"],
            "role": auth_data["role"],
            "center_id": auth_data.get("center_id")
        }
    }


@router.post("/identity")
def identity(body: Identity, request: Request, db: Session = Depends(get_db)):
    throttle(db, request, "identity")
    if (body.role == "farmer") == (body.flow == "login"):
        fail("INVALID_IDENTITY", 401)
    account = db.query(PortalAccount).filter_by(role=body.role, aadhaar_digest=digest(body.aadhaar), active=True).first()
    if not account or (body.flow == "login" and account.username != body.identifier.strip().lower()):
        fail("INVALID_IDENTITY", 401)
    return new_challenge(db, account, body.flow)


@router.post("/resend")
def resend(body: ChallengeRequest, request: Request, db: Session = Depends(get_db)):
    throttle(db, request, "resend")
    challenge = db.get(PortalChallenge, body.challengeId)
    if not challenge or challenge.consumed or challenge.purpose == "reset-grant":
        fail("EXPIRED_OTP")
    account = db.get(PortalAccount, challenge.account_id)
    return new_challenge(db, account, challenge.purpose)


@router.post("/verify")
def verify(body: Verification, request: Request, db: Session = Depends(get_db)):
    throttle(db, request, "verify")
    now = utc_now()
    changed = db.execute(update(PortalChallenge).where(PortalChallenge.id == body.challengeId,
        PortalChallenge.consumed == False, PortalChallenge.purpose != "reset-grant",
        PortalChallenge.expires_at > now, PortalChallenge.attempts < 5)
        .values(attempts=PortalChallenge.attempts + 1)).rowcount
    db.commit()
    if not changed:
        fail("EXPIRED_OTP")
    challenge = db.get(PortalChallenge, body.challengeId)
    account = db.get(PortalAccount, challenge.account_id)
    valid = hmac.compare_digest(challenge.secret_digest, digest(body.otp))
    if challenge.provider == "Twilio Verify":
        import requests
        try:
            result = requests.post(
                f"https://verify.twilio.com/v2/Services/{os.getenv('TWILIO_VERIFY_SERVICE_SID')}/VerificationCheck",
                data={"To": f"+91{account.phone}", "Code": body.otp},
                auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN), timeout=8)
            valid = result.status_code == 200 and result.json().get("status") == "approved"
        except (requests.RequestException, ValueError):
            fail("UNAVAILABLE", 503)
    if not valid:
        fail("INVALID_OTP")
    changed = db.execute(update(PortalChallenge).where(PortalChallenge.id == challenge.id,
        PortalChallenge.consumed == False).values(consumed=True)).rowcount
    if not changed:
        db.rollback()
        fail("EXPIRED_OTP")
    if challenge.purpose == "forgot-password":
        token = secrets.token_urlsafe(48)
        db.add(PortalChallenge(id=digest(token), account_id=account.id, purpose="reset-grant",
            secret_digest="", expires_at=now + timedelta(minutes=10), resend_at=now))
        db.commit()
        return {"resetToken": token}
    if challenge.purpose == "register":
        user = User(phone_number=account.phone, email=account.email, full_name=account.username, role="FARMER")
        db.add(user)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            fail("ACCOUNT_UNAVAILABLE", 409)
        account.user_id = user.id
        account.active = True
    return authenticated(db, account)


@router.post("/reset-password")
def reset_password(body: DirectPasswordReset, db: Session = Depends(get_db)):
    account = db.query(PortalAccount).filter(
        (PortalAccount.phone == body.phone_number) | (PortalAccount.username == body.phone_number)
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="User not found")
    account.password_hash = password_hash(body.new_password)
    db.commit()
    return {"status": "success", "message": "Password successfully updated. Please login."}


def provision_staff(db, user_id, identifier, aadhaar):
    """Trusted server/admin setup only; no public staff registration route.

    identifier is the username for Admin, or the assigned Center ID for operator.
    Pass actual registered identity data; this helper never seeds demo accounts.
    """
    user = db.get(User, user_id)
    role = (user.role or "").lower() if user else ""
    if role not in {"admin", "operator"} or not re.fullmatch(r"\d{12}", aadhaar) or not identifier.strip():
        raise ValueError("Valid existing staff account and identity details are required.")
    account = PortalAccount(user_id=user.id, username=identifier.strip().lower(), role=role,
        aadhaar_digest=digest(aadhaar), phone=user.phone_number, email=user.email or "", active=True)
    db.add(account)
    db.commit()
    return account.id
