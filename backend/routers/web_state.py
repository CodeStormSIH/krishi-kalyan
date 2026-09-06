from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db


router = APIRouter(prefix="/api/v1/web", tags=["Web application state"])


@router.get("/state", response_model=schemas.WebStateResponse)
def get_web_state(db: Session = Depends(get_db)):
    state = db.query(models.WebAppState).filter(models.WebAppState.id == 1).first()
    if not state:
        return schemas.WebStateResponse(data=None, updated_at=None)
    return schemas.WebStateResponse(data=state.data, updated_at=state.updated_at)


@router.put("/state", response_model=schemas.WebStateResponse)
def save_web_state(req: schemas.WebStateUpdateRequest, db: Session = Depends(get_db)):
    state = db.query(models.WebAppState).filter(models.WebAppState.id == 1).first()
    if state:
        state.data = req.data
    else:
        state = models.WebAppState(id=1, data=req.data)
        db.add(state)
    db.commit()
    db.refresh(state)
    return schemas.WebStateResponse(data=state.data, updated_at=state.updated_at)
