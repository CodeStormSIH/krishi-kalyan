from fastapi import APIRouter

router = APIRouter(prefix="/admin", tags=["Admin & Audit Module"])

@router.get("/ping")
def admin_status():
    return {"status": "Admin router initialized"}