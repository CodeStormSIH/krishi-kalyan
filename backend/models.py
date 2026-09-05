# backend/models.py
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text
from database import Base

class Mandi(Base):
    __tablename__ = "mandis"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    district = Column(String, nullable=False)
    max_capacity = Column(Integer, default=50)
    current_active_vehicles = Column(Integer, default=0)

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(String, unique=True, index=True, nullable=False)
    phone_number = Column(String, index=True, nullable=False)
    crop_name = Column(String, nullable=False, default="Wheat")
    vehicle_number = Column(String, nullable=False)
    vehicle_type = Column(String, nullable=False)
    transit_permit = Column(String, nullable=True)
    quantity_quintal = Column(Float, nullable=False)
    slot_time = Column(DateTime, nullable=False)
    channel = Column(String, nullable=False)  # GREEN or AMBER
    status = Column(String, default="CONFIRMED")  # CONFIRMED, GATE_IN, RESCHEDULED, USED, CANCELLED
    qr_image = Column(Text, nullable=True)  # Base64 string for QR display
    created_at = Column(DateTime, default=datetime.utcnow)

    # --- Gate & Audit Module Fields (Teammate tracking) ---
    entry_gate_in_time = Column(DateTime, nullable=True)
    exit_gate_time = Column(DateTime, nullable=True)
    total_vehicle_time = Column(String, nullable=True)  # Format: "HH:MM:SS"
    exit_gate_status = Column(String, default="PENDING")  # PENDING, SCANNED, NOT_SCANNED, BLOCKED
    exit_gate_operator = Column(String, nullable=True)
    is_transit_verified = Column(Boolean, default=False)
    transit_verified_at = Column(DateTime, nullable=True)
    is_manual_gate_in = Column(Boolean, default=False)
    is_manual_gate_out = Column(Boolean, default=False)
    manual_entry_gate = Column(String, nullable=True)  # e.g., "Gate 4"
    manual_exit_gate = Column(String, nullable=True)  # e.g., "Gate 2"
    vehicle_in_status = Column(String, default="PENDING")  # PENDING, SCANNED, NOT_SCANNED, BLOCKED
    vehicle_out_status = Column(String, default="PENDING")  # PENDING, SCANNED, NOT_SCANNED, BLOCKED
    vehicle_entry_operator = Column(String, nullable=True)
    vehicle_exit_operator = Column(String, nullable=True)
    verified_by = Column(String, nullable=True)
    audit_remark = Column(String, nullable=True)
    
    # --- Multi-Mandi Fields ---
    intended_mandi_id = Column(String, nullable=True)
    actual_mandi_id = Column(String, nullable=True)
    is_rerouted = Column(Boolean, default=False)

    # --- Pooling Fields ---
    is_pool_master = Column(Boolean, default=False)
    pool_id = Column(String, nullable=True, index=True)
    parent_token_id = Column(String, nullable=True)

    # --- Weighbridge & Anti-Fraud Fields ---
    gross_weight_quintal = Column(Float, nullable=True)
    tare_weight_quintal = Column(Float, nullable=True)
    net_weight_quintal = Column(Float, nullable=True)
    weight_variance_percent = Column(Float, nullable=True)
    fraud_flag = Column(Boolean, default=False)
    fraud_reason = Column(String, nullable=True)