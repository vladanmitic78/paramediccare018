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
    
    # Seed page_content - ensure required sections exist (upsert missing ones)
    print("Checking page_content collection...")
    
    # Default page content with placeholder images
    default_content = [
        # Medical Care page - Team section
        {
            "page": "medical-care",
            "section": "team",
            "title_en": "Our Team of Professionals",
            "title_sr": "Naš tim profesionalaca",
            "content_en": "Our medical team consists of experienced professionals dedicated to providing the best possible care. Each team member undergoes regular training to stay up-to-date with the latest medical practices.",
            "content_sr": "Naš medicinski tim se sastoji od iskusnih profesionalaca posvećenih pružanju najbolje moguće nege. Svaki član tima prolazi redovnu obuku kako bi bio u toku sa najnovijim medicinskim praksama.",
            "image_url": "/api/uploads/20260203_203008_e923822e.jpg"
        },
        # Transport page - Fleet section
        {
            "page": "transport",
            "section": "fleet",
            "title_en": "Modern Vehicle Fleet",
            "title_sr": "Moderna flota vozila",
            "content_en": "Our ambulance fleet is equipped with the most modern medical equipment. All vehicles are air-conditioned and regularly serviced to ensure maximum comfort and safety for patients.",
            "content_sr": "Naša flota sanitetskih vozila opremljena je najmodernijom medicinskom opremom. Sva vozila su klimatizovana i redovno servisirana kako bi se osigurao maksimalan komfor i bezbednost pacijenata.",
            "image_url": "/api/uploads/20260203_203024_10a07490.jpg"
        },
        # Home page - Hero section
        {
            "page": "home",
            "section": "hero",
            "title_en": "Professional Medical Transport",
            "title_sr": "Profesionalni medicinski transport",
            "content_en": "24/7 emergency medical transport services with professional care",
            "content_sr": "Hitne medicinske usluge transporta 24/7 sa profesionalnom negom",
            "image_url": None
        },
        # Medical Care page - Services title
        {
            "page": "medical-care",
            "section": "services-title",
            "title_en": "Our Medical Services",
            "title_sr": "Naše medicinske usluge",
            "content_en": "We provide comprehensive medical care services",
            "content_sr": "Pružamo sveobuhvatne medicinske usluge",
            "image_url": None
        },
        # Transport page - Services title
        {
            "page": "transport",
            "section": "services-title",
            "title_en": "Our Transport Services",
            "title_sr": "Naše usluge transporta",
            "content_en": "Safe and reliable medical transport solutions",
            "content_sr": "Bezbedna i pouzdana rešenja za medicinski transport",
            "image_url": None
        }
    ]
    
    # Upsert each content item (insert if not exists, skip if exists)
    inserted_count = 0
    for content in default_content:
        result = await db.page_content.update_one(
            {"page": content["page"], "section": content["section"]},
            {"$setOnInsert": content},
            upsert=True
        )
        if result.upserted_id:
            inserted_count += 1
    
    if inserted_count > 0:
        print(f"✓ Inserted {inserted_count} new page_content documents")
    else:
        print("✓ All required page_content documents already exist")
    
    # Create indexes for better performance
    await db.users.create_index("email", unique=True)
    await db.users.create_index("role")
    await db.bookings.create_index("status")
    await db.bookings.create_index("booking_date")
    await db.bookings.create_index([("created_at", -1)])
    await db.page_content.create_index([("page", 1), ("section", 1)], unique=True)
    print("✓ Database indexes created")
    
    client.close()

def run_init():
    """Run initialization"""
    asyncio.run(init_database())

if __name__ == "__main__":
    run_init()
