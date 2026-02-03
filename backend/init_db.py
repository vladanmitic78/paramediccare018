"""
Database initialization script - runs on backend startup
Creates default superadmin if not exists
"""
import bcrypt
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os

async def init_database():
    """Initialize database with default data if needed"""
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'paramedic_care_018')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Check if superadmin exists
    superadmin = await db.users.find_one({'email': 'vladanmitic@gmail.com'})
    
    if not superadmin:
        print("Creating Super Admin user...")
        password = 'Ipponluka_78'
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        
        await db.users.insert_one({
            'id': 'superadmin-001',
            'email': 'vladanmitic@gmail.com',
            'password': hashed,
            'full_name': 'Vladan Mitic',
            'role': 'superadmin',
            'language': 'sr',
            'is_active': True,
            'is_verified': True,
            'created_at': datetime.now(timezone.utc).isoformat()
        })
        print("✓ Super Admin created: vladanmitic@gmail.com")
    else:
        print("✓ Super Admin already exists")
    
    # Create indexes for better performance
    await db.users.create_index("email", unique=True)
    await db.users.create_index("role")
    await db.bookings.create_index("status")
    await db.bookings.create_index("booking_date")
    await db.bookings.create_index([("created_at", -1)])
    print("✓ Database indexes created")
    
    client.close()

def run_init():
    """Run initialization"""
    asyncio.run(init_database())

if __name__ == "__main__":
    run_init()
