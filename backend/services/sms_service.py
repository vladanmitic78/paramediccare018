"""
SMS Gateway Service - Flexible SMS provider abstraction
Supports multiple providers: Textbelt (free), Twilio, Custom HTTP
"""
import httpx
import logging
from typing import Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class SMSProvider(str, Enum):
    TEXTBELT = "textbelt"  # Free tier: 1 SMS/day per phone
    TWILIO = "twilio"
    INFOBIP = "infobip"
    CUSTOM = "custom"  # Custom HTTP endpoint


class SMSConfig(BaseModel):
    provider: SMSProvider = SMSProvider.TEXTBELT
    api_key: str = "textbelt"  # Default free key
    api_secret: Optional[str] = None  # For providers that need it (e.g., Twilio)
    sender_id: Optional[str] = None  # Sender phone number or ID
    custom_endpoint: Optional[str] = None  # For custom providers
    custom_headers: Optional[Dict[str, str]] = None
    custom_payload_template: Optional[str] = None  # JSON template with {phone}, {message}
    enabled: bool = True


class SMSResult(BaseModel):
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None
    provider: str
    quota_remaining: Optional[int] = None


class SMSService:
    """SMS Gateway Service with multiple provider support"""
    
    def __init__(self, config: SMSConfig):
        self.config = config
    
    async def send_sms(self, phone: str, message: str) -> SMSResult:
        """Send SMS using configured provider"""
        if not self.config.enabled:
            return SMSResult(
                success=False,
                error="SMS service is disabled",
                provider=self.config.provider
            )
        
        # Normalize phone number
        phone = self._normalize_phone(phone)
        
        try:
            if self.config.provider == SMSProvider.TEXTBELT:
                return await self._send_textbelt(phone, message)
            elif self.config.provider == SMSProvider.TWILIO:
                return await self._send_twilio(phone, message)
            elif self.config.provider == SMSProvider.INFOBIP:
                return await self._send_infobip(phone, message)
            elif self.config.provider == SMSProvider.CUSTOM:
                return await self._send_custom(phone, message)
            else:
                return SMSResult(
                    success=False,
                    error=f"Unknown provider: {self.config.provider}",
                    provider=self.config.provider
                )
        except Exception as e:
            logger.error(f"SMS send error: {e}")
            return SMSResult(
                success=False,
                error=str(e),
                provider=self.config.provider
            )
    
    def _normalize_phone(self, phone: str) -> str:
        """Normalize phone number to E.164 format"""
        # Remove spaces, dashes, parentheses
        phone = ''.join(c for c in phone if c.isdigit() or c == '+')
        # Add + if missing and starts with country code
        if not phone.startswith('+') and len(phone) > 10:
            phone = '+' + phone
        return phone
    
    async def _send_textbelt(self, phone: str, message: str) -> SMSResult:
        """Send SMS via Textbelt (free tier: 1 SMS/day per phone)"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://textbelt.com/text',
                data={
                    'phone': phone,
                    'message': message,
                    'key': self.config.api_key or 'textbelt'
                },
                timeout=30.0
            )
            data = response.json()
            
            return SMSResult(
                success=data.get('success', False),
                message_id=data.get('textId'),
                error=data.get('error') or data.get('message') if not data.get('success') else None,
                provider='textbelt',
                quota_remaining=data.get('quotaRemaining')
            )
    
    async def _send_twilio(self, phone: str, message: str) -> SMSResult:
        """Send SMS via Twilio"""
        if not self.config.api_secret or not self.config.sender_id:
            return SMSResult(
                success=False,
                error="Twilio requires api_key (Account SID), api_secret (Auth Token), and sender_id (From number)",
                provider='twilio'
            )
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f'https://api.twilio.com/2010-04-01/Accounts/{self.config.api_key}/Messages.json',
                auth=(self.config.api_key, self.config.api_secret),
                data={
                    'To': phone,
                    'From': self.config.sender_id,
                    'Body': message
                },
                timeout=30.0
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                return SMSResult(
                    success=True,
                    message_id=data.get('sid'),
                    provider='twilio'
                )
            else:
                data = response.json()
                return SMSResult(
                    success=False,
                    error=data.get('message', 'Unknown Twilio error'),
                    provider='twilio'
                )
    
    async def _send_infobip(self, phone: str, message: str) -> SMSResult:
        """Send SMS via Infobip"""
        if not self.config.api_key:
            return SMSResult(
                success=False,
                error="Infobip requires api_key",
                provider='infobip'
            )
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://api.infobip.com/sms/2/text/advanced',
                headers={
                    'Authorization': f'App {self.config.api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'messages': [{
                        'destinations': [{'to': phone}],
                        'from': self.config.sender_id or 'ParaCare',
                        'text': message
                    }]
                },
                timeout=30.0
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                messages = data.get('messages', [{}])
                return SMSResult(
                    success=True,
                    message_id=messages[0].get('messageId') if messages else None,
                    provider='infobip'
                )
            else:
                return SMSResult(
                    success=False,
                    error=f"Infobip error: {response.status_code}",
                    provider='infobip'
                )
    
    async def _send_custom(self, phone: str, message: str) -> SMSResult:
        """Send SMS via custom HTTP endpoint"""
        if not self.config.custom_endpoint:
            return SMSResult(
                success=False,
                error="Custom provider requires custom_endpoint",
                provider='custom'
            )
        
        # Build payload
        if self.config.custom_payload_template:
            import json
            payload_str = self.config.custom_payload_template.replace('{phone}', phone).replace('{message}', message)
            payload = json.loads(payload_str)
        else:
            payload = {'phone': phone, 'message': message}
        
        headers = {'Content-Type': 'application/json'}
        if self.config.custom_headers:
            headers.update(self.config.custom_headers)
        if self.config.api_key:
            headers['Authorization'] = f'Bearer {self.config.api_key}'
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.config.custom_endpoint,
                headers=headers,
                json=payload,
                timeout=30.0
            )
            
            success = response.status_code in [200, 201, 202]
            return SMSResult(
                success=success,
                message_id=str(response.status_code),
                error=None if success else f"HTTP {response.status_code}",
                provider='custom'
            )


# SMS Templates for the application
class SMSTemplates:
    """Pre-defined SMS templates for the transport system"""
    
    @staticmethod
    def booking_confirmation(patient_name: str, date: str, time: str, language: str = 'sr') -> str:
        if language == 'sr':
            return f"Poštovani {patient_name}, vaš transport je zakazan za {date} u {time}. Paramedic Care 018"
        return f"Dear {patient_name}, your transport is scheduled for {date} at {time}. Paramedic Care 018"
    
    @staticmethod
    def driver_assigned(patient_name: str, driver_name: str, vehicle: str, language: str = 'sr') -> str:
        if language == 'sr':
            return f"Vozač {driver_name} ({vehicle}) je dodeljen za vaš transport. Paramedic Care 018"
        return f"Driver {driver_name} ({vehicle}) has been assigned to your transport. Paramedic Care 018"
    
    @staticmethod
    def pickup_reminder(patient_name: str, time: str, language: str = 'sr') -> str:
        if language == 'sr':
            return f"Poštovani {patient_name}, podsetnik: vaš transport počinje za 30 minuta ({time}). Paramedic Care 018"
        return f"Dear {patient_name}, reminder: your transport starts in 30 minutes ({time}). Paramedic Care 018"
    
    @staticmethod
    def driver_arriving(eta_minutes: int, language: str = 'sr') -> str:
        if language == 'sr':
            return f"Vozač stiže za {eta_minutes} minuta. Paramedic Care 018"
        return f"Driver arriving in {eta_minutes} minutes. Paramedic Care 018"
    
    @staticmethod
    def transport_completed(language: str = 'sr') -> str:
        if language == 'sr':
            return "Vaš transport je završen. Hvala što koristite Paramedic Care 018."
        return "Your transport has been completed. Thank you for using Paramedic Care 018."
    
    @staticmethod
    def invoice_reminder(patient_name: str, amount: str, due_date: str, language: str = 'sr') -> str:
        if language == 'sr':
            return f"Poštovani {patient_name}, podsetnik za fakturu: {amount} RSD, rok: {due_date}. Paramedic Care 018"
        return f"Dear {patient_name}, invoice reminder: {amount} RSD, due: {due_date}. Paramedic Care 018"
