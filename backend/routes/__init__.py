# Routes package
# Domain-specific API routers extracted from server.py

from .auth import router as auth_router
from .fleet import router as fleet_router
from .schedule import router as schedule_router
from .bookings import router as bookings_router
from .driver import router as driver_router

__all__ = [
    'auth_router',
    'fleet_router', 
    'schedule_router',
    'bookings_router',
    'driver_router'
]
