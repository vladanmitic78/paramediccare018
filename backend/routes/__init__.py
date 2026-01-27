# Routes package
# Domain-specific API routers extracted from server.py

from .auth import router as auth_router
from .fleet import router as fleet_router

__all__ = ['auth_router', 'fleet_router']
