# backend/models.py
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Float
from database import Base

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(String, unique=True, index=True, nullable=False)
    phone_number = Column(String, index=True, nullable=False)
    vehicle_number = Column(String, nullable=False)
    vehicle_type = Column(String, nullable=False)
    transit_permit = Column(String, nullable=True)
    quantity_quintal = Column(Float, nullable=False)
    channel = Column(String, nullable=False)  # GREEN or AMBER
    status = Column(String, default="CONFIRMED")  # CONFIRMED, GATE_IN, USED, CANCELLED
    created_at = Column(DateTime, default=datetime.utcnow)