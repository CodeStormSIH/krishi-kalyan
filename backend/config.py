# backend/config.py
import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Explicitly load .env into os.environ
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./krishi.db"
    SECRET_KEY: str = "default_secret"
    ENVIRONMENT: str = "development"
    FAST2SMS_API_KEY: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    TWOFACTOR_API_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()