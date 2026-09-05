from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/api/v1/assaying",
    tags=["Quality Assaying & Auction"]
)

@router.post("/inspect", response_model=schemas.CropAssayResponse)
def inspect_crop_quality(req: schemas.CropAssayRequest, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.token_id == req.token_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Token not found")

    valid_statuses = ["GROSS_WEIGHED", "WEIGHMENT_VERIFIED", "GATE_IN", "CONFIRMED"]
    if booking.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Vehicle status '{booking.status}' is not eligible for quality inspection."
        )

    # Assaying Logic & Bay Allotment
    if req.moisture_percent > 14.0:
        grade = "REJECTED"
        bay = "DRYING_YARD_D1"
        booking.status = "REJECTED_HIGH_MOISTURE"
        msg = f"Rejected: Moisture content ({req.moisture_percent}%) exceeds permissible limit (14%). Diverted to drying platform."
    elif req.moisture_percent <= 12.0 and req.foreign_matter_percent <= 1.5:
        grade = "GRADE_A"
        bay = "AUCTION_BAY_01"
        booking.status = "READY_FOR_AUCTION"
        msg = "Grade A certified. Allocated to Premium Auction Bay 1."
    elif req.foreign_matter_percent <= 4.0:
        grade = "GRADE_B"
        bay = "AUCTION_BAY_04"
        booking.status = "READY_FOR_AUCTION"
        msg = "Grade B certified. Allocated to Standard Auction Bay 4."
    else:
        grade = "GRADE_C"
        bay = "AUCTION_BAY_08"
        booking.status = "READY_FOR_AUCTION"
        msg = "Grade C certified. Allocated to Open Yard Bay 8."

    # Save to database
    booking.moisture_percent = req.moisture_percent
    booking.foreign_matter_percent = req.foreign_matter_percent
    booking.crop_grade = grade
    booking.assigned_auction_bay = bay
    booking.assay_remarks = req.visual_inspection_notes

    db.commit()
    db.refresh(booking)

    return schemas.CropAssayResponse(
        token_id=booking.token_id,
        crop_name=booking.crop_name,
        grade=grade,
        status=booking.status,
        assigned_auction_bay=bay,
        message=msg
    )