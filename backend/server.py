from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import base64
import shutil
import io
import asyncio
import json
import httpx  # For making HTTP requests to OSRM

# PDF Generation
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

# Import configuration
from config import (
    db, client, ROOT_DIR, UPLOADS_DIR, 
    JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS,
    SMTP_HOST, SMTP_PORT, INFO_EMAIL, INFO_PASS,
    TRANSPORT_EMAIL, MEDICAL_EMAIL, FRONTEND_URL,
    VERIFICATION_TOKEN_HOURS, logger
)

# Import models from models package
from models import (
    UserRole, UserCreate, UserLogin, UserResponse, TokenResponse,
    RoleUpdate, StatusUpdate,
    BookingStatus, MobilityStatus, BookingCreate, BookingResponse,
    BookingStatusUpdate, BookingFullUpdate, PatientBookingCreate, PatientBookingResponse,
    SavedAddress, EmergencyContact, PatientProfileUpdate,
    InvoiceResponse, NotificationResponse, ContactCreate, ContactResponse,
    MedicalCondition, Medication, Allergy, MedicalEmergencyContact,
    PatientMedicalProfileCreate, PatientMedicalProfileUpdate,
    PatientMedicalProfileResponse, VitalSignsEntry, VitalSignsResponse,
    MedicalCheckCreate, MedicalCheckResponse,
    AvailabilityStatus, AvailabilityCreate, AvailabilityUpdate, AvailabilityResponse,
    DriverStatus, DriverLocationUpdate, DriverStatusUpdate,
    DriverAssignment, ConnectionManager,
    VehicleStatus, VehicleType, TeamRole, TeamMemberAssignment,
    ShiftSchedule, VehicleCreate, VehicleUpdate, VehicleResponse,
    TeamAssignmentCreate, TeamAssignmentUpdate, MissionTeamLock,
    TeamAuditEntry, MissionTeamValidation,
    ContentCreate, ContentResponse,
    PageContentCreate, PageContentResponse,
    ServiceCreate, ServiceResponse
)

# Import auth utilities
from utils.auth import (
    hash_password, verify_password, create_token,
    get_current_user, get_optional_user, require_roles, security
)

# Import email utilities
from utils.email import (
    send_email, get_email_header, get_email_footer,
    get_internal_notification_template, get_transport_email_template
)

# Import SMS service
from services.sms_service import SMSService, SMSConfig, SMSProvider, SMSTemplates, SMSResult

# Import extracted routers
from routes.fleet import router as fleet_router
from routes.schedule import router as schedule_router
from routes.notifications import router as notifications_router, send_sms_notification, send_booking_email_notification
from routes.medical import router as medical_router
from routes.bookings import router as bookings_router

# Create the main app
app = FastAPI(title="Paramedic Care 018 API")
api_router = APIRouter(prefix="/api")

# Include extracted routers
api_router.include_router(fleet_router)
api_router.include_router(schedule_router)
api_router.include_router(notifications_router)
api_router.include_router(medical_router)
api_router.include_router(bookings_router)

# WebSocket connection manager instance
manager = ConnectionManager()

# ============ EMAIL TEMPLATES (not yet fully extracted) ============
# Note: get_email_header, get_email_footer, send_email, and get_internal_notification_template
# are now imported from utils.email. The remaining templates below will be extracted in future refactoring.

def get_verification_email_template(full_name: str, verification_link: str, language: str = "sr"):
    """Email template for email verification"""
    if language == "en":
        subject = "Verify Your Email - Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f0f4f8;">
            {get_email_header()}
            <div style="padding: 40px 30px; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <!-- Icon -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); border-radius: 50%; padding: 20px; box-shadow: 0 10px 40px rgba(14, 165, 233, 0.3);">
                        <span style="font-size: 40px;">✉️</span>
                    </div>
                </div>
                
                <!-- Title -->
                <h1 style="color: #0f172a; margin-bottom: 10px; text-align: center; font-size: 28px; font-weight: 700;">Verify Your Email</h1>
                <p style="color: #64748b; text-align: center; font-size: 16px; margin-bottom: 30px;">One more step to complete your registration</p>
                
                <!-- Greeting -->
                <p style="color: #334155; line-height: 1.8; font-size: 16px;">Hello <strong style="color: #0ea5e9;">{full_name}</strong>,</p>
                <p style="color: #334155; line-height: 1.8; font-size: 16px;">Thank you for registering with Paramedic Care 018! To complete your registration and access all features, please verify your email address by clicking the button below:</p>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                    <a href="{verification_link}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 50px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 20px rgba(14, 165, 233, 0.4); transition: all 0.3s;">
                        ✓ Verify My Email
                    </a>
                </div>
                
                <!-- Alternative Link -->
                <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 30px 0;">
                    <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0;">If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="color: #0ea5e9; font-size: 12px; word-break: break-all; margin: 0; background-color: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">{verification_link}</p>
                </div>
                
                <!-- Security Note -->
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                        <strong>⚠️ Security Note:</strong> This verification link will expire in 24 hours. If you didn't create an account with us, please ignore this email.
                    </p>
                </div>
                
                <!-- Footer Message -->
                <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 30px;">
                    Need help? Contact us at <a href="mailto:info@paramedic-care018.rs" style="color: #0ea5e9;">info@paramedic-care018.rs</a>
                </p>
            </div>
            {get_email_footer("en")}
        </body>
        </html>
        """
    else:
        subject = "Potvrdite Vašu Email Adresu - Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f0f4f8;">
            {get_email_header()}
            <div style="padding: 40px 30px; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <!-- Icon -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); border-radius: 50%; padding: 20px; box-shadow: 0 10px 40px rgba(14, 165, 233, 0.3);">
                        <span style="font-size: 40px;">✉️</span>
                    </div>
                </div>
                
                <!-- Title -->
                <h1 style="color: #0f172a; margin-bottom: 10px; text-align: center; font-size: 28px; font-weight: 700;">Potvrdite Vašu Email Adresu</h1>
                <p style="color: #64748b; text-align: center; font-size: 16px; margin-bottom: 30px;">Još jedan korak do završetka registracije</p>
                
                <!-- Greeting -->
                <p style="color: #334155; line-height: 1.8; font-size: 16px;">Poštovani/a <strong style="color: #0ea5e9;">{full_name}</strong>,</p>
                <p style="color: #334155; line-height: 1.8; font-size: 16px;">Hvala vam što ste se registrovali na Paramedic Care 018! Da biste završili registraciju i pristupili svim funkcijama, molimo vas da potvrdite vašu email adresu klikom na dugme ispod:</p>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                    <a href="{verification_link}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 50px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 20px rgba(14, 165, 233, 0.4); transition: all 0.3s;">
                        ✓ Potvrdi Email
                    </a>
                </div>
                
                <!-- Alternative Link -->
                <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 30px 0;">
                    <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0;">Ako dugme ne radi, kopirajte i nalepite ovaj link u vaš pretraživač:</p>
                    <p style="color: #0ea5e9; font-size: 12px; word-break: break-all; margin: 0; background-color: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">{verification_link}</p>
                </div>
                
                <!-- Security Note -->
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                        <strong>⚠️ Bezbednosna napomena:</strong> Ovaj link za verifikaciju ističe za 24 sata. Ako niste kreirali nalog kod nas, molimo vas da ignorišete ovaj email.
                    </p>
                </div>
                
                <!-- Footer Message -->
                <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 30px;">
                    Potrebna vam je pomoć? Kontaktirajte nas na <a href="mailto:info@paramedic-care018.rs" style="color: #0ea5e9;">info@paramedic-care018.rs</a>
                </p>
            </div>
            {get_email_footer("sr")}
        </body>
        </html>
        """
    return subject, body

def get_registration_email_template(full_name: str, email: str, language: str = "sr"):
    """Email template for successful registration - sent after email verification"""
    if language == "en":
        subject = "🎉 Welcome to Paramedic Care 018!"
        body = f"""
        <html>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f0f4f8;">
            {get_email_header()}
            <div style="padding: 40px 30px; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <!-- Success Icon -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; padding: 25px; box-shadow: 0 10px 40px rgba(16, 185, 129, 0.3);">
                        <span style="font-size: 50px;">🎉</span>
                    </div>
                </div>
                
                <!-- Title -->
                <h1 style="color: #0f172a; margin-bottom: 10px; text-align: center; font-size: 32px; font-weight: 700;">Welcome to the Family!</h1>
                <p style="color: #10b981; text-align: center; font-size: 18px; font-weight: 600; margin-bottom: 30px;">Your account is now verified and ready to use</p>
                
                <!-- Greeting -->
                <p style="color: #334155; line-height: 1.8; font-size: 16px;">Dear <strong style="color: #0ea5e9;">{full_name}</strong>,</p>
                <p style="color: #334155; line-height: 1.8; font-size: 16px;">Congratulations! Your email has been verified and your Paramedic Care 018 account is now fully activated.</p>
                
                <!-- Account Info Card -->
                <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 16px; padding: 25px; margin: 30px 0; border: 1px solid #bae6fd;">
                    <h3 style="color: #0284c7; margin: 0 0 15px 0; font-size: 16px;">📋 Account Details</h3>
                    <table style="width: 100%;">
                        <tr>
                            <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Email:</td>
                            <td style="color: #0f172a; padding: 8px 0; font-size: 14px; font-weight: 600;">{email}</td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Status:</td>
                            <td style="padding: 8px 0;"><span style="background-color: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">✓ Verified</span></td>
                        </tr>
                    </table>
                </div>
                
                <!-- Features -->
                <h3 style="color: #0f172a; font-size: 18px; margin-bottom: 20px;">What you can do now:</h3>
                <div style="display: table; width: 100%;">
                    <div style="display: table-row;">
                        <div style="display: table-cell; padding: 15px; background-color: #fef3c7; border-radius: 12px; text-align: center; width: 48%;">
                            <span style="font-size: 30px;">🚑</span>
                            <p style="color: #92400e; font-weight: 600; margin: 10px 0 5px 0; font-size: 14px;">Book Transport</p>
                            <p style="color: #a16207; margin: 0; font-size: 12px;">Schedule medical transport</p>
                        </div>
                        <div style="display: table-cell; width: 4%;"></div>
                        <div style="display: table-cell; padding: 15px; background-color: #dbeafe; border-radius: 12px; text-align: center; width: 48%;">
                            <span style="font-size: 30px;">📊</span>
                            <p style="color: #1e40af; font-weight: 600; margin: 10px 0 5px 0; font-size: 14px;">Track Status</p>
                            <p style="color: #3b82f6; margin: 0; font-size: 12px;">Real-time updates</p>
                        </div>
                    </div>
                </div>
                
                <div style="display: table; width: 100%; margin-top: 15px;">
                    <div style="display: table-row;">
                        <div style="display: table-cell; padding: 15px; background-color: #f3e8ff; border-radius: 12px; text-align: center; width: 48%;">
                            <span style="font-size: 30px;">📜</span>
                            <p style="color: #7c3aed; font-weight: 600; margin: 10px 0 5px 0; font-size: 14px;">View History</p>
                            <p style="color: #8b5cf6; margin: 0; font-size: 12px;">Access past bookings</p>
                        </div>
                        <div style="display: table-cell; width: 4%;"></div>
                        <div style="display: table-cell; padding: 15px; background-color: #dcfce7; border-radius: 12px; text-align: center; width: 48%;">
                            <span style="font-size: 30px;">💬</span>
                            <p style="color: #166534; font-weight: 600; margin: 10px 0 5px 0; font-size: 14px;">Get Support</p>
                            <p style="color: #22c55e; margin: 0; font-size: 12px;">24/7 assistance</p>
                        </div>
                    </div>
                </div>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                    <a href="https://paramedic-care018.rs/login" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 50px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 20px rgba(14, 165, 233, 0.4);">
                        Go to My Dashboard →
                    </a>
                </div>
                
                <!-- Emergency Contact -->
                <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #991b1b; font-weight: 600;">🚨 Emergency Contact</p>
                    <p style="margin: 0; color: #dc2626; font-size: 24px; font-weight: 700;">+381 18 123 456</p>
                    <p style="margin: 5px 0 0 0; color: #7f1d1d; font-size: 12px;">Available 24/7</p>
                </div>
                
                <p style="color: #334155; line-height: 1.8; margin-top: 30px; font-size: 16px;">Thank you for choosing Paramedic Care 018. We're here to help you whenever you need us.</p>
                
                <p style="color: #334155; line-height: 1.6; margin-top: 20px;">Warm regards,<br><strong style="color: #0ea5e9;">The Paramedic Care 018 Team</strong></p>
            </div>
            {get_email_footer("en")}
        </body>
        </html>
        """
    else:
        subject = "🎉 Dobrodošli u Paramedic Care 018!"
        body = f"""
        <html>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f0f4f8;">
            {get_email_header()}
            <div style="padding: 40px 30px; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <!-- Success Icon -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; padding: 25px; box-shadow: 0 10px 40px rgba(16, 185, 129, 0.3);">
                        <span style="font-size: 50px;">🎉</span>
                    </div>
                </div>
                
                <!-- Title -->
                <h1 style="color: #0f172a; margin-bottom: 10px; text-align: center; font-size: 32px; font-weight: 700;">Dobrodošli u našu porodicu!</h1>
                <p style="color: #10b981; text-align: center; font-size: 18px; font-weight: 600; margin-bottom: 30px;">Vaš nalog je verifikovan i spreman za korišćenje</p>
                
                <!-- Greeting -->
                <p style="color: #334155; line-height: 1.8; font-size: 16px;">Poštovani/a <strong style="color: #0ea5e9;">{full_name}</strong>,</p>
                <p style="color: #334155; line-height: 1.8; font-size: 16px;">Čestitamo! Vaš email je verifikovan i vaš Paramedic Care 018 nalog je sada potpuno aktiviran.</p>
                
                <!-- Account Info Card -->
                <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 16px; padding: 25px; margin: 30px 0; border: 1px solid #bae6fd;">
                    <h3 style="color: #0284c7; margin: 0 0 15px 0; font-size: 16px;">📋 Podaci o nalogu</h3>
                    <table style="width: 100%;">
                        <tr>
                            <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Email:</td>
                            <td style="color: #0f172a; padding: 8px 0; font-size: 14px; font-weight: 600;">{email}</td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Status:</td>
                            <td style="padding: 8px 0;"><span style="background-color: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">✓ Verifikovan</span></td>
                        </tr>
                    </table>
                </div>
                
                <!-- Features -->
                <h3 style="color: #0f172a; font-size: 18px; margin-bottom: 20px;">Šta sada možete da radite:</h3>
                <div style="display: table; width: 100%;">
                    <div style="display: table-row;">
                        <div style="display: table-cell; padding: 15px; background-color: #fef3c7; border-radius: 12px; text-align: center; width: 48%;">
                            <span style="font-size: 30px;">🚑</span>
                            <p style="color: #92400e; font-weight: 600; margin: 10px 0 5px 0; font-size: 14px;">Rezervišite Transport</p>
                            <p style="color: #a16207; margin: 0; font-size: 12px;">Zakažite medicinski prevoz</p>
                        </div>
                        <div style="display: table-cell; width: 4%;"></div>
                        <div style="display: table-cell; padding: 15px; background-color: #dbeafe; border-radius: 12px; text-align: center; width: 48%;">
                            <span style="font-size: 30px;">📊</span>
                            <p style="color: #1e40af; font-weight: 600; margin: 10px 0 5px 0; font-size: 14px;">Pratite Status</p>
                            <p style="color: #3b82f6; margin: 0; font-size: 12px;">Ažuriranja u realnom vremenu</p>
                        </div>
                    </div>
                </div>
                
                <div style="display: table; width: 100%; margin-top: 15px;">
                    <div style="display: table-row;">
                        <div style="display: table-cell; padding: 15px; background-color: #f3e8ff; border-radius: 12px; text-align: center; width: 48%;">
                            <span style="font-size: 30px;">📜</span>
                            <p style="color: #7c3aed; font-weight: 600; margin: 10px 0 5px 0; font-size: 14px;">Pregledajte Istoriju</p>
                            <p style="color: #8b5cf6; margin: 0; font-size: 12px;">Pristupite prošlim rezervacijama</p>
                        </div>
                        <div style="display: table-cell; width: 4%;"></div>
                        <div style="display: table-cell; padding: 15px; background-color: #dcfce7; border-radius: 12px; text-align: center; width: 48%;">
                            <span style="font-size: 30px;">💬</span>
                            <p style="color: #166534; font-weight: 600; margin: 10px 0 5px 0; font-size: 14px;">Dobijte Podršku</p>
                            <p style="color: #22c55e; margin: 0; font-size: 12px;">24/7 pomoć</p>
                        </div>
                    </div>
                </div>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                    <a href="https://paramedic-care018.rs/login" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 50px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 20px rgba(14, 165, 233, 0.4);">
                        Idi na Moj Panel →
                    </a>
                </div>
                
                <!-- Emergency Contact -->
                <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #991b1b; font-weight: 600;">🚨 Hitna linija</p>
                    <p style="margin: 0; color: #dc2626; font-size: 24px; font-weight: 700;">+381 18 123 456</p>
                    <p style="margin: 5px 0 0 0; color: #7f1d1d; font-size: 12px;">Dostupno 24/7</p>
                </div>
                
                <p style="color: #334155; line-height: 1.8; margin-top: 30px; font-size: 16px;">Hvala vam što ste izabrali Paramedic Care 018. Tu smo za vas kad god vam zatrebamo.</p>
                
                <p style="color: #334155; line-height: 1.6; margin-top: 20px;">Srdačan pozdrav,<br><strong style="color: #0ea5e9;">Tim Paramedic Care 018</strong></p>
            </div>
            {get_email_footer("sr")}
        </body>
        </html>
        """
    return subject, body

