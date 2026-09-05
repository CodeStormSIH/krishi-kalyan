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
    intended_mandi_id: Optional[str] = None

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
    mandi_id: str
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

# ==========================================
# 3. ADMIN & ANALYTICS SCHEMAS
# ==========================================

class MandiLiveStatsResponse(BaseModel):
    total_bookings_today: int
    vehicles_inside_mandi: int
    completed_turnarounds_today: int
    cancelled_today: int
    avg_turnaround_minutes: float
    green_channel_count: int
    amber_channel_count: int

class HourlyCongestionMetric(BaseModel):
    slot_hour: str
    booked_count: int
    entered_count: int
    capacity_limit: int = 10

class ActiveVehicleDetail(BaseModel):
    token_id: str
    vehicle_number: str
    phone_number: str
    crop_name: str
    channel: str
    entry_time: str
    dwell_minutes: int

class MandiTrafficResponse(BaseModel):
    mandi_id: str
    name: str
    district: str
    active_vehicles: int
    max_capacity: int
    congestion_level: str
    estimated_turnaround_time_mins: int

# ==========================================
# 4. TRACTOR POOLING SCHEMAS
# ==========================================
from typing import List

class CreatePoolRequest(BaseModel):
    phone_number: str
    crop_name: str
    quantity_quintal: float
    vehicle_number: str
    vehicle_type: str = "TRACTOR_TROLLEY"
    intended_mandi_id: Optional[str] = None
    slot_time: Optional[str] = None

class JoinPoolRequest(BaseModel):
    pool_id: str
    phone_number: str
    crop_name: str
    quantity_quintal: float

class PoolMemberDetail(BaseModel):
    token_id: str
    phone_number: str
    crop_name: str
    quantity_quintal: float
    is_leader: bool

class PoolManifestResponse(BaseModel):
    pool_id: str
    vehicle_number: str
    total_quantity_quintal: float
    total_farmers: int
    members: List[PoolMemberDetail]

# ==========================================
# 5. WEIGHBRIDGE & ANTI-FRAUD SCHEMAS
# ==========================================

class WeighbridgeGrossRequest(BaseModel):
    token_id: str
    gross_weight_quintal: float
    weighbridge_operator: str

class WeighbridgeTareRequest(BaseModel):
    token_id: str
    tare_weight_quintal: float
    weighbridge_operator: str

class WeighbridgeResponse(BaseModel):
    token_id: str
    status: str
    declared_quantity_quintal: float
    net_weight_quintal: Optional[float] = None
    variance_percent: Optional[float] = None
    fraud_flag: bool
    assigned_status: str
    message: str

class BookingResponse(BaseModel):
    status: str
    token_id: str
    channel: str
    message: str
    slot_time: Optional[datetime] = None
    qr_image: Optional[str] = None
    pool_id: Optional[str] = None  # <-- Yeh line add karein

    class Config:
        from_attributes = True