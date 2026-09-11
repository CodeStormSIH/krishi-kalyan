from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
import models
from database import engine, get_db
from fastapi import Depends
from routers import farmer, gate, admin, weighbridge, assaying, auth, web_state, bookings, analytics

# Supabase tables check/create
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="KisanSetu Backend API",
    description="Smart Mandi Congestion & Gate Management Backend",
    version="1.0.0"
)

@app.on_event("startup")
def seed_admin():
    db = next(get_db())
    admin_user = db.query(models.User).filter(models.User.role == "admin").first()
    if not admin_user:
        print("[SEED] No admin user found. Creating default Super Admin.")
        admin_user = models.User(
            phone_number="admin",
            full_name="Super Admin",
            role="admin",
        )
        db.add(admin_user)
        db.flush()
        
        from routers.portal_auth import PortalAccount, password_hash
        admin_account = PortalAccount(
            user_id=admin_user.id,
            username="admin",
            role="admin",
            phone="admin",
            password_hash=password_hash("AdminPassword@123"),
            aadhaar_digest="admin_aadhaar",
            active=True
        )
        db.add(admin_account)
        db.commit()
        print("[SEED] Super Admin created: admin / AdminPassword@123")


# Frontend integration ke liye CORS open
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "ONLINE", "message": "KisanSetu API is up and running"}

# Routers mounting
app.include_router(farmer.router)
app.include_router(gate.router)
app.include_router(admin.router)
app.include_router(weighbridge.router)
app.include_router(assaying.router)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(web_state.router)
app.include_router(bookings.router)
app.include_router(analytics.router)

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Readiness check used by the frontend and hosting platforms.

    A successful response confirms both the API process and its configured
    database connection, instead of reporting healthy while the database is
    unavailable.
    """
    db.execute(text("SELECT 1"))
    return {
        "status": "healthy",
        "services": {"api": "connected", "database": "connected"},
    }
