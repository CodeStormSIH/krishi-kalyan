from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
import models
from database import engine, get_db
from fastapi import Depends
from routers import farmer, gate, admin, weighbridge, assaying, auth, web_state, bookings

# Supabase tables check/create
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="KisanSetu Backend API",
    description="Smart Mandi Congestion & Gate Management Backend",
    version="1.0.0"
)

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
