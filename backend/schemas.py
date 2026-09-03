from pydantic import BaseModel
from typing import Optional

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

class GateVerifyRequest(BaseModel):
    token_id: str
    operator_id: str

class GateVerifyResponse(BaseModel):
    entry_allowed: bool
    channel: str
    message: str
    assigned_bay: str