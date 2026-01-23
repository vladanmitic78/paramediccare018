"""
Driver-related Pydantic models
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict
from fastapi import WebSocket


class DriverStatus:
    OFFLINE = "offline"
    AVAILABLE = "available"
    ASSIGNED = "assigned"
    EN_ROUTE = "en_route"
    ON_SITE = "on_site"
    TRANSPORTING = "transporting"


class DriverLocationUpdate(BaseModel):
    latitude: float
    longitude: float
    speed: Optional[float] = None
    heading: Optional[float] = None
    accuracy: Optional[float] = None


class DriverStatusUpdate(BaseModel):
    status: str
    booking_id: Optional[str] = None


class DriverAssignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    booking_id: str
    patient_name: str
    pickup_address: str
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    destination_address: str
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    preferred_date: str
    preferred_time: str
    mobility_status: str
    transport_reason: str
    contact_phone: str
    status: str


class ConnectionManager:
    """WebSocket connection manager for real-time driver updates"""
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, driver_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[driver_id] = websocket

    def disconnect(self, driver_id: str):
        if driver_id in self.active_connections:
            del self.active_connections[driver_id]

    async def send_personal_message(self, driver_id: str, message: dict):
        if driver_id in self.active_connections:
            await self.active_connections[driver_id].send_json(message)

    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_json(message)
