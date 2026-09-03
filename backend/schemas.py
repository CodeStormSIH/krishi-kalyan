# backend/schemas.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# --- Farmer Module Schemas ---
class BookingCreateRequest(BaseModel):
    phone_number: str
    vehicle_number: str
    vehicle_type: str
    quantity_quintal: float
    transit_permit: Optional[str] = None

class BookingResponse(BaseModel):
    status: str
    token_id: str
    channel: str
    message: str

class BookingRescheduleRequest(BaseModel):
    token_id: str
    new_slot_time: datetime

# --- Gate Module Schemas ---
class GateVerifyRequest(BaseModel):
    token_id: str

class GateVerifyResponse(BaseModel):
    entry_allowed: bool
    channel: str
    message: str
    assigned_bay: str