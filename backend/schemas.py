# backend/schemas.py
from pydantic import BaseModel
from typing import Any, Dict, Optional
from datetime import datetime

# ==========================================
# 0. AUTHENTICATION SCHEMAS
# ==========================================

class SendOtpRequest(BaseModel):
    phone_number: str

class SendOtpResponse(BaseModel):
    status: str
    phone_number: str
    message: str
    dev_otp: Optional[str] = None
    delivery_method: Optional[str] = "SIMULATED"

class VerifyOtpRequest(BaseModel):
    phone_number: str
    otp_code: str
    email: Optional[str] = None
    full_name: Optional[str] = None

class AuthResponse(BaseModel):
    access_token: str
    user_id: str
    phone_number: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str

class ActiveBookingResponse(BaseModel):
    token_id: str
    status: str
    channel: str
    crop_name: str
    quantity_quintal: float
    vehicle_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    transport_mode: Optional[str] = None
    assigned_vehicle: Optional[str] = None
    slot_time: Optional[datetime] = None
    qr_image: Optional[str] = None
    intended_mandi_id: Optional[str] = None
    actual_mandi_id: Optional[str] = None
    moisture_percent: Optional[float] = None
    crop_grade: Optional[str] = None
    assigned_auction_bay: Optional[str] = None
    gross_weight_quintal: Optional[float] = None
    tare_weight_quintal: Optional[float] = None
    net_weight_quintal: Optional[float] = None
    fraud_flag: bool = False
    pool_id: Optional[str] = None
    is_pool_master: Optional[bool] = False
    mandi_name: Optional[str] = None
    mandi_district: Optional[str] = None
    mandi_congestion: Optional[str] = None

    class Config:
        from_attributes = True

# ==========================================
# 1. FARMER MODULE SCHEMAS
# ==========================================

class BookingCreateRequest(BaseModel):
    phone_number: str
    crop_name: str
    vehicle_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    quantity_quintal: float
    slot_time: datetime
    transit_permit: Optional[str] = None
    intended_mandi_id: Optional[str] = None
    transport_mode: Optional[str] = "OWN"
    driver_name: Optional[str] = None
    estimated_fare: Optional[float] = None
    assigned_vehicle: Optional[str] = None

class BookingDataPayload(BaseModel):
    token_id: str
    channel: str
    slot_time: Optional[datetime] = None
    qr_image: Optional[str] = None
    status: str
    driver_name: Optional[str] = None
    estimated_fare: Optional[float] = None
    assigned_vehicle: Optional[str] = None

class BookingResponse(BaseModel):
    status: str
    token_id: str
    channel: str
    message: str
    slot_time: Optional[datetime] = None
    qr_image: Optional[str] = None
    data: Optional[BookingDataPayload] = None

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

class CenterCrowdResponse(BaseModel):
    center_id: str
    center_name: str
    district: str
    active_vehicles: int
    waiting_farmers: int
    max_capacity: int
    capacity_percentage: int
    congestion_level: str  # GREEN, AMBER, RED
    congestion_label: str  # Low Crowd, Moderate Crowd, Heavy Congestion
    avg_service_time_mins: int
    estimated_wait_time_mins: int
    status_message: str

class FarmerQueueEstimateResponse(BaseModel):
    token_id: str
    phone_number: str
    center_id: Optional[str] = None
    center_name: str
    queue_position: int
    farmers_ahead: int
    estimated_wait_time_mins: int
    center_congestion: str
    center_crowd_label: str
    active_vehicles: int
    max_capacity: int
    capacity_percentage: int
    status: str
    status_message: str

class CenterCreateRequest(BaseModel):
    center_name: str
    location: str
    capacity_quintals: float
    operator_phone: str
    operator_name: str
    password: str

class CenterResponse(BaseModel):
    id: str
    name: str
    location: str
    capacity_quintals: float
    operator_phone: Optional[str] = None
    operator_name: Optional[str] = None
    active_vehicles: int

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
    data: Optional[BookingDataPayload] = None

    class Config:
        from_attributes = True

# ==========================================
# 6. QUALITY ASSAYING & AUCTION SCHEMAS
# ==========================================

class CropAssayRequest(BaseModel):
    token_id: str
    inspector_name: str
    moisture_percent: float
    foreign_matter_percent: float
    visual_inspection_notes: Optional[str] = None

class CropAssayResponse(BaseModel):
    token_id: str
    crop_name: str
    grade: str
    status: str
    assigned_auction_bay: str
    message: str


class WebStateUpdateRequest(BaseModel):
    data: Dict[str, Any]


class WebStateResponse(BaseModel):
    data: Optional[Dict[str, Any]] = None
    updated_at: Optional[datetime] = None

class AssignPoolRequest(BaseModel):
    token_ids: List[str]
    vehicle_number: str

class StatusUpdateRequest(BaseModel):
    status: str
    transport_mode: Optional[str] = None
    vehicle_number: Optional[str] = None
