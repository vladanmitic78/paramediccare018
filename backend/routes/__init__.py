# Routes package
# Domain-specific API routers extracted from server.py

from .auth import router as auth_router
from .fleet import router as fleet_router
from .schedule import router as schedule_router
from .notifications import router as notifications_router, send_sms_notification, send_booking_email_notification
from .medical import router as medical_router

__all__ = [
    'auth_router', 
    'fleet_router', 
    'schedule_router',
    'notifications_router',
    'medical_router',
    'send_sms_notification',
    'send_booking_email_notification'
]
