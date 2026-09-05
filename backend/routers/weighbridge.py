from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/api/v1/weighbridge",
    tags=["Weighbridge & Anti-Fraud"]
)

@router.post("/record-gross", response_model=schemas.WeighbridgeResponse)
def record_gross_weight(req: schemas.WeighbridgeGrossRequest, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.token_id == req.token_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Token not found")

    if booking.status not in ["GATE_IN", "BOOKED"]:
        raise HTTPException(status_code=400, detail="Vehicle must be checked in at gate before weighment")

    booking.gross_weight_quintal = req.gross_weight_quintal
    booking.status = "GROSS_WEIGHED"
    db.commit()
    db.refresh(booking)

    return schemas.WeighbridgeResponse(
        token_id=booking.token_id,
        status=booking.status,
        declared_quantity_quintal=booking.quantity_quintal,
        net_weight_quintal=None,
        variance_percent=None,
        fraud_flag=False,
        assigned_status="GROSS_RECORDED",
        message=f"Gross weight of {req.gross_weight_quintal} Qtl recorded successfully by operator {req.weighbridge_operator}."
    )

@router.post("/record-tare", response_model=schemas.WeighbridgeResponse)
def record_tare_weight(req: schemas.WeighbridgeTareRequest, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.token_id == req.token_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Token not found")

    if not booking.gross_weight_quintal:
        raise HTTPException(status_code=400, detail="Gross weight not recorded yet. Cannot record tare weight.")

    if req.tare_weight_quintal >= booking.gross_weight_quintal:
        raise HTTPException(status_code=400, detail="Tare weight cannot be greater than or equal to gross weight")

    net_weight = round(booking.gross_weight_quintal - req.tare_weight_quintal, 2)
    declared_qty = booking.quantity_quintal
    variance = round(abs(net_weight - declared_qty) / declared_qty * 100, 2) if declared_qty > 0 else 0.0

    booking.tare_weight_quintal = req.tare_weight_quintal
    booking.net_weight_quintal = net_weight
    booking.weight_variance_percent = variance

    # Anti-Fraud Check (> 15% discrepancy)
    if variance > 15.0:
        booking.fraud_flag = True
        booking.fraud_reason = f"Severe Weight Discrepancy: {variance}% mismatch from declared quantity."
        booking.status = "FLAGGED_FOR_AUDIT"
        msg = f"FRAUD ALERT: High weight discrepancy detected ({variance}%). Unloading flagged for supervisor inspection."
    else:
        booking.fraud_flag = False
        booking.status = "WEIGHMENT_VERIFIED"
        msg = f"Weighment verified. Net weight {net_weight} Qtl (variance {variance}% within permissible threshold)."

    db.commit()
    db.refresh(booking)

    return schemas.WeighbridgeResponse(
        token_id=booking.token_id,
        status=booking.status,
        declared_quantity_quintal=declared_qty,
        net_weight_quintal=net_weight,
        variance_percent=variance,
        fraud_flag=booking.fraud_flag,
        assigned_status=booking.status,
        message=msg
    )