def get_admin_new_user_notification_template(user_name: str, user_email: str, user_phone: str, registration_time: str, language: str = "sr"):
    """Email template to notify admin of new user registration"""
    if language == "en":
        subject = "🆕 New User Registration - Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
            {get_email_header()}
            <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="display: inline-block; background-color: #dbeafe; border-radius: 50%; padding: 15px;">
                        <span style="font-size: 30px;">👤</span>
                    </div>
                </div>
                
                <h2 style="color: #0f172a; margin-bottom: 20px; text-align: center;">New User Registration</h2>
                <p style="color: #334155; line-height: 1.6; text-align: center;">A new user has registered on the Paramedic Care 018 platform.</p>
                
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h3 style="color: #0ea5e9; margin-top: 0; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px;">User Details</h3>
                    <table style="width: 100%; color: #334155;">
                        <tr>
                            <td style="padding: 10px 0; font-weight: bold; width: 35%;">Full Name:</td>
                            <td style="padding: 10px 0;">{user_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-weight: bold;">Email:</td>
                            <td style="padding: 10px 0;"><a href="mailto:{user_email}" style="color: #0ea5e9;">{user_email}</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-weight: bold;">Phone:</td>
                            <td style="padding: 10px 0;"><a href="tel:{user_phone}" style="color: #0ea5e9;">{user_phone}</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-weight: bold;">Registered:</td>
                            <td style="padding: 10px 0;">{registration_time}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #0369a1;"><strong>Action Required:</strong></p>
                    <p style="margin: 10px 0 0 0; color: #334155;">You can view and manage this user in the Admin Dashboard under User Management.</p>
                </div>
                
                <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 30px;">This is an automated notification from Paramedic Care 018 system.</p>
            </div>
            {get_email_footer("en")}
        </body>
        </html>
        """
    else:
        subject = "🆕 Nova registracija korisnika - Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
            {get_email_header()}
            <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="display: inline-block; background-color: #dbeafe; border-radius: 50%; padding: 15px;">
                        <span style="font-size: 30px;">👤</span>
                    </div>
                </div>
                
                <h2 style="color: #0f172a; margin-bottom: 20px; text-align: center;">Nova registracija korisnika</h2>
                <p style="color: #334155; line-height: 1.6; text-align: center;">Novi korisnik se registrovao na platformi Paramedic Care 018.</p>
                
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h3 style="color: #0ea5e9; margin-top: 0; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px;">Podaci o korisniku</h3>
                    <table style="width: 100%; color: #334155;">
                        <tr>
                            <td style="padding: 10px 0; font-weight: bold; width: 35%;">Ime i prezime:</td>
                            <td style="padding: 10px 0;">{user_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-weight: bold;">Email:</td>
                            <td style="padding: 10px 0;"><a href="mailto:{user_email}" style="color: #0ea5e9;">{user_email}</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-weight: bold;">Telefon:</td>
                            <td style="padding: 10px 0;"><a href="tel:{user_phone}" style="color: #0ea5e9;">{user_phone}</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-weight: bold;">Registrovan:</td>
                            <td style="padding: 10px 0;">{registration_time}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #0369a1;"><strong>Potrebna akcija:</strong></p>
                    <p style="margin: 10px 0 0 0; color: #334155;">Možete pregledati i upravljati ovim korisnikom u Admin panelu pod Upravljanje korisnicima.</p>
                </div>
                
                <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 30px;">Ovo je automatska notifikacija iz sistema Paramedic Care 018.</p>
            </div>
            {get_email_footer("sr")}
        </body>
        </html>
        """
    return subject, body

def get_contact_autoreply_template(name: str, inquiry_type: str, language: str = "sr"):
    """Email template for contact form auto-reply"""
    inquiry_labels = {
        "general": {"sr": "Opšti upit", "en": "General Inquiry"},
        "transport": {"sr": "Transport", "en": "Transport"},
        "medical": {"sr": "Medicinska nega", "en": "Medical Care"}
    }
    inquiry_label = inquiry_labels.get(inquiry_type, inquiry_labels["general"])
    
    if language == "en":
        subject = "We received your message - Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
            {get_email_header()}
            <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0f172a; margin-bottom: 20px;">Thank you for contacting us!</h2>
                <p style="color: #334155; line-height: 1.6;">Dear <strong>{name}</strong>,</p>
                <p style="color: #334155; line-height: 1.6;">We have received your message regarding <strong>{inquiry_label["en"]}</strong>.</p>
                
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e;"><strong>What happens next?</strong></p>
                    <p style="margin: 10px 0 0 0; color: #334155;">Our team will review your message and respond within 24 hours during business days.</p>
                </div>
                
                <p style="color: #334155; line-height: 1.6;">For urgent medical transport needs, please call us directly:</p>
                <p style="color: #0ea5e9; font-size: 20px; font-weight: bold; margin: 15px 0;">+381 18 123 456</p>
                
                <p style="color: #334155; line-height: 1.6; margin-top: 30px;">Best regards,<br><strong>Paramedic Care 018 Team</strong></p>
            </div>
            {get_email_footer("en")}
        </body>
        </html>
        """
    else:
        subject = "Primili smo vašu poruku - Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
            {get_email_header()}
            <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0f172a; margin-bottom: 20px;">Hvala vam što ste nas kontaktirali!</h2>
                <p style="color: #334155; line-height: 1.6;">Poštovani/a <strong>{name}</strong>,</p>
                <p style="color: #334155; line-height: 1.6;">Primili smo vašu poruku u vezi sa: <strong>{inquiry_label["sr"]}</strong>.</p>
                
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e;"><strong>Šta sledi?</strong></p>
                    <p style="margin: 10px 0 0 0; color: #334155;">Naš tim će pregledati vašu poruku i odgovoriti u roku od 24 sata tokom radnih dana.</p>
                </div>
                
                <p style="color: #334155; line-height: 1.6;">Za hitne potrebe medicinskog transporta, pozovite nas direktno:</p>
                <p style="color: #0ea5e9; font-size: 20px; font-weight: bold; margin: 15px 0;">+381 18 123 456</p>
                
                <p style="color: #334155; line-height: 1.6; margin-top: 30px;">Srdačan pozdrav,<br><strong>Tim Paramedic Care 018</strong></p>
            </div>
            {get_email_footer("sr")}
        </body>
        </html>
        """
    return subject, body

def get_booking_confirmation_template(patient_name: str, booking_date: str, start_point: str, end_point: str, booking_id: str, booking_type: str = "transport", language: str = "sr"):
    """Email template for booking confirmation (transport or medical care)"""
    
    if booking_type == "medical":
        icon_color = "#0ea5e9"
        type_label = {"sr": "Medicinska Nega", "en": "Medical Care"}
    else:
        icon_color = "#ef4444"
        type_label = {"sr": "Medicinski Transport", "en": "Medical Transport"}
    
    if language == "en":
        subject = f"Booking Confirmation - {type_label['en']} - Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
            {get_email_header()}
            <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="display: inline-block; background-color: #dcfce7; border-radius: 50%; padding: 15px;">
                        <span style="font-size: 30px;">✓</span>
                    </div>
                </div>
                
                <h2 style="color: #0f172a; margin-bottom: 20px; text-align: center;">Booking Confirmed!</h2>
                <p style="color: #334155; line-height: 1.6; text-align: center;">Your <strong>{type_label['en']}</strong> booking has been successfully submitted.</p>
                
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h3 style="color: {icon_color}; margin-top: 0; border-bottom: 2px solid {icon_color}; padding-bottom: 10px;">Booking Details</h3>
                    <table style="width: 100%; color: #334155;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; width: 40%;">Booking ID:</td>
                            <td style="padding: 8px 0;">{booking_id[:8]}...</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Patient Name:</td>
                            <td style="padding: 8px 0;">{patient_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Date & Time:</td>
                            <td style="padding: 8px 0;">{booking_date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Pickup Location:</td>
                            <td style="padding: 8px 0;">{start_point}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Destination:</td>
                            <td style="padding: 8px 0;">{end_point}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                            <td style="padding: 8px 0;"><span style="background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">PENDING</span></td>
                        </tr>
                    </table>
                </div>
                
                <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #0369a1;"><strong>What happens next?</strong></p>
                    <p style="margin: 10px 0 0 0; color: #334155;">Our team will review your booking and contact you to confirm the details. You will receive a confirmation call or SMS.</p>
                </div>
                
                <p style="color: #334155; line-height: 1.6;">For any questions or changes to your booking, please contact us:</p>
                <p style="color: #0ea5e9; font-size: 18px; font-weight: bold; margin: 10px 0;">+381 18 123 456</p>
                <p style="color: #64748b; font-size: 14px;">info@paramedic-care018.rs</p>
                
                <p style="color: #334155; line-height: 1.6; margin-top: 30px;">Best regards,<br><strong>Paramedic Care 018 Team</strong></p>
            </div>
            {get_email_footer("en")}
        </body>
        </html>
        """
    else:
        subject = f"Potvrda rezervacije - {type_label['sr']} - Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
            {get_email_header()}
            <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="display: inline-block; background-color: #dcfce7; border-radius: 50%; padding: 15px;">
                        <span style="font-size: 30px;">✓</span>
                    </div>
                </div>
                
                <h2 style="color: #0f172a; margin-bottom: 20px; text-align: center;">Rezervacija potvrđena!</h2>
                <p style="color: #334155; line-height: 1.6; text-align: center;">Vaša rezervacija za <strong>{type_label['sr']}</strong> je uspešno primljena.</p>
                
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h3 style="color: {icon_color}; margin-top: 0; border-bottom: 2px solid {icon_color}; padding-bottom: 10px;">Detalji rezervacije</h3>
                    <table style="width: 100%; color: #334155;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; width: 40%;">ID rezervacije:</td>
                            <td style="padding: 8px 0;">{booking_id[:8]}...</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Ime pacijenta:</td>
                            <td style="padding: 8px 0;">{patient_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Datum i vreme:</td>
                            <td style="padding: 8px 0;">{booking_date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Polazna lokacija:</td>
                            <td style="padding: 8px 0;">{start_point}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Odredište:</td>
                            <td style="padding: 8px 0;">{end_point}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                            <td style="padding: 8px 0;"><span style="background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">NA ČEKANJU</span></td>
                        </tr>
                    </table>
                </div>
                
                <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #0369a1;"><strong>Šta sledi?</strong></p>
                    <p style="margin: 10px 0 0 0; color: #334155;">Naš tim će pregledati vašu rezervaciju i kontaktirati vas radi potvrde detalja. Dobićete poziv ili SMS sa potvrdom.</p>
                </div>
                
                <p style="color: #334155; line-height: 1.6;">Za sva pitanja ili izmene rezervacije, kontaktirajte nas:</p>
                <p style="color: #0ea5e9; font-size: 18px; font-weight: bold; margin: 10px 0;">+381 18 123 456</p>
                <p style="color: #64748b; font-size: 14px;">info@paramedic-care018.rs</p>
                
                <p style="color: #334155; line-height: 1.6; margin-top: 30px;">Srdačan pozdrav,<br><strong>Tim Paramedic Care 018</strong></p>
            </div>
            {get_email_footer("sr")}
        </body>
        </html>
        """
    return subject, body

# ============ HEALTH CHECK ============

# Health check
@api_router.get("/health")
async def health():
    return {"status": "healthy", "service": "Paramedic Care 018 API"}

# ============ AUTH ROUTES ============

def create_verification_token(user_id: str) -> str:
    """Create a JWT token for email verification"""
    payload = {
        "user_id": user_id,
        "type": "email_verification",
        "exp": datetime.now(timezone.utc) + timedelta(hours=VERIFICATION_TOKEN_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_verification_token(token: str) -> dict:
    """Verify and decode the email verification token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "email_verification":
            raise HTTPException(status_code=400, detail="Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Verification link has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid verification token")

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        # Check if user exists but is not verified
        if not existing.get("is_verified", False):
            # Resend verification email
            verification_token = create_verification_token(existing["id"])
            verification_link = f"{FRONTEND_URL}/verify-email?token={verification_token}"
            subject, body = get_verification_email_template(existing["full_name"], verification_link, user_data.language)
            await send_email(user_data.email, subject, body)
            return {"message": "Verification email resent. Please check your inbox.", "requires_verification": True}
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    registration_time = datetime.now(timezone.utc)
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "phone": user_data.phone,
        "role": user_data.role if user_data.role in [UserRole.REGULAR, UserRole.DOCTOR, UserRole.NURSE, UserRole.DRIVER] else UserRole.REGULAR,
        "language": user_data.language,
        "is_active": True,
        "is_verified": False,  # Not verified until email confirmation
        "created_at": registration_time.isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Create verification token and send verification email
    verification_token = create_verification_token(user_id)
    verification_link = f"{FRONTEND_URL}/verify-email?token={verification_token}"
    
    subject, body = get_verification_email_template(user_data.full_name, verification_link, user_data.language)
    await send_email(user_data.email, subject, body)
    
    # Send notification email to admin
    admin_email = "info@paramedic-care018.rs"
    formatted_time = registration_time.strftime("%d.%m.%Y %H:%M")
    admin_subject, admin_body = get_admin_new_user_notification_template(
        user_data.full_name, 
        user_data.email, 
        user_data.phone or "N/A",
        formatted_time,
        "sr"  # Admin notification in Serbian
    )
    await send_email(admin_email, admin_subject, admin_body)
    
    return {"message": "Registration successful. Please check your email to verify your account.", "requires_verification": True}

@api_router.get("/auth/verify-email")
async def verify_email(token: str):
    """Verify user's email address"""
    payload = verify_verification_token(token)
    user_id = payload["user_id"]
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("is_verified", False):
        return {"message": "Email already verified", "already_verified": True}
    
    # Update user as verified
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_verified": True, "verified_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Send welcome email now that user is verified
    subject, body = get_registration_email_template(user["full_name"], user["email"], user.get("language", "sr"))
    await send_email(user["email"], subject, body)
    
    return {"message": "Email verified successfully! Welcome email has been sent.", "verified": True}

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    # Trim whitespace from email and password (helps with mobile keyboard issues)
    email = credentials.email.strip().lower()
    password = credentials.password.strip() if credentials.password else ""
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account deactivated")
    if not user.get("is_verified", False):
        raise HTTPException(status_code=401, detail="Please verify your email before logging in")
    
    token = create_token(user["id"], user["role"])
    user_response = {k: v for k, v in user.items() if k != "password"}
    return TokenResponse(access_token=token, user=UserResponse(**user_response))

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**{k: v for k, v in user.items() if k != "password"})

# ============ USER MANAGEMENT (Admin) ============

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, admin: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "phone": user_data.phone,
        "role": user_data.role,
        "is_active": True,
        "is_verified": True,  # Admin-created users are auto-verified
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    return UserResponse(**{k: v for k, v in user_doc.items() if k != "password" and k != "_id"})

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, role: str = None, is_active: bool = None, admin: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    update_doc = {}
    if role is not None:
        update_doc["role"] = role
    if is_active is not None:
        update_doc["is_active"] = is_active
    
    if update_doc:
        await db.users.update_one({"id": user_id}, {"$set": update_doc})
    return {"success": True}

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, data: RoleUpdate, admin: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    # Check if trying to set superadmin role - only superadmin can do that
    if data.role == UserRole.SUPERADMIN and admin["role"] != UserRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Only Super Admin can assign Super Admin role")
    
    # Admin can only assign: regular, doctor, nurse, driver
    # Super Admin can also assign: admin
    allowed_roles = [UserRole.REGULAR, UserRole.DOCTOR, UserRole.NURSE, UserRole.DRIVER]
    if admin["role"] == UserRole.SUPERADMIN:
        allowed_roles.append(UserRole.ADMIN)
    
    if data.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Cannot assign this role")
    
    await db.users.update_one({"id": user_id}, {"$set": {"role": data.role}})
    return {"success": True}

@api_router.put("/users/{user_id}/status")
async def update_user_status(user_id: str, data: StatusUpdate, admin: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    # Cannot deactivate superadmin unless you are superadmin
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if target_user and target_user.get("role") == UserRole.SUPERADMIN and admin["role"] != UserRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Cannot modify Super Admin status")
    
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": data.is_active}})
    return {"success": True}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    # Cannot delete superadmin (only superadmin can delete superadmin, but we block it entirely)
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if target_user and target_user.get("role") == UserRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Cannot delete Super Admin")
    
    # Admin cannot delete other admins, only superadmin can
    if admin.get("role") == UserRole.ADMIN and target_user and target_user.get("role") == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admins cannot delete other admins")
    
    await db.users.delete_one({"id": user_id})
    return {"success": True}

@api_router.get("/users/staff", response_model=List[UserResponse])
async def get_staff(user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    staff = await db.users.find({"role": {"$in": [UserRole.DOCTOR, UserRole.NURSE, UserRole.DRIVER]}}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**s) for s in staff]


# ============ SMS/EMAIL SETTINGS - MOVED TO routes/notifications.py ============
# ============ BOOKING ROUTES - MOVED TO routes/bookings.py ============
# The following endpoints are now available via their respective routers:
# - Booking CRUD: /api/bookings/*
# - Booking SMS: /api/bookings/{id}/send-sms
# - Booking Rejection: /api/bookings/{id}/reject
# - SMS/Email Settings: /api/settings/sms/*, /api/settings/email/*


# Endpoint to send pickup reminders for upcoming bookings
@api_router.post("/admin/send-pickup-reminders")
async def send_pickup_reminders(
    minutes_before: int = 30,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Send pickup reminders for bookings starting within specified minutes"""
    now = datetime.now(timezone.utc)
    reminder_window_start = now
    reminder_window_end = now + timedelta(minutes=minutes_before + 10)
    
    # Find confirmed bookings with pickup time within the window
    bookings = await db.bookings.find({
        "status": {"$in": ["confirmed", "assigned"]},
        "contact_phone": {"$ne": None}
    }, {"_id": 0}).to_list(100)
    
    sent_count = 0
    failed_count = 0
    results = []
    
    for booking in bookings:
        # Check if pickup time is within window
        pickup_datetime = booking.get("pickup_datetime") or booking.get("booking_date")
        if not pickup_datetime:
            continue
        
        try:
            if isinstance(pickup_datetime, str):
                # Parse the datetime
                if "T" in pickup_datetime:
                    pickup_dt = datetime.fromisoformat(pickup_datetime.replace("Z", "+00:00"))
                    # Ensure timezone aware
                    if pickup_dt.tzinfo is None:
                        pickup_dt = pickup_dt.replace(tzinfo=timezone.utc)
                else:
                    # Just a date, skip time-based reminders
                    continue
            else:
                pickup_dt = pickup_datetime
                if pickup_dt.tzinfo is None:
                    pickup_dt = pickup_dt.replace(tzinfo=timezone.utc)
            
            # Check if within reminder window
            time_until_pickup = (pickup_dt - now).total_seconds() / 60
            if 0 < time_until_pickup <= minutes_before + 10:
                # Check if reminder already sent
                existing_reminder = await db.sms_logs.find_one({
                    "booking_id": booking["id"],
                    "message": {"$regex": "podsetnik|reminder", "$options": "i"},
                    "sent_at": {"$gte": (now - timedelta(hours=2)).isoformat()}
                })
                
                if existing_reminder:
                    continue
                
                # Send reminder
                language = booking.get("language", "sr")
                pickup_time = pickup_dt.strftime("%H:%M")
                message = SMSTemplates.pickup_reminder(
                    booking.get("patient_name", ""),
                    pickup_time,
                    language
                )
                
                result = await send_sms_notification(
                    booking.get("contact_phone"),
                    message,
                    booking["id"]
                )
                
                if result.success:
                    sent_count += 1
                else:
                    failed_count += 1
                
                results.append({
                    "booking_id": booking["id"],
                    "patient": booking.get("patient_name"),
                    "phone": booking.get("contact_phone"),
                    "success": result.success,
                    "error": result.error
                })
        except Exception as e:
            results.append({
                "booking_id": booking["id"],
                "error": str(e)
            })
            failed_count += 1
    
    return {
        "sent": sent_count,
        "failed": failed_count,
        "total_processed": len(results),
        "details": results
    }


# ============ API KEY MANAGEMENT (Super Admin) ============

class ApiKeyCreate(BaseModel):
    name: str
    permissions: List[str] = ["read"]

class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    permissions: List[str]
    created_at: str
    last_used: Optional[str] = None
    created_by: str

class ApiKeyCreateResponse(BaseModel):
    id: str
    name: str
    key: str  # Full key, shown only once
    permissions: List[str]
    created_at: str

@api_router.get("/apikeys", response_model=List[ApiKeyResponse])
async def get_api_keys(user: dict = Depends(require_roles([UserRole.SUPERADMIN]))):
    """Get all API keys (without the actual key value)"""
    keys = await db.api_keys.find({"is_active": True}, {"_id": 0, "key_hash": 0}).to_list(100)
    return [ApiKeyResponse(**k) for k in keys]

@api_router.post("/apikeys", response_model=ApiKeyCreateResponse)
async def create_api_key(data: ApiKeyCreate, user: dict = Depends(require_roles([UserRole.SUPERADMIN]))):
    """Create a new API key. The full key is only shown once."""
    import secrets
    import hashlib
    
    # Generate a secure random key
    raw_key = secrets.token_urlsafe(32)
    key_prefix = raw_key[:8]
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    
    key_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    key_doc = {
        "id": key_id,
        "name": data.name,
        "key_prefix": key_prefix,
        "key_hash": key_hash,
        "permissions": data.permissions,
        "created_at": now,
        "last_used": None,
        "created_by": user["id"],
        "is_active": True
    }
    
    await db.api_keys.insert_one(key_doc)
    
    return ApiKeyCreateResponse(
        id=key_id,
        name=data.name,
        key=raw_key,
        permissions=data.permissions,
        created_at=now
    )

@api_router.delete("/apikeys/{key_id}")
async def revoke_api_key(key_id: str, user: dict = Depends(require_roles([UserRole.SUPERADMIN]))):
    """Revoke (soft delete) an API key"""
    result = await db.api_keys.update_one(
        {"id": key_id},
        {"$set": {"is_active": False, "revoked_at": datetime.now(timezone.utc).isoformat(), "revoked_by": user["id"]}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="API key not found")
    return {"success": True}

# ============ INCOMING APIS MANAGEMENT (Super Admin) ============

class IncomingApiCreate(BaseModel):
    service_type: str  # google_maps, osm_maps, stripe, sms, email, medical_device
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    endpoint_url: Optional[str] = None
    auth_type: Optional[str] = None
    # SMS specific
    provider: Optional[str] = None
    sender_id: Optional[str] = None
    # Email specific
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    from_email: Optional[str] = None
    use_ssl: Optional[bool] = None
    # Stripe specific
    publishable_key: Optional[str] = None
    webhook_secret: Optional[str] = None
    # Medical device specific
    device_type: Optional[str] = None

class IncomingApiResponse(BaseModel):
    id: str
    service_type: str
    api_key: Optional[str] = None  # Masked
    api_secret: Optional[str] = None  # Masked
    endpoint_url: Optional[str] = None
    auth_type: Optional[str] = None
    provider: Optional[str] = None
    sender_id: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None  # Masked
    from_email: Optional[str] = None
    use_ssl: Optional[bool] = None
    publishable_key: Optional[str] = None
    webhook_secret: Optional[str] = None  # Masked
    device_type: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    is_active: bool = True

def mask_secret(value: str) -> str:
    """Mask a secret value, showing only first 4 characters"""
    if not value or len(value) < 8:
        return "****" if value else None
    return value[:4] + "****" + value[-4:]

@api_router.get("/incoming-apis")
async def get_incoming_apis(user: dict = Depends(require_roles([UserRole.SUPERADMIN]))):
    """Get all configured incoming APIs with masked secrets"""
    apis = await db.incoming_apis.find({"is_active": True}, {"_id": 0}).to_list(100)
    
    # Mask sensitive fields
    for api in apis:
        if api.get("api_key"):
            api["api_key"] = mask_secret(api["api_key"])
        if api.get("api_secret"):
            api["api_secret"] = mask_secret(api["api_secret"])
        if api.get("smtp_password"):
            api["smtp_password"] = mask_secret(api["smtp_password"])
        if api.get("webhook_secret"):
            api["webhook_secret"] = mask_secret(api["webhook_secret"])
    
    return apis

@api_router.post("/incoming-apis")
async def save_incoming_api(data: IncomingApiCreate, user: dict = Depends(require_roles([UserRole.SUPERADMIN]))):
    """Create or update an incoming API configuration"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if this service type already exists
    existing = await db.incoming_apis.find_one({"service_type": data.service_type, "is_active": True})
    
    api_doc = data.model_dump(exclude_none=True)
    api_doc["updated_at"] = now
    api_doc["updated_by"] = user["id"]
    
    if existing:
        # Update existing - preserve fields that weren't sent (masked fields)
        for field in ["api_key", "api_secret", "smtp_password", "webhook_secret"]:
            if field in api_doc and api_doc[field] and "****" in api_doc[field]:
                # User didn't change this field, keep the original
                del api_doc[field]
        
        await db.incoming_apis.update_one(
            {"id": existing["id"]},
            {"$set": api_doc}
        )
        return {"success": True, "id": existing["id"], "action": "updated"}
    else:
        # Create new
        api_id = str(uuid.uuid4())
        api_doc["id"] = api_id
        api_doc["created_at"] = now
        api_doc["created_by"] = user["id"]
        api_doc["is_active"] = True
        
        await db.incoming_apis.insert_one(api_doc)
        return {"success": True, "id": api_id, "action": "created"}

@api_router.post("/incoming-apis/{service_type}/test")
async def test_incoming_api(service_type: str, user: dict = Depends(require_roles([UserRole.SUPERADMIN]))):
    """Test connection to an incoming API"""
    config = await db.incoming_apis.find_one({"service_type": service_type, "is_active": True}, {"_id": 0})
    
    if not config:
        raise HTTPException(status_code=404, detail="API configuration not found")
    
    # Test based on service type
    try:
        if service_type == "google_maps":
            # Simple validation - check if key format looks correct
            if config.get("api_key") and len(config["api_key"]) > 10:
                return {"success": True, "message": "Google Maps API key format valid"}
            raise Exception("Invalid API key format")
            
        elif service_type == "osm_maps":
            # OSM doesn't require API key, just validate endpoint
            endpoint = config.get("endpoint_url", "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png")
            if "openstreetmap" in endpoint or "tile" in endpoint:
                return {"success": True, "message": "OpenStreetMap endpoint configured"}
            return {"success": True, "message": "Custom tile server configured"}
            
        elif service_type == "stripe":
            if config.get("api_key") and config["api_key"].startswith("sk_"):
                return {"success": True, "message": "Stripe secret key format valid"}
            raise Exception("Invalid Stripe key format (should start with sk_)")
            
        elif service_type == "sms":
            if config.get("api_key") and config.get("api_secret"):
                return {"success": True, "message": f"SMS provider ({config.get('provider', 'unknown')}) credentials configured"}
            raise Exception("Missing API key or secret")
            
        elif service_type == "email":
            if config.get("smtp_host") and config.get("smtp_user"):
                return {"success": True, "message": f"SMTP configured: {config['smtp_host']}:{config.get('smtp_port', 465)}"}
            raise Exception("Missing SMTP host or username")
            
        elif service_type == "medical_device":
            device = config.get("device_type", "unknown")
            return {"success": True, "message": f"Medical device ({device}) configuration saved"}
            
        else:
            return {"success": True, "message": "Configuration saved"}
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.delete("/incoming-apis/{service_type}")
async def delete_incoming_api(service_type: str, user: dict = Depends(require_roles([UserRole.SUPERADMIN]))):
    """Delete (soft delete) an incoming API configuration"""
    result = await db.incoming_apis.update_one(
        {"service_type": service_type, "is_active": True},
        {"$set": {"is_active": False, "deleted_at": datetime.now(timezone.utc).isoformat(), "deleted_by": user["id"]}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="API configuration not found")
    return {"success": True}

# ============ ROUTE CALCULATION (OSRM) ============

class RouteRequest(BaseModel):
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float

class RouteResponse(BaseModel):
    distance_km: float
    duration_minutes: int
    duration_formatted: str
    estimated_arrival: Optional[str] = None

@api_router.post("/route/calculate", response_model=RouteResponse)
async def calculate_route(request: RouteRequest, start_time: Optional[str] = None):
    """
    Calculate route distance and duration between two points using OSRM.
    If start_time is provided, also calculates estimated arrival time.
    """
    try:
        osrm_url = f"https://router.project-osrm.org/route/v1/driving/{request.start_lng},{request.start_lat};{request.end_lng},{request.end_lat}?overview=false"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(osrm_url)
            data = response.json()
        
        if data.get("code") != "Ok" or not data.get("routes"):
            raise HTTPException(status_code=400, detail="Could not calculate route")
        
        route = data["routes"][0]
        distance_m = route["distance"]  # meters
        duration_s = route["duration"]  # seconds
        
        distance_km = round(distance_m / 1000, 1)
        duration_minutes = int(duration_s / 60)
        
        # Format duration
        hours = duration_minutes // 60
        mins = duration_minutes % 60
        if hours > 24:
            days = hours // 24
            remaining_hours = hours % 24
            duration_formatted = f"{days}d {remaining_hours}h {mins}m"
        elif hours > 0:
            duration_formatted = f"{hours}h {mins}m"
        else:
            duration_formatted = f"{mins}m"
        
        # Calculate ETA if start_time provided
        estimated_arrival = None
        if start_time:
            try:
                start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                arrival_dt = start_dt + timedelta(seconds=duration_s)
                estimated_arrival = arrival_dt.isoformat()
            except Exception as e:
                logger.error(f"Error calculating ETA: {e}")
        
        return RouteResponse(
            distance_km=distance_km,
            duration_minutes=duration_minutes,
            duration_formatted=duration_formatted,
            estimated_arrival=estimated_arrival
        )
        
    except httpx.RequestError as e:
        logger.error(f"OSRM request error: {e}")
        raise HTTPException(status_code=503, detail="Route calculation service unavailable")
    except Exception as e:
        logger.error(f"Route calculation error: {e}")
        raise HTTPException(status_code=500, detail="Error calculating route")


@api_router.post("/bookings/{booking_id}/update-eta")
async def update_booking_eta(
    booking_id: str,
    current_lat: float,
    current_lng: float,
    user: dict = Depends(get_current_user)
):
    """
    Update booking ETA based on driver's current location.
    Called from driver app when location updates.
    """
    # Find the booking
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        booking = await db.patient_bookings.find_one({"id": booking_id})
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Get destination coordinates
    end_lat = booking.get("end_lat") or booking.get("destination_lat")
    end_lng = booking.get("end_lng") or booking.get("destination_lng")
    
    if not end_lat or not end_lng:
        raise HTTPException(status_code=400, detail="Booking has no destination coordinates")
    
    try:
        # Calculate route from current position to destination
        osrm_url = f"https://router.project-osrm.org/route/v1/driving/{current_lng},{current_lat};{end_lng},{end_lat}?overview=false"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(osrm_url)
            data = response.json()
        
        if data.get("code") != "Ok" or not data.get("routes"):
            raise HTTPException(status_code=400, detail="Could not calculate route")
        
        route = data["routes"][0]
        duration_s = route["duration"]
        distance_m = route["distance"]
        
        # Calculate new ETA from now
        now = datetime.now(timezone.utc)
        eta = now + timedelta(seconds=duration_s)
        eta_iso = eta.isoformat()
        
        # Update booking with new ETA
        collection = db.bookings if await db.bookings.find_one({"id": booking_id}) else db.patient_bookings
        
        await collection.update_one(
            {"id": booking_id},
            {"$set": {
                "estimated_arrival": eta_iso,
                "eta_updated_at": now.isoformat(),
                "eta_distance_remaining_km": round(distance_m / 1000, 1),
                "eta_duration_remaining_min": int(duration_s / 60)
            }}
        )
        
        # Also update schedule if exists
        await db.vehicle_schedules.update_many(
            {"booking_id": booking_id},
            {"$set": {"estimated_arrival": eta_iso}}
        )
        
        logger.info(f"Updated ETA for booking {booking_id}: {eta_iso}")
        
        return {
            "success": True,
            "estimated_arrival": eta_iso,
            "distance_remaining_km": round(distance_m / 1000, 1),
            "duration_remaining_min": int(duration_s / 60)
        }
        
    except httpx.RequestError as e:
        logger.error(f"OSRM request error: {e}")
        raise HTTPException(status_code=503, detail="Route calculation service unavailable")


# ============ BOOKING ROUTES ============

@api_router.post("/bookings", response_model=BookingResponse)
async def create_booking(booking: BookingCreate, user: dict = Depends(get_optional_user)):
    booking_id = str(uuid.uuid4())
    booking_doc = {
        "id": booking_id,
        **booking.model_dump(),
        "status": "pending",
        "assigned_driver": None,
        "assigned_medical": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": user["id"] if user else None
    }
    await db.bookings.insert_one(booking_doc)
    
    # Send confirmation email to customer using new template system
    await send_booking_email_notification(booking_doc, "booking_confirmation")
    
    # Send SMS confirmation to customer
    if booking.contact_phone:
        sms_message = SMSTemplates.booking_confirmation(
            booking.patient_name,
            booking.booking_date,
            booking.pickup_time or "TBD",
            booking.language or 'sr'
        )
        await send_sms_notification(booking.contact_phone, sms_message, booking_id)
    
    # Send internal notification to staff
    internal_body = get_internal_notification_template("new_booking", {
        "patient_name": booking.patient_name,
        "start_point": booking.start_point,
        "end_point": booking.end_point,
        "booking_date": booking.booking_date,
        "contact_phone": booking.contact_phone,
        "contact_email": booking.contact_email,
        "notes": booking.notes,
        "booking_id": booking_id
    })
    
    # Route to appropriate internal email based on booking type
    if booking.booking_type == "medical":
        await send_email(MEDICAL_EMAIL, f"Nova Rezervacija Medicinske Nege - {booking.patient_name}", internal_body)
    else:
        await send_email(TRANSPORT_EMAIL, f"Nova Rezervacija Transporta - {booking.patient_name}", internal_body)
    
    return BookingResponse(**{k: v for k, v in booking_doc.items() if k != "_id"})

@api_router.get("/bookings", response_model=List[BookingResponse])
async def get_bookings(user: dict = Depends(get_current_user)):
    if user["role"] in [UserRole.ADMIN, UserRole.SUPERADMIN]:
        bookings = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    elif user["role"] in [UserRole.DRIVER, UserRole.DOCTOR, UserRole.NURSE]:
        bookings = await db.bookings.find(
            {"$or": [{"assigned_driver": user["id"]}, {"assigned_medical": user["id"]}]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(1000)
    else:
        bookings = await db.bookings.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [BookingResponse(**b) for b in bookings]

@api_router.get("/bookings/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: str):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return BookingResponse(**booking)

@api_router.put("/bookings/{booking_id}", response_model=BookingResponse)
async def update_booking(booking_id: str, update: BookingFullUpdate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DRIVER, UserRole.DOCTOR, UserRole.NURSE]))):
    # Get booking to check for assigned driver
    existing_booking = await db.bookings.find_one({"id": booking_id})
    if not existing_booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Build update document with only provided fields
    update_doc = {}
    update_dict = update.model_dump(exclude_unset=True)
    
    # Fields that can be explicitly set to None (for detaching driver)
    nullable_fields = ['assigned_driver', 'assigned_driver_name', 'assigned_medical']
    
    for key, value in update_dict.items():
        if key in nullable_fields:
            # Allow setting to None explicitly
            update_doc[key] = value
        elif value is not None:
            update_doc[key] = value
    
    if not update_doc:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Add update timestamp
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Reset driver status if driver is being removed or booking is cancelled/completed
    old_driver = existing_booking.get("assigned_driver")
    new_driver = update_dict.get("assigned_driver", old_driver)
    
    # If driver is being detached (set to None) or booking is cancelled/completed
    if old_driver and (new_driver is None or update.status in ["cancelled", "completed"]):
        await db.driver_status.update_one(
            {"driver_id": old_driver, "current_booking_id": booking_id},
            {"$set": {
                "status": DriverStatus.AVAILABLE,
                "current_booking_id": None,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    await db.bookings.update_one({"id": booking_id}, {"$set": update_doc})
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    
    # Send SMS and EMAIL notifications based on changes
    contact_phone = booking.get("contact_phone")
    language = booking.get("language", "sr")
    
    if contact_phone:
        # SMS for driver assignment
        if "assigned_driver" in update_dict and update_dict["assigned_driver"] and not old_driver:
            driver_name = update_dict.get("assigned_driver_name", "")
            # Get vehicle info if available
            vehicle_info = ""
            if new_driver:
                driver_status = await db.driver_status.find_one({"driver_id": new_driver})
                if driver_status and driver_status.get("vehicle_info"):
                    vehicle_info = driver_status.get("vehicle_info", {}).get("registration", "")
            
            sms_message = SMSTemplates.driver_assigned(
                booking.get("patient_name", ""),
                driver_name,
                vehicle_info,
                language
            )
            await send_sms_notification(contact_phone, sms_message, booking_id)
            
            # Also send email notification for driver assignment
            await send_booking_email_notification(booking, "driver_assigned", {
                "driver_name": driver_name,
                "vehicle_info": vehicle_info
            })
        
        # SMS for status changes
        if "status" in update_dict:
            new_status = update_dict["status"]
            if new_status == "confirmed":
                # Booking confirmed SMS
                pickup_time = booking.get("pickup_time", booking.get("pickup_datetime", ""))
                if pickup_time and isinstance(pickup_time, str):
                    pickup_time = pickup_time.split("T")[-1][:5] if "T" in pickup_time else pickup_time
                sms_message = SMSTemplates.booking_confirmation(
                    booking.get("patient_name", ""),
                    booking.get("booking_date", ""),
                    pickup_time or "TBD",
                    language
                )
                await send_sms_notification(contact_phone, sms_message, booking_id)
            
            elif new_status == "in_transit":
                # Driver is on the way - SMS and Email
                sms_message = SMSTemplates.driver_arriving(15, language)
                await send_sms_notification(contact_phone, sms_message, booking_id)
                
                # Get driver info for email
                driver_name = booking.get("assigned_driver_name", "")
                vehicle_info = ""
                if booking.get("assigned_driver"):
                    ds = await db.driver_status.find_one({"driver_id": booking.get("assigned_driver")})
                    if ds and ds.get("vehicle_info"):
                        vehicle_info = ds.get("vehicle_info", {}).get("registration", "")
                
                await send_booking_email_notification(booking, "driver_arriving", {
                    "eta_minutes": 15,
                    "driver_name": driver_name,
                    "vehicle_info": vehicle_info
                })
            
            elif new_status == "completed":
                # Transport completed - SMS and Email
                sms_message = SMSTemplates.transport_completed(language)
                await send_sms_notification(contact_phone, sms_message, booking_id)
                
                await send_booking_email_notification(booking, "transport_completed")
    
    return BookingResponse(**booking)

@api_router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    await db.bookings.delete_one({"id": booking_id})
    return {"success": True}

# ============ PATIENT PORTAL ROUTES ============

# Transport reasons for dropdown
TRANSPORT_REASONS = {
    "sr": [
        {"value": "hospital_appointment", "label": "Pregled u bolnici"},
        {"value": "dialysis", "label": "Dijaliza"},
        {"value": "rehabilitation", "label": "Rehabilitacija"},
        {"value": "discharge", "label": "Otpust iz bolnice"},
        {"value": "transfer", "label": "Premeštaj u drugu ustanovu"},
        {"value": "emergency", "label": "Hitna pomoć"},
        {"value": "other", "label": "Ostalo"}
    ],
    "en": [
        {"value": "hospital_appointment", "label": "Hospital Appointment"},
        {"value": "dialysis", "label": "Dialysis"},
        {"value": "rehabilitation", "label": "Rehabilitation"},
        {"value": "discharge", "label": "Hospital Discharge"},
        {"value": "transfer", "label": "Facility Transfer"},
        {"value": "emergency", "label": "Emergency"},
        {"value": "other", "label": "Other"}
    ]
}

@api_router.get("/patient/transport-reasons")
async def get_transport_reasons(language: str = "sr"):
    """Get transport reasons for booking form dropdown"""
    return TRANSPORT_REASONS.get(language, TRANSPORT_REASONS["sr"])

@api_router.get("/patient/dashboard")
async def get_patient_dashboard(user: dict = Depends(get_current_user)):
    """Get patient dashboard data"""
    user_id = user["id"]
    
    # Get user profile
    profile = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    
    # Get active booking (most recent non-completed/cancelled)
    active_booking = await db.patient_bookings.find_one(
        {"user_id": user_id, "status": {"$nin": ["completed", "cancelled"]}},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    # Get recent bookings count
    total_bookings = await db.patient_bookings.count_documents({"user_id": user_id})
    
    # Get unread notifications count
    unread_notifications = await db.notifications.count_documents({"user_id": user_id, "is_read": False})
    
    # Get pending invoices count
    pending_invoices = await db.invoices.count_documents({"user_id": user_id, "payment_status": "pending"})
    
    return {
        "profile": profile,
        "active_booking": active_booking,
        "stats": {
            "total_bookings": total_bookings,
            "unread_notifications": unread_notifications,
            "pending_invoices": pending_invoices
        }
    }

@api_router.post("/patient/bookings", response_model=PatientBookingResponse)
async def create_patient_booking(booking: PatientBookingCreate, user: dict = Depends(get_current_user)):
    """Create a new patient booking"""
    if not booking.consent_given:
        raise HTTPException(status_code=400, detail="Consent must be given to proceed")
    
    booking_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    booking_doc = {
        "id": booking_id,
        "patient_name": booking.patient_name,
        "patient_age": booking.patient_age,
        "contact_phone": booking.contact_phone,
        "contact_email": booking.contact_email,
        "transport_reason": booking.transport_reason,
        "transport_reason_details": booking.transport_reason_details,
        "mobility_status": booking.mobility_status,
        "pickup_address": booking.pickup_address,
        "pickup_lat": booking.pickup_lat,
        "pickup_lng": booking.pickup_lng,
        "destination_address": booking.destination_address,
        "destination_lat": booking.destination_lat,
        "destination_lng": booking.destination_lng,
        "preferred_date": booking.preferred_date,
        "preferred_time": booking.preferred_time,
        "status": BookingStatus.REQUESTED,
        "assigned_driver": None,
        "assigned_vehicle": None,
        "created_at": now,
        "updated_at": now,
        "user_id": user["id"],
        "invoice_id": None
    }
    
    await db.patient_bookings.insert_one(booking_doc)
    
    # Create notification for patient
    await create_notification(
        user["id"],
        "booking_confirmation",
        "Rezervacija primljena",
        "Booking Received",
        f"Vaša rezervacija transporta za {booking.preferred_date} je primljena i čeka potvrdu.",
        f"Your transport booking for {booking.preferred_date} has been received and is pending confirmation.",
        booking_id
    )
    
    # Send confirmation email using new template system
    await send_booking_email_notification(booking_doc, "booking_confirmation")
    
    # Send notification to transport team
    internal_body = get_internal_notification_template("new_booking", {
        "patient_name": booking.patient_name,
        "start_point": booking.pickup_address,
        "end_point": booking.destination_address,
        "booking_date": f"{booking.preferred_date} {booking.preferred_time}",
        "contact_phone": booking.contact_phone,
        "contact_email": booking.contact_email,
        "notes": f"Razlog: {booking.transport_reason}. Mobilnost: {booking.mobility_status}",
        "booking_id": booking_id
    })
    await send_email(TRANSPORT_EMAIL, f"Nova Rezervacija - {booking.patient_name}", internal_body)
    
    return PatientBookingResponse(**{k: v for k, v in booking_doc.items() if k != "_id"})

@api_router.get("/patient/bookings")
async def get_patient_bookings(
    user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    limit: int = 50
):
    """Get patient's bookings"""
    query = {"user_id": user["id"]}
    if status:
        query["status"] = status
    
    bookings = await db.patient_bookings.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return bookings

@api_router.get("/patient/bookings/{booking_id}")
async def get_patient_booking(booking_id: str, user: dict = Depends(get_current_user)):
    """Get a specific patient booking"""
    booking = await db.patient_bookings.find_one(
        {"id": booking_id, "user_id": user["id"]},
        {"_id": 0}
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking

@api_router.post("/patient/bookings/{booking_id}/cancel")
async def cancel_patient_booking(booking_id: str, user: dict = Depends(get_current_user)):
    """Cancel a patient booking (only if not yet dispatched)"""
    booking = await db.patient_bookings.find_one({"id": booking_id, "user_id": user["id"]})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Can only cancel if status is requested or confirmed
    if booking["status"] not in [BookingStatus.REQUESTED, BookingStatus.CONFIRMED]:
        raise HTTPException(status_code=400, detail="Cannot cancel booking that is already in progress")
    
    # Reset driver status if a driver was assigned
    assigned_driver_id = booking.get("assigned_driver_id")
    if assigned_driver_id:
        await db.driver_status.update_one(
            {"driver_id": assigned_driver_id, "current_booking_id": booking_id},
            {"$set": {
                "status": DriverStatus.AVAILABLE,
                "current_booking_id": None,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    await db.patient_bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": BookingStatus.CANCELLED, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create notification
    await create_notification(
        user["id"],
        "status_update",
        "Rezervacija otkazana",
        "Booking Cancelled",
        "Vaša rezervacija je uspešno otkazana.",
        "Your booking has been successfully cancelled.",
        booking_id
    )
    
    return {"success": True, "message": "Booking cancelled"}

@api_router.get("/patient/invoices")
async def get_patient_invoices(user: dict = Depends(get_current_user)):
    """Get patient's invoices"""
    invoices = await db.invoices.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return invoices

@api_router.get("/patient/invoices/{invoice_id}")
async def get_patient_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
    """Get a specific invoice"""
    invoice = await db.invoices.find_one(
        {"id": invoice_id, "user_id": user["id"]},
        {"_id": 0}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@api_router.get("/patient/profile")
async def get_patient_profile(user: dict = Depends(get_current_user)):
    """Get patient profile"""
    profile = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return profile

@api_router.put("/patient/profile")
async def update_patient_profile(profile_data: PatientProfileUpdate, user: dict = Depends(get_current_user)):
    """Update patient profile"""
    update_data = {k: v for k, v in profile_data.model_dump().items() if v is not None}
    
    if profile_data.saved_addresses is not None:
        update_data["saved_addresses"] = [addr.model_dump() for addr in profile_data.saved_addresses]
    
    if profile_data.emergency_contact is not None:
        update_data["emergency_contact"] = profile_data.emergency_contact.model_dump()
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": update_data}
    )
    
    profile = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return profile

@api_router.get("/patient/notifications")
async def get_patient_notifications(user: dict = Depends(get_current_user), limit: int = 50):
    """Get patient's notifications"""
    notifications = await db.notifications.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return notifications

@api_router.post("/patient/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    """Mark a notification as read"""
    await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"success": True}

@api_router.post("/patient/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"success": True}

# Helper function to create notifications
async def create_notification(user_id: str, notification_type: str, title_sr: str, title_en: str, message_sr: str, message_en: str, booking_id: str = None):
    """Create a notification for a user"""
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title_sr": title_sr,
        "title_en": title_en,
        "message_sr": message_sr,
        "message_en": message_en,
        "notification_type": notification_type,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "booking_id": booking_id
    }
    await db.notifications.insert_one(notification)
    return notification

# Admin endpoint to get all patient bookings
@api_router.get("/admin/patient-bookings")
async def get_all_patient_bookings(
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DRIVER])),
    status: Optional[str] = None,
    limit: int = 100
):
    """Get all patient bookings for admin"""
    query = {}
    if status:
        query["status"] = status
    
    bookings = await db.patient_bookings.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return bookings

# Admin endpoint to get new bookings count (for polling)
@api_router.get("/admin/patient-bookings/new-count")
async def get_new_bookings_count(
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DRIVER])),
    since: Optional[str] = None
):
    """Get count of new bookings since a given timestamp"""
    query = {"status": BookingStatus.REQUESTED}
    if since:
        query["created_at"] = {"$gt": since}
    
    count = await db.patient_bookings.count_documents(query)
    
    # Also get the latest booking for popup
    latest = await db.patient_bookings.find_one(
        {"status": BookingStatus.REQUESTED},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    return {
        "new_count": count,
        "latest_booking": latest
    }

# Admin endpoint to update booking status (triggers patient notification)
@api_router.put("/admin/patient-bookings/{booking_id}/status")
async def update_patient_booking_status(
    booking_id: str,
    status: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DRIVER]))
):
    """Update patient booking status (admin/driver)"""
    booking = await db.patient_bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    valid_statuses = [BookingStatus.REQUESTED, BookingStatus.CONFIRMED, BookingStatus.EN_ROUTE, 
                      BookingStatus.PICKED_UP, BookingStatus.COMPLETED, BookingStatus.CANCELLED]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    await db.patient_bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Reset driver status if booking is cancelled or completed
    if status in [BookingStatus.CANCELLED, BookingStatus.COMPLETED]:
        assigned_driver_id = booking.get("assigned_driver_id")
        if assigned_driver_id:
            await db.driver_status.update_one(
                {"driver_id": assigned_driver_id, "current_booking_id": booking_id},
                {"$set": {
                    "status": DriverStatus.AVAILABLE,
                    "current_booking_id": None,
                    "last_updated": datetime.now(timezone.utc).isoformat()
                }}
            )
    
    # Create notification for patient
    status_messages = {
        BookingStatus.CONFIRMED: ("Rezervacija potvrđena", "Booking Confirmed", 
                                   "Vaša rezervacija je potvrđena. Vozilo će doći u zakazano vreme.",
                                   "Your booking has been confirmed. The vehicle will arrive at the scheduled time."),
        BookingStatus.EN_ROUTE: ("Vozilo je na putu", "Vehicle En Route",
                                  "Sanitetsko vozilo je krenulo ka vašoj lokaciji.",
                                  "The ambulance is on its way to your location."),
        BookingStatus.PICKED_UP: ("Pacijent preuzet", "Patient Picked Up",
                                   "Transport je u toku.",
                                   "Transport is in progress."),
        BookingStatus.COMPLETED: ("Transport završen", "Transport Completed",
                                   "Vaš transport je uspešno završen. Hvala vam.",
                                   "Your transport has been successfully completed. Thank you.")
    }
    
    if status in status_messages:
        msg = status_messages[status]
        await create_notification(booking["user_id"], "status_update", msg[0], msg[1], msg[2], msg[3], booking_id)
    
    # Send email notifications for status changes
    if status == BookingStatus.EN_ROUTE:
        # Get driver info
        driver_name = booking.get("assigned_driver_name", "")
        vehicle_info = ""
        if booking.get("assigned_driver_id"):
            ds = await db.driver_status.find_one({"driver_id": booking.get("assigned_driver_id")})
            if ds and ds.get("vehicle_info"):
                vehicle_info = ds.get("vehicle_info", {}).get("registration", "")
        
        await send_booking_email_notification(booking, "driver_arriving", {
            "eta_minutes": 15,
            "driver_name": driver_name,
            "vehicle_info": vehicle_info
        })
    
    elif status == BookingStatus.COMPLETED:
        await send_booking_email_notification(booking, "transport_completed")
    
    return {"success": True, "status": status}

# Admin endpoint to create invoice for completed booking
@api_router.post("/admin/invoices")
async def create_invoice(
    booking_id: str,
    amount: float,
    service_description: str,
    due_date: Optional[str] = None,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Create invoice for a completed booking"""
    booking = await db.patient_bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Generate invoice number
    invoice_count = await db.invoices.count_documents({})
    invoice_number = f"PC018-{datetime.now().year}-{str(invoice_count + 1).zfill(5)}"
    
    tax = round(amount * 0.20, 2)  # 20% VAT
    total = round(amount + tax, 2)
    
    # Parse due_date or use default (30 days from now)
    if due_date:
        try:
            parsed_due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
            due_date_iso = parsed_due_date.isoformat()
        except:
            due_date_iso = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    else:
        due_date_iso = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    
    invoice = {
        "id": str(uuid.uuid4()),
        "invoice_number": invoice_number,
        "booking_id": booking_id,
        "user_id": booking["user_id"],
        "patient_name": booking["patient_name"],
        "patient_email": booking["contact_email"],
        "service_type": "medical_transport",
        "service_date": booking["preferred_date"],
        "service_description": service_description,
        "pickup_address": booking["pickup_address"],
        "destination_address": booking["destination_address"],
        "amount": amount,
        "tax": tax,
        "total": total,
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "due_date": due_date_iso
    }
    
    await db.invoices.insert_one(invoice)
    
    # Update booking with invoice ID
    await db.patient_bookings.update_one(
        {"id": booking_id},
        {"$set": {"invoice_id": invoice["id"]}}
    )
    
    # Notify patient
    await create_notification(
        booking["user_id"],
        "admin_message",
        "Nova faktura",
        "New Invoice",
        f"Faktura {invoice_number} za vaš transport je kreirana.",
        f"Invoice {invoice_number} for your transport has been created.",
        booking_id
    )
    
    return {k: v for k, v in invoice.items() if k != "_id"}

# Admin endpoint to get all invoices
@api_router.get("/admin/invoices")
async def get_all_invoices(
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN])),
    status: Optional[str] = None,
    limit: int = 100
):
    """Get all invoices for admin"""
    query = {}
    if status:
        query["payment_status"] = status
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return invoices

# Admin endpoint to update invoice status
@api_router.put("/admin/invoices/{invoice_id}/status")
async def update_invoice_status(
    invoice_id: str,
    payment_status: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Update invoice payment status"""
    if payment_status not in ["pending", "paid", "cancelled", "overdue"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": {
            "payment_status": payment_status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "paid_at": datetime.now(timezone.utc).isoformat() if payment_status == "paid" else None
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"success": True, "status": payment_status}

# PDF Generation function
def generate_invoice_pdf(invoice: dict) -> io.BytesIO:
    """Generate PDF for an invoice with Serbian character support"""
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    
    # Register DejaVu fonts for Serbian Latin character support (šđžčć)
    try:
        pdfmetrics.registerFont(TTFont('DejaVu', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
        pdfmetrics.registerFont(TTFont('DejaVu-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
    except Exception as e:
        logger.warning(f"Could not register DejaVu fonts: {e}")
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm, leftMargin=20*mm, rightMargin=20*mm)
    
    styles = getSampleStyleSheet()
    
    # Custom styles with DejaVu font for Serbian support
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#0f172a'), alignment=TA_CENTER, fontName='DejaVu-Bold')
    header_style = ParagraphStyle('Header', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#64748b'), fontName='DejaVu')
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#334155'), fontName='DejaVu')
    bold_style = ParagraphStyle('Bold', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#0f172a'), fontName='DejaVu-Bold')
    
    elements = []
    
    # Header with logo and company info side by side
    logo_path = '/app/frontend/public/logo.jpg'
    header_data = []
    
    try:
        if os.path.exists(logo_path):
            logo = RLImage(logo_path, width=25*mm, height=25*mm)
            company_text = Paragraph("""
            <b>PARAMEDIC CARE 018</b><br/>
            Žarka Zrenjanina 50A, 18103 Niš, Srbija<br/>
            PIB: 115243796 | MB: 68211557<br/>
            Tel: +381 18 123 456 | Email: info@paramedic-care018.rs
            """, header_style)
            header_data = [[logo, company_text]]
        else:
            company_text = Paragraph("""
            <b>PARAMEDIC CARE 018</b><br/>
            Žarka Zrenjanina 50A, 18103 Niš, Srbija<br/>
            PIB: 115243796 | MB: 68211557<br/>
            Tel: +381 18 123 456 | Email: info@paramedic-care018.rs
            """, header_style)
            header_data = [['', company_text]]
    except Exception as e:
        logger.error(f"Error loading logo: {e}")
        company_text = Paragraph("""
        <b>PARAMEDIC CARE 018</b><br/>
        Žarka Zrenjanina 50A, 18103 Niš, Srbija<br/>
        PIB: 115243796 | MB: 68211557<br/>
        Tel: +381 18 123 456 | Email: info@paramedic-care018.rs
        """, header_style)
        header_data = [['', company_text]]
    
    header_table = Table(header_data, colWidths=[30*mm, 140*mm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 10*mm))
    
    # Invoice title
    elements.append(Paragraph(f"FAKTURA / INVOICE", title_style))
    elements.append(Spacer(1, 5*mm))
    
    # Invoice number and dates
    invoice_date = invoice.get('created_at', '')[:10] if invoice.get('created_at') else ''
    due_date = invoice.get('due_date', '')[:10] if invoice.get('due_date') else ''
    
    invoice_info = f"""
    <b>Broj fakture / Invoice No:</b> {invoice.get('invoice_number', 'N/A')}<br/>
    <b>Datum izdavanja / Issue Date:</b> {invoice_date}<br/>
    <b>Datum dospeća / Due Date:</b> {due_date}<br/>
    <b>Status:</b> {invoice.get('payment_status', 'pending').upper()}
    """
    elements.append(Paragraph(invoice_info, normal_style))
    elements.append(Spacer(1, 10*mm))
    
    # Customer info
    customer_info = f"""
    <b>Kupac / Customer:</b><br/>
    {invoice.get('patient_name', 'N/A')}<br/>
    {invoice.get('patient_email', 'N/A')}
    """
    elements.append(Paragraph(customer_info, normal_style))
    elements.append(Spacer(1, 10*mm))
    
    # Service details table
    service_data = [
        ['Opis usluge / Service Description', 'Datum / Date', 'Iznos / Amount'],
        [
            invoice.get('service_description', 'Medicinski transport'),
            invoice.get('service_date', 'N/A'),
            f"{invoice.get('amount', 0):.2f} RSD"
        ]
    ]
    
    # Route info
    route_info = f"Od / From: {invoice.get('pickup_address', 'N/A')}\nDo / To: {invoice.get('destination_address', 'N/A')}"
    
    service_table = Table(service_data, colWidths=[90*mm, 40*mm, 40*mm])
    service_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0ea5e9')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'DejaVu-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'DejaVu'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
    ]))
    elements.append(service_table)
    elements.append(Spacer(1, 3*mm))
    
    # Route details
    elements.append(Paragraph(f"<i>{route_info}</i>", ParagraphStyle('Route', parent=normal_style, fontSize=8, textColor=colors.HexColor('#64748b'), fontName='DejaVu')))
    elements.append(Spacer(1, 10*mm))
    
    # Totals table
    totals_data = [
        ['', 'Osnovica / Subtotal:', f"{invoice.get('amount', 0):.2f} RSD"],
        ['', 'PDV / VAT (20%):', f"{invoice.get('tax', 0):.2f} RSD"],
        ['', 'UKUPNO / TOTAL:', f"{invoice.get('total', 0):.2f} RSD"],
    ]
    
    totals_table = Table(totals_data, colWidths=[90*mm, 40*mm, 40*mm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -2), 'DejaVu'),
        ('FONTNAME', (0, -1), (-1, -1), 'DejaVu-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LINEABOVE', (1, -1), (-1, -1), 1, colors.HexColor('#0f172a')),
        ('BACKGROUND', (1, -1), (-1, -1), colors.HexColor('#f0f9ff')),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 15*mm))
    
    # Payment info
    payment_info = """
    <b>Instrukcije za plaćanje / Payment Instructions:</b><br/>
    Banka / Bank: Erste Bank a.d. Novi Sad<br/>
    Račun / Account: 340-11012345-67<br/>
    Poziv na broj / Reference: {}<br/><br/>
    <i>Hvala vam na poverenju! / Thank you for your trust!</i>
    """.format(invoice.get('invoice_number', ''))
    elements.append(Paragraph(payment_info, normal_style))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer

# Endpoint to download invoice PDF
@api_router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, user: dict = Depends(get_current_user)):
    """Download invoice as PDF"""
    # Check if user owns the invoice or is admin
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice["user_id"] != user["id"] and user["role"] not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Generate PDF
    pdf_buffer = generate_invoice_pdf(invoice)
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=Invoice_{invoice['invoice_number']}.pdf"
        }
    )

# Admin endpoint to get completed bookings without invoices
@api_router.get("/admin/bookings-for-invoice")
async def get_bookings_for_invoice(
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get completed bookings that don't have invoices yet"""
    bookings = await db.patient_bookings.find(
        {"status": "completed", "invoice_id": {"$in": [None, ""]}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return bookings

# ============ STAFF AVAILABILITY ROUTES ============

@api_router.get("/staff/availability")
async def get_my_availability(
    start_date: str = None,
    end_date: str = None,
    user: dict = Depends(get_current_user)
):
    """Get current user's availability schedule"""
    query = {"user_id": user["id"]}
    
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    slots = await db.staff_availability.find(query, {"_id": 0}).sort("date", 1).to_list(100)
    return slots

@api_router.post("/staff/availability")
async def create_availability(
    availability: AvailabilityCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new availability slot"""
    # Validate user is staff (not regular/patient)
    if user["role"] == "regular":
        raise HTTPException(status_code=403, detail="Patients cannot create availability")
    
    slots_to_create = []
    base_slot = {
        "user_id": user["id"],
        "user_name": user.get("full_name", "Unknown"),
        "user_role": user["role"],
        "start_time": availability.start_time,
        "end_time": availability.end_time,
        "status": availability.status,
        "notes": availability.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Create the main slot
    main_slot = {
        "id": str(uuid.uuid4()),
        "date": availability.date,
        **base_slot
    }
    slots_to_create.append(main_slot)
    
    # If repeat_weekly, create slots for next 4 weeks
    if availability.repeat_weekly:
        from datetime import timedelta
        base_date = datetime.strptime(availability.date, "%Y-%m-%d")
        for week in range(1, 5):
            next_date = base_date + timedelta(weeks=week)
            repeat_slot = {
                "id": str(uuid.uuid4()),
                "date": next_date.strftime("%Y-%m-%d"),
                **base_slot
            }
            slots_to_create.append(repeat_slot)
    
    # Insert without returning _id
    await db.staff_availability.insert_many([{**slot} for slot in slots_to_create])
    
    return {"success": True, "slots_created": len(slots_to_create)}

@api_router.put("/staff/availability/{slot_id}")
async def update_availability(
    slot_id: str,
    update: AvailabilityUpdate,
    user: dict = Depends(get_current_user)
):
    """Update an availability slot"""
    # Verify ownership
    slot = await db.staff_availability.find_one({"id": slot_id, "user_id": user["id"]})
    if not slot:
        raise HTTPException(status_code=404, detail="Availability slot not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.staff_availability.update_one(
        {"id": slot_id},
        {"$set": update_data}
    )
    return {"success": True, "message": "Availability updated"}

@api_router.delete("/staff/availability/{slot_id}")
async def delete_availability(
    slot_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete an availability slot"""
    result = await db.staff_availability.delete_one({"id": slot_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Availability slot not found")
    return {"success": True, "message": "Availability deleted"}

# Admin endpoint to create availability on behalf of staff
class AdminAvailabilityCreate(BaseModel):
    user_id: str
    date: str
    start_time: str
    end_time: str
    status: str = "available"
    notes: str = None
    repeat_weekly: bool = False

@api_router.post("/admin/staff-availability/create")
async def admin_create_availability(
    availability: AdminAvailabilityCreate,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Admin can create availability for any staff member"""
    # Get the target user info
    target_user = await db.users.find_one({"id": availability.user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user["role"] == "regular":
        raise HTTPException(status_code=400, detail="Cannot create availability for patients")
    
    slots_to_create = []
    base_slot = {
        "user_id": availability.user_id,
        "user_name": target_user.get("full_name", "Unknown"),
        "user_role": target_user["role"],
        "start_time": availability.start_time,
        "end_time": availability.end_time,
        "status": availability.status,
        "notes": availability.notes,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Create the main slot
    main_slot = {
        "id": str(uuid.uuid4()),
        "date": availability.date,
        **base_slot
    }
    slots_to_create.append(main_slot)
    
    # If repeat_weekly, create slots for next 4 weeks
    if availability.repeat_weekly:
        from datetime import timedelta
        base_date = datetime.strptime(availability.date, "%Y-%m-%d")
        for week in range(1, 5):
            next_date = base_date + timedelta(weeks=week)
            repeat_slot = {
                "id": str(uuid.uuid4()),
                "date": next_date.strftime("%Y-%m-%d"),
                **base_slot
            }
            slots_to_create.append(repeat_slot)
    
    await db.staff_availability.insert_many([{**slot} for slot in slots_to_create])
    
    return {"success": True, "slots_created": len(slots_to_create), "for_user": target_user.get("full_name")}

# Admin endpoints for viewing all staff availability
@api_router.get("/admin/staff-availability")
async def get_all_staff_availability(
    start_date: str = None,
    end_date: str = None,
    role: str = None,
    user_id: str = None,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get all staff availability (admin only)"""
    query = {}
    
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    if role:
        query["user_role"] = role
    if user_id:
        query["user_id"] = user_id
    
    slots = await db.staff_availability.find(query, {"_id": 0}).sort("date", 1).to_list(500)
    return slots

@api_router.get("/admin/staff-availability/date/{date}")
async def get_staff_availability_by_date(
    date: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get all staff availability for a specific date"""
    slots = await db.staff_availability.find({"date": date}, {"_id": 0}).to_list(100)
    
    # Group by user
    by_user = {}
    for slot in slots:
        uid = slot["user_id"]
        if uid not in by_user:
            by_user[uid] = {
                "user_id": uid,
                "user_name": slot["user_name"],
                "user_role": slot["user_role"],
                "slots": []
            }
        by_user[uid]["slots"].append(slot)
    
    return {"date": date, "staff": list(by_user.values())}

@api_router.get("/admin/staff-list")
async def get_staff_list(
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get list of all staff members (non-patients)"""
    staff = await db.users.find(
        {"role": {"$ne": "regular"}, "is_active": True},
        {"_id": 0, "password": 0, "verification_token": 0}
    ).to_list(100)

# ============ MEDICAL ROUTES - MOVED TO routes/medical.py ============
# The following endpoints are now available via the medical router:
# - POST/GET/PUT /api/medical/patients - Patient profile management
# - POST/GET /api/medical/vitals - Vital signs recording
# - POST/GET /api/medical/checks - Medical examinations
# - GET /api/medical/dashboard - Doctor/nurse dashboard
# - POST/GET/PUT/DELETE /api/medical/medications - Medication management
# - POST/GET/DELETE /api/patients/{id}/diagnoses - Patient diagnoses
# - POST/GET/PUT /api/medical/decisions - Doctor decision panel (NEW)
# - GET /api/medical/active-decisions - Active decisions for notifications



# ============ DRIVER APP ROUTES ============

@api_router.get("/driver/profile")
async def get_driver_profile(user: dict = Depends(require_roles([UserRole.DRIVER]))):
    """Get driver profile with current status"""
    driver_status = await db.driver_status.find_one({"driver_id": user["id"]}, {"_id": 0})
    if not driver_status:
        # Create default status
        driver_status = {
            "driver_id": user["id"],
            "status": DriverStatus.OFFLINE,
            "vehicle_id": None,
            "current_booking_id": None,
            "last_location": None,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        await db.driver_status.insert_one(driver_status)
    
    return {
        "driver": {k: v for k, v in user.items() if k != "password"},
        "status": driver_status
    }

@api_router.put("/driver/status")
async def update_driver_status(
    status_update: DriverStatusUpdate,
    user: dict = Depends(require_roles([UserRole.DRIVER]))
):
    """Update driver status"""
    valid_statuses = [DriverStatus.OFFLINE, DriverStatus.AVAILABLE, DriverStatus.ASSIGNED, 
                      DriverStatus.EN_ROUTE, DriverStatus.ON_SITE, DriverStatus.TRANSPORTING]
    
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_data = {
        "status": status_update.status,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }
    
    if status_update.booking_id:
        update_data["current_booking_id"] = status_update.booking_id
    
    # If completing, clear current booking
    if status_update.status == DriverStatus.AVAILABLE:
        update_data["current_booking_id"] = None
    
    await db.driver_status.update_one(
        {"driver_id": user["id"]},
        {"$set": update_data},
        upsert=True
    )
    
    # Also update booking status if applicable
    if status_update.booking_id and status_update.status in [DriverStatus.EN_ROUTE, DriverStatus.ON_SITE, DriverStatus.TRANSPORTING]:
        booking_status_map = {
            DriverStatus.EN_ROUTE: "en_route",
            DriverStatus.ON_SITE: "on_site",
            DriverStatus.TRANSPORTING: "transporting"
        }
        new_booking_status = booking_status_map.get(status_update.status)
        if new_booking_status:
            # Update in both bookings collections for admin visibility
            await db.bookings.update_one(
                {"id": status_update.booking_id},
                {"$set": {"status": new_booking_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            await db.patient_bookings.update_one(
                {"id": status_update.booking_id},
                {"$set": {"status": new_booking_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            # Create notification for patient
            booking = await db.patient_bookings.find_one({"id": status_update.booking_id})
            if booking:
                notification_messages = {
                    DriverStatus.EN_ROUTE: {"sr": "Vozač je krenuo ka vama", "en": "Driver is on the way"},
                    DriverStatus.ON_SITE: {"sr": "Vozač je stigao na lokaciju preuzimanja", "en": "Driver arrived at pickup location"},
                    DriverStatus.TRANSPORTING: {"sr": "Transport je započet", "en": "Transport has started"}
                }
                msg = notification_messages.get(status_update.status, {})
                await db.notifications.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": booking["user_id"],
                    "type": "booking_update",
                    "message_sr": msg.get("sr", "Status ažuriran"),
                    "message_en": msg.get("en", "Status updated"),
                    "booking_id": status_update.booking_id,
                    "is_read": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
    
    # Broadcast to admins
    await manager.broadcast_to_admins({
        "type": "driver_status_update",
        "driver_id": user["id"],
        "driver_name": user.get("full_name"),
        "status": status_update.status,
        "booking_id": status_update.booking_id
    })
    
    return {"success": True, "status": status_update.status}

@api_router.post("/driver/location")
async def update_driver_location(
    location: DriverLocationUpdate,
    user: dict = Depends(require_roles([UserRole.DRIVER]))
):
    """Update driver's current location"""
    location_data = {
        "latitude": location.latitude,
        "longitude": location.longitude,
        "speed": location.speed,
        "heading": location.heading,
        "accuracy": location.accuracy,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Update driver status with location
    await db.driver_status.update_one(
        {"driver_id": user["id"]},
        {"$set": {
            "last_location": location_data,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Store location history (for tracking during active transport)
    driver_status = await db.driver_status.find_one({"driver_id": user["id"]})
    if driver_status and driver_status.get("current_booking_id"):
        await db.location_history.insert_one({
            "driver_id": user["id"],
            "booking_id": driver_status["current_booking_id"],
            **location_data
        })
    
    # Broadcast to admins for live map
    await manager.broadcast_to_admins({
        "type": "location_update",
        "driver_id": user["id"],
        "driver_name": user.get("full_name"),
        "location": location_data,
        "status": driver_status.get("status") if driver_status else DriverStatus.AVAILABLE,
        "booking_id": driver_status.get("current_booking_id") if driver_status else None
    })
    
    return {"success": True}

@api_router.get("/driver/assignment")
async def get_driver_assignment(user: dict = Depends(require_roles([UserRole.DRIVER]))):
    """Get driver's current assignment"""
    driver_status = await db.driver_status.find_one({"driver_id": user["id"]})
    
    if not driver_status or not driver_status.get("current_booking_id"):
        # Check for any assigned bookings in both collections
        assigned_booking = await db.patient_bookings.find_one({
            "assigned_driver_id": user["id"],
            "status": {"$in": [BookingStatus.CONFIRMED, BookingStatus.EN_ROUTE, BookingStatus.PICKED_UP]}
        }, {"_id": 0})
        
        if not assigned_booking:
            # Also check public bookings
            assigned_booking = await db.bookings.find_one({
                "assigned_driver": user["id"],
                "status": {"$in": ["confirmed", "en_route", "picked_up"]}
            }, {"_id": 0})
        
        if assigned_booking:
            return {"assignment": assigned_booking, "has_assignment": True}
        return {"assignment": None, "has_assignment": False}
    
    # Try patient_bookings first
    booking = await db.patient_bookings.find_one(
        {"id": driver_status["current_booking_id"]},
        {"_id": 0}
    )
    
    # Also try public bookings
    if not booking:
        booking = await db.bookings.find_one(
            {"id": driver_status["current_booking_id"]},
            {"_id": 0}
        )
    
    return {"assignment": booking, "has_assignment": booking is not None}

# Driver accepts assignment
@api_router.post("/driver/accept-assignment/{booking_id}")
async def accept_assignment(
    booking_id: str,
    user: dict = Depends(require_roles([UserRole.DRIVER]))
):
    """Driver accepts an assignment"""
    # Verify this assignment belongs to this driver
    driver_status = await db.driver_status.find_one({"driver_id": user["id"]})
    if not driver_status or driver_status.get("current_booking_id") != booking_id:
        raise HTTPException(status_code=400, detail="No matching assignment found")
    
    # Update driver status to indicate acceptance
    await db.driver_status.update_one(
        {"driver_id": user["id"]},
        {"$set": {
            "status": DriverStatus.EN_ROUTE,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update booking status
    await db.patient_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "en_route",
            "driver_accepted_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Also check public bookings
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "en_route",
            "driver_accepted_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Get booking info for notification
    booking = await db.patient_bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    
    # Notify patient
    if booking and booking.get("user_id"):
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": booking["user_id"],
            "type": "driver_accepted",
            "message_sr": f"Vozač {user.get('full_name')} je prihvatio vaš zahtev i kreće ka vama.",
            "message_en": f"Driver {user.get('full_name')} accepted your request and is on the way.",
            "booking_id": booking_id,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Broadcast to admins
    await manager.broadcast_to_admins({
        "type": "driver_accepted",
        "driver_id": user["id"],
        "driver_name": user.get("full_name"),
        "booking_id": booking_id
    })
    
    return {"success": True, "message": "Assignment accepted", "new_status": "en_route"}

# Driver rejects assignment
@api_router.post("/driver/reject-assignment/{booking_id}")
async def reject_assignment(
    booking_id: str,
    reason: str = None,
    user: dict = Depends(require_roles([UserRole.DRIVER]))
):
    """Driver rejects an assignment"""
    # Verify this assignment belongs to this driver
    driver_status = await db.driver_status.find_one({"driver_id": user["id"]})
    if not driver_status or driver_status.get("current_booking_id") != booking_id:
        raise HTTPException(status_code=400, detail="No matching assignment found")
    
    # Update driver status back to available
    await db.driver_status.update_one(
        {"driver_id": user["id"]},
        {"$set": {
            "status": DriverStatus.AVAILABLE,
            "current_booking_id": None,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update booking - remove driver assignment
    await db.patient_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "requested",
            "assigned_driver_id": None,
            "assigned_driver_name": None,
            "driver_rejected_at": datetime.now(timezone.utc).isoformat(),
            "rejection_reason": reason,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Also check public bookings
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "pending",
            "assigned_driver": None,
            "assigned_driver_name": None,
            "driver_rejected_at": datetime.now(timezone.utc).isoformat(),
            "rejection_reason": reason,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Broadcast to admins so they can reassign
    await manager.broadcast_to_admins({
        "type": "driver_rejected",
        "driver_id": user["id"],
        "driver_name": user.get("full_name"),
        "booking_id": booking_id,
        "reason": reason
    })
    
    return {"success": True, "message": "Assignment rejected"}

@api_router.post("/driver/complete-transport/{booking_id}")
async def complete_transport(
    booking_id: str,
    user: dict = Depends(require_roles([UserRole.DRIVER]))
):
    """Mark transport as completed"""
    # Update booking status in both collections
    await db.patient_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update driver status
    await db.driver_status.update_one(
        {"driver_id": user["id"]},
        {"$set": {
            "status": DriverStatus.AVAILABLE,
            "current_booking_id": None,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create notification for patient
    booking = await db.patient_bookings.find_one({"id": booking_id})
    if booking:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": booking["user_id"],
            "type": "booking_completed",
            "message_sr": "Transport je uspešno završen. Hvala vam!",
            "message_en": "Transport completed successfully. Thank you!",
            "booking_id": booking_id,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Broadcast to admins
    await manager.broadcast_to_admins({
        "type": "transport_completed",
        "driver_id": user["id"],
        "driver_name": user.get("full_name"),
        "booking_id": booking_id
    })
    
    return {"success": True, "message": "Transport completed"}

# Helper function to check if driver is truly available for a booking
async def is_driver_available_for_booking(driver_id: str, target_booking_id: str = None) -> tuple[bool, str, list]:
    """
    Check if driver is available for assignment.
    Returns (is_available, reason, conflicting_bookings)
    
    A driver is NOT available if:
    1. They are actively transporting (en_route, on_site, transporting)
    
    A driver IS available if:
    1. They have no status entry
    2. Their status is 'offline' or 'available'
    3. They are 'assigned' to a future booking (different date/time)
    """
    driver_status = await db.driver_status.find_one({"driver_id": driver_id})
    
    # No status entry = available
    if not driver_status:
        return True, "No status entry", []
    
    status = driver_status.get("status")
    
    # Offline or available = available
    if status in [DriverStatus.OFFLINE, DriverStatus.AVAILABLE, None]:
        return True, "Status is available", []
    
    # Actively transporting = NOT available
    if status in [DriverStatus.EN_ROUTE, DriverStatus.ON_SITE, DriverStatus.TRANSPORTING]:
        return False, "Driver is actively on a transport", []
    
    # For 'assigned' status, check if the assigned booking is actually active NOW
    if status == DriverStatus.ASSIGNED:
        current_booking_id = driver_status.get("current_booking_id")
        
        if not current_booking_id:
            return True, "Assigned but no booking ID", []
        
        # Check the assigned booking
        assigned_booking = await db.bookings.find_one({"id": current_booking_id})
        if not assigned_booking:
            assigned_booking = await db.patient_bookings.find_one({"id": current_booking_id})
        
        if not assigned_booking:
            # Booking doesn't exist anymore - driver is available
            return True, "Assigned booking not found", []
        
        booking_status = assigned_booking.get("status")
        
        # If the assigned booking is actively in progress, driver is not available
        if booking_status in ["en_route", "on_site", "transporting"]:
            return False, f"Driver is on active transport (status: {booking_status})", []
        
        # If the assigned booking is just 'confirmed' (scheduled for future), 
        # check if it's happening NOW or in the future
        if booking_status == "confirmed":
            booking_date = assigned_booking.get("booking_date") or assigned_booking.get("preferred_date")
            booking_time = assigned_booking.get("booking_time") or assigned_booking.get("preferred_time")
            
            if booking_date:
                from datetime import date
                today = date.today().isoformat()
                
                # If booking is for a different day, driver is available for today
                if booking_date != today:
                    return True, f"Assigned booking is for {booking_date}, not today", []
                
                # If booking is today but has a specific time, could still be available
                # For now, allow multiple same-day assignments (they can manage conflicts)
                return True, "Assigned to confirmed booking, allowing new assignment", []
        
        # Completed or cancelled booking = available
        if booking_status in ["completed", "cancelled", "pending"]:
            return True, f"Assigned booking status is {booking_status}", []
    
    # Default: allow assignment (better to over-allow than block incorrectly)
    return True, f"Default allow for status: {status}", []


# Helper function to get all conflicting bookings for a driver on a specific date/time
async def get_driver_conflicts(driver_id: str, target_date: str, target_time: str = None) -> list:
    """
    Get all bookings that may conflict with a new assignment.
    Returns list of conflicting bookings with their details.
    """
    conflicts = []
    
    # Find all active/confirmed bookings for this driver
    query = {
        "$or": [
            {"assigned_driver": driver_id},
            {"assigned_driver_id": driver_id}
        ],
        "status": {"$in": ["confirmed", "en_route", "on_site", "transporting"]}
    }
    
    # Check public bookings
    public_bookings = await db.bookings.find(query, {"_id": 0}).to_list(100)
    for b in public_bookings:
        booking_date = b.get("booking_date") or b.get("preferred_date")
        if booking_date == target_date:
            conflicts.append({
                "id": b.get("id"),
                "patient_name": b.get("patient_name"),
                "booking_date": booking_date,
                "booking_time": b.get("booking_time") or b.get("preferred_time"),
                "status": b.get("status"),
                "pickup": b.get("start_point") or b.get("pickup_address")
            })
    
    # Check patient bookings
    patient_bookings = await db.patient_bookings.find(query, {"_id": 0}).to_list(100)
    for b in patient_bookings:
        booking_date = b.get("preferred_date") or b.get("booking_date")
        if booking_date == target_date:
            conflicts.append({
                "id": b.get("id"),
                "patient_name": b.get("patient_name"),
                "booking_date": booking_date,
                "booking_time": b.get("preferred_time") or b.get("booking_time"),
                "status": b.get("status"),
                "pickup": b.get("pickup_address") or b.get("start_point")
            })
    
    return conflicts


# Admin endpoint to assign driver to booking
@api_router.post("/admin/assign-driver")
async def assign_driver_to_booking(
    booking_id: str,
    driver_id: str,
    force: bool = False,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Assign a driver to a booking"""
    # Verify driver exists
    driver = await db.users.find_one({"id": driver_id, "role": UserRole.DRIVER})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Check if driver is truly available
    is_available, reason, _ = await is_driver_available_for_booking(driver_id, booking_id)
    if not is_available:
        raise HTTPException(status_code=400, detail=f"Driver is not available: {reason}")
    
    # Get the target booking to check for conflicts
    target_booking = await db.patient_bookings.find_one({"id": booking_id})
    if not target_booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    target_date = target_booking.get("preferred_date") or target_booking.get("booking_date")
    target_time = target_booking.get("preferred_time") or target_booking.get("booking_time")
    
    # Check for conflicts
    if not force and target_date:
        conflicts = await get_driver_conflicts(driver_id, target_date, target_time)
        # Filter out the booking we're assigning to
        conflicts = [c for c in conflicts if c["id"] != booking_id]
        
        if conflicts:
            return {
                "success": False,
                "warning": True,
                "message": f"Driver has {len(conflicts)} other booking(s) on {target_date}",
                "conflicts": conflicts,
                "require_confirmation": True
            }
    
    # Update booking
    await db.patient_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "assigned_driver_id": driver_id,
            "assigned_driver_name": driver.get("full_name"),
            "status": BookingStatus.CONFIRMED,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update driver status
    await db.driver_status.update_one(
        {"driver_id": driver_id},
        {"$set": {
            "status": DriverStatus.ASSIGNED,
            "current_booking_id": booking_id,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Notify driver via WebSocket
    booking = await db.patient_bookings.find_one({"id": booking_id}, {"_id": 0})
    await manager.send_to_driver(driver_id, {
        "type": "new_assignment",
        "booking": booking
    })
    
    return {"success": True, "message": "Driver assigned"}

# Admin endpoint to assign driver to public booking
@api_router.post("/admin/assign-driver-public")
async def assign_driver_to_public_booking(
    booking_id: str,
    driver_id: str,
    force: bool = False,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Assign a driver to a public booking"""
    # Verify driver exists
    driver = await db.users.find_one({"id": driver_id, "role": UserRole.DRIVER})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Check if driver is truly available
    is_available, reason, _ = await is_driver_available_for_booking(driver_id, booking_id)
    if not is_available:
        raise HTTPException(status_code=400, detail=f"Driver is not available: {reason}")
    
    # Get the target booking to check for conflicts
    target_booking = await db.bookings.find_one({"id": booking_id})
    if not target_booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    target_date = target_booking.get("booking_date") or target_booking.get("preferred_date")
    target_time = target_booking.get("booking_time") or target_booking.get("preferred_time")
    
    # Check for conflicts
    if not force and target_date:
        conflicts = await get_driver_conflicts(driver_id, target_date, target_time)
        # Filter out the booking we're assigning to
        conflicts = [c for c in conflicts if c["id"] != booking_id]
        
        if conflicts:
            return {
                "success": False,
                "warning": True,
                "message": f"Driver has {len(conflicts)} other booking(s) on {target_date}",
                "conflicts": conflicts,
                "require_confirmation": True
            }
    
    # Update public booking
    result = await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "assigned_driver": driver_id,
            "assigned_driver_name": driver.get("full_name"),
            "status": "confirmed",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Update driver status
    await db.driver_status.update_one(
        {"driver_id": driver_id},
        {"$set": {
            "status": DriverStatus.ASSIGNED,
            "current_booking_id": booking_id,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Get booking for WebSocket notification
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    
    # Notify driver via WebSocket
    await manager.send_to_driver(driver_id, {
        "type": "new_assignment",
        "booking": booking
    })
    
    return {"success": True, "message": "Driver assigned to public booking"}

# Admin endpoint to get all drivers with their status
@api_router.get("/admin/drivers")
async def get_all_drivers(user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    """Get all drivers with their current status and location"""
    drivers = await db.users.find({"role": UserRole.DRIVER}, {"_id": 0, "password": 0}).to_list(100)
    
    result = []
    for driver in drivers:
        status = await db.driver_status.find_one({"driver_id": driver["id"]}, {"_id": 0})
        result.append({
            **driver,
            "driver_status": status.get("status") if status else DriverStatus.OFFLINE,
            "last_location": status.get("last_location") if status else None,
            "current_booking_id": status.get("current_booking_id") if status else None,
            "last_updated": status.get("last_updated") if status else None
        })
    
    return result

# WebSocket endpoint for driver real-time connection
@app.websocket("/ws/driver/{driver_id}")
async def websocket_driver(websocket: WebSocket, driver_id: str):
    """WebSocket connection for driver app"""
    await manager.connect_driver(websocket, driver_id)
    try:
        while True:
            data = await websocket.receive_json()
            
            # Handle location updates via WebSocket
            if data.get("type") == "location":
                location_data = {
                    "latitude": data.get("latitude"),
                    "longitude": data.get("longitude"),
                    "speed": data.get("speed"),
                    "heading": data.get("heading"),
                    "accuracy": data.get("accuracy"),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                
                await db.driver_status.update_one(
                    {"driver_id": driver_id},
                    {"$set": {"last_location": location_data, "last_updated": datetime.now(timezone.utc).isoformat()}},
                    upsert=True
                )
                
                # Get driver info
                driver = await db.users.find_one({"id": driver_id})
                driver_status = await db.driver_status.find_one({"driver_id": driver_id})
                
                await manager.broadcast_to_admins({
                    "type": "location_update",
                    "driver_id": driver_id,
                    "driver_name": driver.get("full_name") if driver else "Unknown",
                    "location": location_data,
                    "status": driver_status.get("status") if driver_status else DriverStatus.AVAILABLE,
                    "booking_id": driver_status.get("current_booking_id") if driver_status else None
                })
                
    except WebSocketDisconnect:
        manager.disconnect_driver(driver_id)
        # Set driver offline
        await db.driver_status.update_one(
            {"driver_id": driver_id},
            {"$set": {"status": DriverStatus.OFFLINE, "last_updated": datetime.now(timezone.utc).isoformat()}}
        )

# WebSocket endpoint for admin live map
@app.websocket("/ws/admin/live-map")
async def websocket_admin_live_map(websocket: WebSocket):
    """WebSocket connection for admin live map"""
    await manager.connect_admin(websocket)
    try:
        # Send current state of all drivers
        drivers = await db.users.find({"role": UserRole.DRIVER}, {"_id": 0, "password": 0}).to_list(100)
        for driver in drivers:
            status = await db.driver_status.find_one({"driver_id": driver["id"]}, {"_id": 0})
            if status and status.get("last_location"):
                await websocket.send_json({
                    "type": "location_update",
                    "driver_id": driver["id"],
                    "driver_name": driver.get("full_name"),
                    "location": status.get("last_location"),
                    "status": status.get("status"),
                    "booking_id": status.get("current_booking_id")
                })
        
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_admin(websocket)

# ============ CONTACT ROUTES ============

@api_router.post("/contact", response_model=ContactResponse)
async def create_contact(contact: ContactCreate):
    contact_id = str(uuid.uuid4())
    contact_doc = {
        "id": contact_id,
        **contact.model_dump(),
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contacts.insert_one(contact_doc)
    
    # Determine which email to send to based on inquiry type
    inquiry_labels = {
        "general": "Opšti upit / General Inquiry",
        "transport": "Transport / Transport",
        "medical": "Medicinska nega / Medical Care"
    }
    inquiry_label = inquiry_labels.get(contact.inquiry_type, "Opšti upit / General Inquiry")
    
    # Send internal notification to appropriate email
    internal_body = get_internal_notification_template("new_contact", {
        "inquiry_type": inquiry_label,
        "name": contact.name,
        "email": contact.email,
        "phone": contact.phone or "N/A",
        "message": contact.message
    })
    
    # Route to appropriate internal email based on inquiry type
    # General inquiries go to info@, medical to ambulanta@, transport to transport@
    if contact.inquiry_type == "medical":
        await send_email(MEDICAL_EMAIL, f"Medicinska nega - {contact.name}", internal_body)
    elif contact.inquiry_type == "transport":
        await send_email(TRANSPORT_EMAIL, f"Transport - {contact.name}", internal_body)
    else:
        # General inquiry goes to info@paramedic-care018.rs
        await send_email(INFO_EMAIL, f"Opšti upit - {contact.name}", internal_body)
    
    # Send auto-reply to customer in their preferred language
    subject, body = get_contact_autoreply_template(contact.name, contact.inquiry_type, contact.language)
    await send_email(contact.email, subject, body)
    
    return ContactResponse(**{k: v for k, v in contact_doc.items() if k != "_id"})

@api_router.get("/contacts", response_model=List[ContactResponse])
async def get_contacts(user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    contacts = await db.contacts.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [ContactResponse(**c) for c in contacts]

@api_router.put("/contacts/{contact_id}/read")
async def mark_contact_read(contact_id: str, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    await db.contacts.update_one({"id": contact_id}, {"$set": {"is_read": True}})
    return {"success": True}

# ============ CONTENT MANAGEMENT ============

@api_router.get("/content")
async def get_all_content():
    content = await db.content.find({}, {"_id": 0}).sort("order", 1).to_list(1000)
    return content

@api_router.get("/content/{key}")
async def get_content(key: str):
    content = await db.content.find_one({"key": key}, {"_id": 0})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return content

@api_router.post("/content", response_model=ContentResponse)
async def create_content(content: ContentCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    content_id = str(uuid.uuid4())
    content_doc = {
        "id": content_id,
        **content.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.content.insert_one(content_doc)
    return ContentResponse(**{k: v for k, v in content_doc.items() if k != "_id"})

@api_router.put("/content/{content_id}", response_model=ContentResponse)
async def update_content(content_id: str, content: ContentCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    update_doc = {**content.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.content.update_one({"id": content_id}, {"$set": update_doc})
    updated = await db.content.find_one({"id": content_id}, {"_id": 0})
    return ContentResponse(**updated)

@api_router.delete("/content/{content_id}")
async def delete_content(content_id: str, user: dict = Depends(require_roles([UserRole.SUPERADMIN]))):
    await db.content.delete_one({"id": content_id})
    return {"success": True}

# ============ PAGE CONTENT MANAGEMENT (CMS) ============

@api_router.get("/pages")
async def get_all_pages():
    """Get all page content"""
    content = await db.page_content.find({}, {"_id": 0}).sort([("page", 1), ("order", 1)]).to_list(1000)
    return content

@api_router.get("/pages/{page}")
async def get_page_content(page: str):
    """Get content for a specific page"""
    content = await db.page_content.find({"page": page, "is_active": True}, {"_id": 0}).sort("order", 1).to_list(1000)
    return content

@api_router.get("/pages/{page}/{section}")
async def get_page_section(page: str, section: str):
    """Get specific section content"""
    content = await db.page_content.find_one({"page": page, "section": section}, {"_id": 0})
    return content

@api_router.post("/pages", response_model=PageContentResponse)
async def create_page_content(content: PageContentCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    content_id = str(uuid.uuid4())
    content_doc = {
        "id": content_id,
        **content.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["full_name"]
    }
    await db.page_content.insert_one(content_doc)
    return PageContentResponse(**{k: v for k, v in content_doc.items() if k != "_id"})

@api_router.put("/pages/{content_id}", response_model=PageContentResponse)
async def update_page_content(content_id: str, content: PageContentCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    update_doc = {
        **content.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["full_name"]
    }
    await db.page_content.update_one({"id": content_id}, {"$set": update_doc})
    updated = await db.page_content.find_one({"id": content_id}, {"_id": 0})
    return PageContentResponse(**updated)

@api_router.delete("/pages/{content_id}")
async def delete_page_content(content_id: str, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    await db.page_content.delete_one({"id": content_id})
    return {"success": True}

@api_router.post("/pages/seed")
async def seed_page_content(user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    """Seed default page content"""
    count = await db.page_content.count_documents({})
    if count > 0:
        return {"message": "Content already exists", "count": count}
    
    default_content = [
        # Home Page
        {
            "id": str(uuid.uuid4()),
            "page": "home",
            "section": "hero",
            "title_sr": "Medicinski Transport i Hitna Pomoć",
            "title_en": "Medical Transport and Emergency Care",
            "subtitle_sr": "Dostupni 24/7",
            "subtitle_en": "Available 24/7",
            "content_sr": "Profesionalna medicinska pomoć i transport sanitetskim vozilom. Brza, sigurna i pouzdana usluga za vaše zdravlje.",
            "content_en": "Professional medical assistance and ambulance transport. Fast, safe, and reliable service for your health.",
            "image_url": "https://images.pexels.com/photos/6520105/pexels-photo-6520105.jpeg",
            "order": 1,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "home",
            "section": "services-title",
            "title_sr": "Naše Usluge",
            "title_en": "Our Services",
            "content_sr": "Pružamo širok spektar medicinskih usluga prilagođenih vašim potrebama",
            "content_en": "We provide a wide range of medical services tailored to your needs",
            "order": 2,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "home",
            "section": "cta",
            "title_sr": "Potreban vam je transport?",
            "title_en": "Need Transport?",
            "content_sr": "Zakažite medicinski transport brzo i jednostavno. Naš tim je spreman da vam pomogne.",
            "content_en": "Book medical transport quickly and easily. Our team is ready to help you.",
            "order": 3,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "home",
            "section": "emergency-phone",
            "title_sr": "Hitna linija",
            "title_en": "Emergency Line",
            "content_sr": "+381 18 123 456",
            "content_en": "+381 18 123 456",
            "order": 4,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "home",
            "section": "gallery-title",
            "title_sr": "Galerija",
            "title_en": "Gallery",
            "content_sr": "Pogledajte naš tim i opremu",
            "content_en": "See our team and equipment",
            "order": 5,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "home",
            "section": "gallery-1",
            "title_sr": "Tim medicinskih tehničara",
            "title_en": "Paramedic Team",
            "content_sr": "Naš stručni tim medicinskih tehničara",
            "content_en": "Our professional paramedic team",
            "image_url": "https://images.pexels.com/photos/6519910/pexels-photo-6519910.jpeg",
            "order": 6,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "home",
            "section": "gallery-2",
            "title_sr": "Lekar na dužnosti",
            "title_en": "Doctor on Duty",
            "content_sr": "Naši lekari su uvek spremni da pomognu",
            "content_en": "Our doctors are always ready to help",
            "image_url": "https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg",
            "order": 7,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "home",
            "section": "gallery-3",
            "title_sr": "Medicinska sestra",
            "title_en": "Nurse",
            "content_sr": "Profesionalna nega pacijenata",
            "content_en": "Professional patient care",
            "image_url": "https://images.pexels.com/photos/9893525/pexels-photo-9893525.jpeg",
            "order": 8,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "home",
            "section": "gallery-4",
            "title_sr": "Moderna bolnica",
            "title_en": "Modern Hospital",
            "content_sr": "Saradnja sa vodećim zdravstvenim ustanovama",
            "content_en": "Collaboration with leading healthcare facilities",
            "image_url": "https://images.pexels.com/photos/263402/pexels-photo-263402.jpeg",
            "order": 9,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        # Medical Care Page
        {
            "id": str(uuid.uuid4()),
            "page": "medical-care",
            "section": "hero",
            "title_sr": "Profesionalna Medicinska Pomoć",
            "title_en": "Professional Medical Assistance",
            "subtitle_sr": "Medicinska Nega",
            "subtitle_en": "Medical Care",
            "content_sr": "Pružamo vrhunsku medicinsku negu sa fokusom na bezbednost i udobnost pacijenata. Naš tim je dostupan 24 sata dnevno, 7 dana u nedelji.",
            "content_en": "We provide top-quality medical care with a focus on patient safety and comfort. Our team is available 24 hours a day, 7 days a week.",
            "image_url": "https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg",
            "order": 1,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "medical-care",
            "section": "service-1",
            "title_sr": "Hitna medicinska pomoć",
            "title_en": "Emergency Medical Assistance",
            "content_sr": "Brza i profesionalna hitna medicinska pomoć dostupna 24/7. Naš tim je obučen za sve vrste hitnih situacija.",
            "content_en": "Fast and professional emergency medical assistance available 24/7. Our team is trained for all types of emergencies.",
            "icon": "Siren",
            "order": 2,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "medical-care",
            "section": "service-2",
            "title_sr": "Medicinska stabilizacija",
            "title_en": "On-site Medical Stabilization",
            "content_sr": "Stručna medicinska stabilizacija na licu mesta pre transporta. Osiguravamo da su pacijenti stabilni pre pomeranja.",
            "content_en": "Expert on-site medical stabilization before transport. We ensure patients are stable before moving.",
            "icon": "HeartPulse",
            "order": 3,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "medical-care",
            "section": "service-3",
            "title_sr": "Profesionalno medicinsko osoblje",
            "title_en": "Professional Medical Staff",
            "content_sr": "Tim stručnih lekara i medicinskih sestara sa višegodišnjim iskustvom u hitnoj medicini.",
            "content_en": "Team of professional doctors and nurses with years of experience in emergency medicine.",
            "icon": "UserCheck",
            "order": 4,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        # Transport Page
        {
            "id": str(uuid.uuid4()),
            "page": "transport",
            "section": "hero",
            "title_sr": "Medicinski Transport",
            "title_en": "Medical Transport",
            "subtitle_sr": "Hitno",
            "subtitle_en": "Urgent",
            "content_sr": "Pružamo siguran i pouzdan medicinski transport sa profesionalnom pratnjom. Naša flota je opremljena najmodernijom medicinskom opremom.",
            "content_en": "We provide safe and reliable medical transport with professional escort. Our fleet is equipped with the most modern medical equipment.",
            "image_url": "https://images.pexels.com/photos/6520105/pexels-photo-6520105.jpeg",
            "order": 1,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "transport",
            "section": "service-1",
            "title_sr": "Transport sanitetom",
            "title_en": "Ambulance Transport",
            "content_sr": "Siguran i udoban transport specijalizovanim sanitetskim vozilom opremljenim najmodernijom medicinskom opremom.",
            "content_en": "Safe and comfortable transport in specialized ambulance vehicle equipped with the most modern medical equipment.",
            "icon": "Ambulance",
            "order": 2,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "transport",
            "section": "service-2",
            "title_sr": "Transport između bolnica",
            "title_en": "Hospital-to-Hospital Transport",
            "content_sr": "Profesionalan transport pacijenata između zdravstvenih ustanova sa punom medicinskom pratnjom.",
            "content_en": "Professional patient transport between healthcare facilities with full medical escort.",
            "icon": "Building2",
            "order": 3,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "transport",
            "section": "service-3",
            "title_sr": "Transport od kuće do bolnice",
            "title_en": "Home-to-Hospital Transport",
            "content_sr": "Bezbedna vožnja od vašeg doma do zdravstvene ustanove. Preuzimamo pacijenta na adresi i pratimo do destinacije.",
            "content_en": "Safe ride from your home to the healthcare facility. We pick up the patient at the address and accompany them to the destination.",
            "icon": "Home",
            "order": 4,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        # About Page
        {
            "id": str(uuid.uuid4()),
            "page": "about",
            "section": "hero",
            "title_sr": "Paramedic Care 018 - Vaš partner u zdravlju",
            "title_en": "Paramedic Care 018 - Your Health Partner",
            "subtitle_sr": "O Nama",
            "subtitle_en": "About Us",
            "content_sr": "Paramedic Care 018 je vodeća kompanija za medicinski transport i hitnu pomoć u Srbiji. Sa sedištem u Nišu, pružamo profesionalne usluge širom zemlje.",
            "content_en": "Paramedic Care 018 is a leading medical transport and emergency services company in Serbia. Based in Niš, we provide professional services throughout the country.",
            "image_url": "https://images.pexels.com/photos/6519910/pexels-photo-6519910.jpeg",
            "order": 1,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "about",
            "section": "mission",
            "title_sr": "Naša Misija",
            "title_en": "Our Mission",
            "content_sr": "Pružiti najkvalitetniju medicinsku negu i transport, osiguravajući bezbednost i udobnost svakog pacijenta. Verujemo da svaka osoba zaslužuje pristup profesionalnoj medicinskoj pomoći, bez obzira na okolnosti.",
            "content_en": "To provide the highest quality medical care and transport, ensuring the safety and comfort of every patient. We believe that every person deserves access to professional medical assistance, regardless of circumstances.",
            "image_url": "https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg",
            "icon": "Target",
            "order": 2,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "about",
            "section": "value-1",
            "title_sr": "Profesionalnost",
            "title_en": "Professionalism",
            "content_sr": "Najviši standardi u svemu što radimo",
            "content_en": "Highest standards in everything we do",
            "icon": "Shield",
            "order": 3,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "about",
            "section": "value-2",
            "title_sr": "Pouzdanost",
            "title_en": "Reliability",
            "content_sr": "Možete se osloniti na nas",
            "content_en": "You can count on us",
            "icon": "Heart",
            "order": 4,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "about",
            "section": "value-3",
            "title_sr": "Empatija",
            "title_en": "Empathy",
            "content_sr": "Razumemo vaše potrebe",
            "content_en": "We understand your needs",
            "icon": "Users",
            "order": 5,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "about",
            "section": "value-4",
            "title_sr": "Dostupnost 24/7",
            "title_en": "Availability 24/7",
            "content_sr": "Uvek tu kada vam zatrebamo",
            "content_en": "Always there when you need us",
            "icon": "Clock",
            "order": 6,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        # Header (Super Admin Only)
        {
            "id": str(uuid.uuid4()),
            "page": "header",
            "section": "logo",
            "title_sr": "Paramedic Care 018",
            "title_en": "Paramedic Care 018",
            "content_sr": "Logo i brend identitet u zaglavlju sajta",
            "content_en": "Logo and brand identity in the site header",
            "image_url": "https://customer-assets.emergentagent.com/job_433955cc-2ea1-4976-bce7-1cf9f8ad9654/artifacts/j7ye45w5_Paramedic%20Care%20018%20Logo.jpg",
            "order": 1,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "header",
            "section": "emergency-banner",
            "title_sr": "Hitna pomoć",
            "title_en": "Emergency Help",
            "content_sr": "+381 18 123 456",
            "content_en": "+381 18 123 456",
            "order": 2,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        # Footer (Super Admin Only)
        {
            "id": str(uuid.uuid4()),
            "page": "footer",
            "section": "company-info",
            "title_sr": "Kontakt Informacije",
            "title_en": "Contact Information",
            "content_sr": "Žarka Zrenjanina 50A, 18103 Niš (Pantelej), Srbija",
            "content_en": "Žarka Zrenjanina 50A, 18103 Niš (Pantelej), Serbia",
            "order": 1,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "footer",
            "section": "phone",
            "title_sr": "Telefon",
            "title_en": "Phone",
            "content_sr": "+381 18 123 456",
            "content_en": "+381 18 123 456",
            "order": 2,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "footer",
            "section": "legal",
            "title_sr": "Pravne informacije",
            "title_en": "Legal Information",
            "content_sr": "PIB: 115243796 | MB: 68211557",
            "content_en": "PIB: 115243796 | MB: 68211557",
            "order": 3,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
        {
            "id": str(uuid.uuid4()),
            "page": "footer",
            "section": "copyright",
            "title_sr": "Autorska prava",
            "title_en": "Copyright",
            "content_sr": "© 2026 Paramedic Care 018. Sva prava zadržana.",
            "content_en": "© 2026 Paramedic Care 018. All rights reserved.",
            "order": 4,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "System"
        },
    ]
    
    await db.page_content.insert_many(default_content)
    return {"message": "Content seeded successfully", "count": len(default_content)}

# ============ FILE UPLOAD ============

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@api_router.post("/upload/image")
async def upload_image(
    file: UploadFile = File(...),
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Upload an image file and return the URL"""
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content to check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Generate unique filename
    unique_id = str(uuid.uuid4())[:8]
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{unique_id}{file_ext}"
    
    # Save file
    file_path = UPLOADS_DIR / safe_filename
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Return the URL (with /api prefix for ingress routing)
    # The URL will be accessible via /api/uploads/filename
    image_url = f"/api/uploads/{safe_filename}"
    
    logger.info(f"Image uploaded: {safe_filename} by {user.get('email', 'unknown')}")
    
    return {
        "success": True,
        "filename": safe_filename,
        "url": image_url,
        "size": len(content),
        "type": file.content_type
    }

@api_router.delete("/upload/image/{filename}")
async def delete_image(
    filename: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Delete an uploaded image"""
    file_path = UPLOADS_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Security check - ensure the file is in the uploads directory
    if not str(file_path.resolve()).startswith(str(UPLOADS_DIR.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")
    
    file_path.unlink()
    logger.info(f"Image deleted: {filename} by {user.get('email', 'unknown')}")
    
    return {"success": True, "message": "Image deleted"}

# ============ SERVICES MANAGEMENT ============

@api_router.get("/services")
async def get_services():
    services = await db.services.find({}, {"_id": 0}).sort("order", 1).to_list(1000)
    return services

@api_router.get("/services/{category}")
async def get_services_by_category(category: str):
    services = await db.services.find({"category": category, "is_active": True}, {"_id": 0}).sort("order", 1).to_list(1000)
    return services

@api_router.post("/services", response_model=ServiceResponse)
async def create_service(service: ServiceCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    service_id = str(uuid.uuid4())
    service_doc = {"id": service_id, **service.model_dump()}
    await db.services.insert_one(service_doc)
    return ServiceResponse(**{k: v for k, v in service_doc.items() if k != "_id"})

@api_router.put("/services/{service_id}", response_model=ServiceResponse)
async def update_service(service_id: str, service: ServiceCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    await db.services.update_one({"id": service_id}, {"$set": service.model_dump()})
    updated = await db.services.find_one({"id": service_id}, {"_id": 0})
    return ServiceResponse(**updated)

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, user: dict = Depends(require_roles([UserRole.SUPERADMIN]))):
    await db.services.delete_one({"id": service_id})
    return {"success": True}

# ============ FILE UPLOAD ============

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        content = await file.read()
        encoded = base64.b64encode(content).decode()
        file_id = str(uuid.uuid4())
        file_doc = {
            "id": file_id,
            "filename": file.filename,
            "content_type": file.content_type,
            "data": encoded,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.files.insert_one(file_doc)
        return {"file_id": file_id, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/files/{file_id}")
async def get_file(file_id: str):
    file_doc = await db.files.find_one({"id": file_id}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    return file_doc

# ============ STATISTICS ============

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    total_bookings = await db.bookings.count_documents({})
    pending_bookings = await db.bookings.count_documents({"status": "pending"})
    total_users = await db.users.count_documents({})
    total_contacts = await db.contacts.count_documents({"is_read": False})
    
    return {
        "total_bookings": total_bookings,
        "pending_bookings": pending_bookings,
        "total_users": total_users,
        "unread_contacts": total_contacts
    }

# ============ SEED DATA ============

@api_router.post("/seed")
async def seed_data():
    # Create super admin if not exists
    admin_exists = await db.users.find_one({"email": "admin@paramedic-care018.rs"})
    if not admin_exists:
        admin_doc = {
            "id": str(uuid.uuid4()),
            "email": "admin@paramedic-care018.rs",
            "password": hash_password("Admin123!"),
            "full_name": "Super Administrator",
            "phone": "+381 18 123 456",
            "role": UserRole.SUPERADMIN,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_doc)
    
    # Seed services if empty
    services_count = await db.services.count_documents({})
    if services_count == 0:
        services = [
            {"id": str(uuid.uuid4()), "name_sr": "Hitna medicinska pomoć", "name_en": "Emergency Medical Assistance", "description_sr": "Brza i profesionalna hitna medicinska pomoć dostupna 24/7.", "description_en": "Fast and professional emergency medical assistance available 24/7.", "icon": "Siren", "category": "medical", "order": 1, "is_active": True},
            {"id": str(uuid.uuid4()), "name_sr": "Medicinska stabilizacija", "name_en": "On-site Medical Stabilization", "description_sr": "Stručna medicinska stabilizacija na licu mesta pre transporta.", "description_en": "Expert on-site medical stabilization before transport.", "icon": "HeartPulse", "category": "medical", "order": 2, "is_active": True},
            {"id": str(uuid.uuid4()), "name_sr": "Profesionalno osoblje", "name_en": "Professional Medical Staff", "description_sr": "Tim stručnih lekara i medicinskih sestara.", "description_en": "Team of professional doctors and nurses.", "icon": "Stethoscope", "category": "medical", "order": 3, "is_active": True},
            {"id": str(uuid.uuid4()), "name_sr": "Transport sanitetom", "name_en": "Ambulance Transport", "description_sr": "Siguran i udoban transport specijalizovanim sanitetskim vozilom.", "description_en": "Safe and comfortable transport in specialized ambulance vehicle.", "icon": "Ambulance", "category": "transport", "order": 1, "is_active": True},
            {"id": str(uuid.uuid4()), "name_sr": "Transport između bolnica", "name_en": "Hospital-to-Hospital Transport", "description_sr": "Profesionalan transport pacijenata između zdravstvenih ustanova.", "description_en": "Professional patient transport between healthcare facilities.", "icon": "Building2", "category": "transport", "order": 2, "is_active": True},
            {"id": str(uuid.uuid4()), "name_sr": "Transport od kuće do bolnice", "name_en": "Home-to-Hospital Transport", "description_sr": "Bezbedna vožnja od vašeg doma do zdravstvene ustanove.", "description_en": "Safe ride from your home to the healthcare facility.", "icon": "Home", "category": "transport", "order": 3, "is_active": True},
        ]
        await db.services.insert_many(services)
    
    return {"success": True, "message": "Data seeded successfully"}

# Include router and middleware
app.include_router(api_router)

# Mount static files for uploads at /api/uploads (to work with ingress routing)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await seed_data()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
