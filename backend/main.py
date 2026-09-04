from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine
from routers import farmer, gate

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