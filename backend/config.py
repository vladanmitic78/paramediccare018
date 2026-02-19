"""
Configuration and database setup for Paramedic Care 018
"""
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
import os
import logging

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'paramedic-care-018-secret-key-2024')
JWT_ALGORITHM = "HS256"
# JWT Configuration
JWT_EXPIRATION_HOURS = 168  # 7 days for longer sessions

# Email Settings
SMTP_HOST = os.environ.get('SMTP_HOST', 'mailcluster.loopia.se')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 465))
INFO_EMAIL = os.environ.get('INFO_EMAIL', 'info@paramedic-care018.rs')
INFO_PASS = os.environ.get('INFO_PASS', 'Ambulanta!SSSS2026')
TRANSPORT_EMAIL = os.environ.get('TRANSPORT_EMAIL', 'transport@paramedic-care018.rs')
MEDICAL_EMAIL = os.environ.get('MEDICAL_EMAIL', 'ambulanta@paramedic-care018.rs')

# Frontend URL for verification links
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://paramedic-care-018-1.preview.emergentagent.com')

# Verification token expiration
VERIFICATION_TOKEN_HOURS = 24

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
