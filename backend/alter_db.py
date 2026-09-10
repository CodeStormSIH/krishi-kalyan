import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE bookings ADD COLUMN transport_mode VARCHAR DEFAULT 'OWN'"))
        print("Added transport_mode")
    except Exception as e:
        print(e)
    try:
        conn.execute(text("ALTER TABLE bookings ADD COLUMN assigned_vehicle VARCHAR"))
        print("Added assigned_vehicle")
    except Exception as e:
        print(e)
    conn.commit()
print("Done")
