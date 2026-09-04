import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import farmer, gate, admin

# Supabase PostgreSQL Database tables auto-create honge
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="KisanSetu Backend API",
    description="Anti-Fraud & Dynamic Mandi Logistics Engine (Supabase PostgreSQL Backed)"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers registration
app.include_router(farmer.router)
app.include_router(gate.router)
app.include_router(admin.router)

@app.get("/", tags=["System"])
def health_check():
    return {"status": "ONLINE", "service": "KisanSetu Backend"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)