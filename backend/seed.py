import sys
import os

# Add current dir to path to import database
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import AdminAuth, engine, text
from config import settings

def seed():
    email = "test@example.com"
    password = "password123"
    full_name = "Test User"
    
    admin = AdminAuth()
    try:
        res = admin.create_user({"email": email, "password": password})
        user_id = res.user.id
        
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO public.profiles (id, email, full_name, plan)
                VALUES (:id, :email, :full_name, 'pro')
                ON CONFLICT (email) DO NOTHING
            """), {"id": user_id, "email": email, "full_name": full_name})
            conn.commit()
        print(f"Seed user {email} created successfully!")
    except Exception as e:
        print(f"Seed user creation skipped or failed: {e}")

if __name__ == "__main__":
    seed()
