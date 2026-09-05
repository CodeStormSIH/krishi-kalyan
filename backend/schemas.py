# backend/schemas.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# ==========================================
# 1. FARMER MODULE SCHEMAS
# ==========================================

class BookingCreateRequest(BaseModel):
    phone_number: str
    crop_name: str
    vehicle_number: str
    vehicle_type: str
    quantity_quintal: float
    slot_time: datetime
    transit_permit: Optional[str] = None

class BookingResponse(BaseModel):
    status: str
    token_id: str
    channel: str
    message: str
    slot_time: Optional[datetime] = None
    qr_image: Optional[str] = None

class GatePassDetailsResponse(BaseModel):
    token_id: str
    phone_number: str
    crop_name: Optional[str] = "Wheat"
    vehicle_number: str
    vehicle_type: str
    quantity_quintal: float
    channel: str
    status: str
    slot_time: Optional[datetime] = None
    qr_image: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class BookingRescheduleRequest(BaseModel):
    new_slot_time: datetime


# ==========================================
# 2. GATE OPERATOR SCHEMAS
# ==========================================

class GateVerifyRequest(BaseModel):
    token_id: str

class GateVerifyResponse(BaseModel):
    entry_allowed: bool
    channel: str
    message: str
    assigned_bay: str

class VehicleLogRequest(BaseModel):
    token_id: str
    status: str  # GATE_IN / GATE_OUT / TRANSIT_VERIFIED
    manual_entry_gate: Optional[str] = None
    manual_exit_gate: Optional[str] = None
    verified_by: Optional[str] = None
    audit_remark: Optional[str] = None

class GateScanRequest(BaseModel):
    token_id: str

class GateScanResponse(BaseModel):
    valid: bool
    token_id: str
    phone_number: str
    crop_name: str
    vehicle_number: str
    vehicle_type: str
    quantity_quintal: float
    channel: str
    status: str
    assigned_bay: str
    requires_transit_verification: bool
    transit_permit: Optional[str] = None
    message: str

class GateEntryLogRequest(BaseModel):
    token_id: str
    operator_name: str
    gate_number: str
    is_manual: bool = False

class TransitVerifyRequest(BaseModel):
    token_id: str
    verified_by: str
    remarks: Optional[str] = None

class GateExitLogRequest(BaseModel):
    token_id: str
    operator_name: str
    gate_number: str
    is_manual: bool = False

class GateActionResponse(BaseModel):
    status: str
    token_id: str
    message: str
    total_vehicle_time: Optional[str] = None