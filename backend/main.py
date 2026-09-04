# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
from routers import farmer, gate, admin

# Supabase me tables create / verify karne ke liye
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Krishi Kalyan - Smart Mandi Logistics Engine",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers mount karein
app.include_router(farmer.router)
app.include_router(gate.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {"status": "ONLINE","message": "Krishi Kalyan Logistics API is running smoothly."}