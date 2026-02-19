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
    get_internal_notification_template, get_transport_email_template,
    get_password_reset_email_template
)

# Import SMS service
from services.sms_service import SMSService, SMSConfig, SMSProvider, SMSTemplates, SMSResult

# Import extracted routers
from routes.fleet import router as fleet_router
from routes.schedule import router as schedule_router
from routes.bookings import router as bookings_router
from routes.driver import router as driver_router
from routes.driver import set_websocket_manager
from routes.medical import router as medical_router
from routes.cms import router as cms_router

# Create the main app
app = FastAPI(title="Paramedic Care 018 API")
api_router = APIRouter(prefix="/api")

# Include extracted routers
api_router.include_router(fleet_router)
api_router.include_router(schedule_router)
api_router.include_router(bookings_router)
api_router.include_router(driver_router)
api_router.include_router(medical_router)
api_router.include_router(cms_router)

# WebSocket connection manager instance
manager = ConnectionManager()

# Set WebSocket manager for driver router
set_websocket_manager(manager)

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
                    <a href="{FRONTEND_URL}/login" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 50px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 20px rgba(14, 165, 233, 0.4);">
                        Go to My Dashboard →
                    </a>
                </div>
                
                <!-- Emergency Contact -->
                <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #991b1b; font-weight: 600;">🚨 Emergency Contact</p>
                    <p style="margin: 0; color: #dc2626; font-size: 24px; font-weight: 700;">+381 66 81 01 007</p>
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
                    <a href="{FRONTEND_URL}/login" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 50px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 20px rgba(14, 165, 233, 0.4);">
                        Idi na Moj Panel →
                    </a>
                </div>
                
                <!-- Emergency Contact -->
                <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #991b1b; font-weight: 600;">🚨 Hitna linija</p>
                    <p style="margin: 0; color: #dc2626; font-size: 24px; font-weight: 700;">+381 66 81 01 007</p>
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
                <p style="color: #0ea5e9; font-size: 20px; font-weight: bold; margin: 15px 0;">+381 66 81 01 007</p>
                
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
                <p style="color: #0ea5e9; font-size: 20px; font-weight: bold; margin: 15px 0;">+381 66 81 01 007</p>
                
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
                <p style="color: #0ea5e9; font-size: 18px; font-weight: bold; margin: 10px 0;">+381 66 81 01 007</p>
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
                <p style="color: #0ea5e9; font-size: 18px; font-weight: bold; margin: 10px 0;">+381 66 81 01 007</p>
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


# ============ PASSWORD RESET ============

class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    language: str = "sr"

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

def create_password_reset_token(user_id: str) -> str:
    """Create a JWT token for password reset (expires in 1 hour)"""
    payload = {
        "user_id": user_id,
        "type": "password_reset",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_password_reset_token(token: str) -> dict:
    """Verify and decode the password reset token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "password_reset":
            raise HTTPException(status_code=400, detail="Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Password reset link has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid password reset token")

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset email"""
    email = request.email.strip().lower()
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    # Always return success to prevent email enumeration attacks
    if not user:
        logger.info(f"Password reset requested for non-existent email: {email}")
        return {"message": "If an account exists with this email, you will receive a password reset link."}
    
    if not user.get("is_active", True):
        logger.info(f"Password reset requested for deactivated account: {email}")
        return {"message": "If an account exists with this email, you will receive a password reset link."}
    
    # Create password reset token
    reset_token = create_password_reset_token(user["id"])
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    
    # Get language preference from user or request
    language = user.get("language", request.language)
    
    # Send password reset email
    subject, body = get_password_reset_email_template(user["full_name"], reset_link, language)
    email_sent = await send_email(email, subject, body)
    
    if email_sent:
        logger.info(f"Password reset email sent to: {email}")
    else:
        logger.error(f"Failed to send password reset email to: {email}")
    
    return {"message": "If an account exists with this email, you will receive a password reset link."}

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset user's password with the provided token"""
    # Verify the token
    payload = verify_password_reset_token(request.token)
    user_id = payload["user_id"]
    
    # Get the user
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=400, detail="Account is deactivated")
    
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Hash and update the password
    hashed_password = hash_password(request.new_password)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "password": hashed_password,
            "password_updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logger.info(f"Password reset successful for user: {user_id}")
    
    return {"message": "Password has been reset successfully. You can now log in with your new password."}

@api_router.get("/auth/verify-reset-token")
async def verify_reset_token(token: str):
    """Verify if a password reset token is valid (without consuming it)"""
    try:
        payload = verify_password_reset_token(token)
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {"valid": True, "email": user["email"]}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid token")

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


# ============ SMS GATEWAY SETTINGS (Super Admin) ============

class SMSSettingsUpdate(BaseModel):
    provider: str = "textbelt"
    api_key: Optional[str] = "textbelt"
    api_secret: Optional[str] = None
    sender_id: Optional[str] = None
    custom_endpoint: Optional[str] = None
    custom_headers: Optional[Dict[str, str]] = None
    custom_payload_template: Optional[str] = None
    enabled: bool = True

class SMSSendRequest(BaseModel):
    phone: str
    message: str

@api_router.get("/settings/sms")
async def get_sms_settings(user: dict = Depends(require_roles([UserRole.SUPERADMIN]))):
    """Get SMS gateway settings (Super Admin only)"""
    settings = await db.system_settings.find_one({"type": "sms"}, {"_id": 0})
    if not settings:
        # Return default settings
        return {
            "type": "sms",
            "provider": "textbelt",
            "api_key": "textbelt",
            "api_secret": None,
            "sender_id": None,
            "custom_endpoint": None,
            "custom_headers": None,
            "custom_payload_template": None,
            "enabled": True,
            "providers_available": [
                {"id": "textbelt", "name": "Textbelt (Free)", "description": "Free tier: 1 SMS/day per phone number"},
                {"id": "twilio", "name": "Twilio", "description": "Requires Account SID, Auth Token, and From number"},
                {"id": "infobip", "name": "Infobip", "description": "Requires API Key"},
                {"id": "custom", "name": "Custom HTTP", "description": "Custom HTTP endpoint with JSON payload"}
            ]
        }
    
    # Add available providers info
    settings["providers_available"] = [
        {"id": "textbelt", "name": "Textbelt (Free)", "description": "Free tier: 1 SMS/day per phone number"},
        {"id": "twilio", "name": "Twilio", "description": "Requires Account SID, Auth Token, and From number"},
        {"id": "infobip", "name": "Infobip", "description": "Requires API Key"},
        {"id": "custom", "name": "Custom HTTP", "description": "Custom HTTP endpoint with JSON payload"}
    ]
    return settings

@api_router.put("/settings/sms")
async def update_sms_settings(
    settings: SMSSettingsUpdate,
    user: dict = Depends(require_roles([UserRole.SUPERADMIN]))
):
    """Update SMS gateway settings (Super Admin only)"""
    settings_doc = {
        "type": "sms",
        "provider": settings.provider,
        "api_key": settings.api_key,
        "api_secret": settings.api_secret,
        "sender_id": settings.sender_id,
        "custom_endpoint": settings.custom_endpoint,
        "custom_headers": settings.custom_headers,
        "custom_payload_template": settings.custom_payload_template,
        "enabled": settings.enabled,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["id"]
    }
    
    await db.system_settings.update_one(
        {"type": "sms"},
        {"$set": settings_doc},
        upsert=True
    )
    
    return {"success": True, "message": "SMS settings updated"}

@api_router.post("/settings/sms/test")
async def test_sms_settings(
    request: SMSSendRequest,
    user: dict = Depends(require_roles([UserRole.SUPERADMIN]))
):
    """Test SMS settings by sending a test message (Super Admin only)"""
    # Get current settings
    settings = await db.system_settings.find_one({"type": "sms"}, {"_id": 0})
    
    if not settings:
        settings = {"provider": "textbelt", "api_key": "textbelt", "enabled": True}
    
    if not settings.get("enabled"):
        return {"success": False, "error": "SMS service is disabled"}
    
    # Create SMS config
    config = SMSConfig(
        provider=SMSProvider(settings.get("provider", "textbelt")),
        api_key=settings.get("api_key", "textbelt"),
        api_secret=settings.get("api_secret"),
        sender_id=settings.get("sender_id"),
        custom_endpoint=settings.get("custom_endpoint"),
        custom_headers=settings.get("custom_headers"),
        custom_payload_template=settings.get("custom_payload_template"),
        enabled=True
    )
    
    # Send test SMS
    sms_service = SMSService(config)
    result = await sms_service.send_sms(request.phone, request.message)
    
    # Log the test
    await db.sms_logs.insert_one({
        "id": str(uuid.uuid4()),
        "phone": request.phone,
        "message": request.message,
        "provider": result.provider,
        "success": result.success,
        "message_id": result.message_id,
        "error": result.error,
        "is_test": True,
        "sent_by": user["id"],
        "sent_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": result.success,
        "message_id": result.message_id,
        "error": result.error,
        "provider": result.provider,
        "quota_remaining": result.quota_remaining
    }

@api_router.get("/settings/sms/logs")
async def get_sms_logs(
    limit: int = 50,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Get SMS send logs"""
    logs = await db.sms_logs.find({}, {"_id": 0}).sort("sent_at", -1).limit(limit).to_list(limit)
    return logs


# Helper function to send SMS (used by other parts of the app)
async def send_sms_notification(phone: str, message: str, booking_id: str = None) -> SMSResult:
    """Send SMS using configured provider"""
    settings = await db.system_settings.find_one({"type": "sms"}, {"_id": 0})
    
    if not settings or not settings.get("enabled", True):
        return SMSResult(success=False, error="SMS service is disabled", provider="none")
    
    config = SMSConfig(
        provider=SMSProvider(settings.get("provider", "textbelt")),
        api_key=settings.get("api_key", "textbelt"),
        api_secret=settings.get("api_secret"),
        sender_id=settings.get("sender_id"),
        custom_endpoint=settings.get("custom_endpoint"),
        custom_headers=settings.get("custom_headers"),
        custom_payload_template=settings.get("custom_payload_template"),
        enabled=True
    )
    
    sms_service = SMSService(config)
    result = await sms_service.send_sms(phone, message)
    
    # Log the SMS
    await db.sms_logs.insert_one({
        "id": str(uuid.uuid4()),
        "phone": phone,
        "message": message,
        "booking_id": booking_id,
        "provider": result.provider,
        "success": result.success,
        "message_id": result.message_id,
        "error": result.error,
        "is_test": False,
        "sent_at": datetime.now(timezone.utc).isoformat()
    })
    
    return result


# Endpoint to manually send SMS to a booking's contact
@api_router.post("/bookings/{booking_id}/send-sms")
async def send_booking_sms(
    booking_id: str,
    message_type: str = "reminder",  # reminder, driver_arriving, custom
    custom_message: str = None,
    eta_minutes: int = 15,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DRIVER]))
):
    """Send SMS to booking contact"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    contact_phone = booking.get("contact_phone")
    if not contact_phone:
        raise HTTPException(status_code=400, detail="No contact phone number")
    
    language = booking.get("language", "sr")
    patient_name = booking.get("patient_name", "")
    pickup_time = booking.get("pickup_time", booking.get("pickup_datetime", ""))
    if pickup_time and isinstance(pickup_time, str) and "T" in pickup_time:
        pickup_time = pickup_time.split("T")[-1][:5]
    
    # Determine message based on type
    if message_type == "reminder":
        message = SMSTemplates.pickup_reminder(patient_name, pickup_time or "uskoro", language)
    elif message_type == "driver_arriving":
        message = SMSTemplates.driver_arriving(eta_minutes, language)
    elif message_type == "custom" and custom_message:
        message = custom_message
    else:
        raise HTTPException(status_code=400, detail="Invalid message type or missing custom message")
    
    result = await send_sms_notification(contact_phone, message, booking_id)
    
    return {
        "success": result.success,
        "message_id": result.message_id,
        "error": result.error,
        "phone": contact_phone,
        "message_sent": message
    }


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
    return staff


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

@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    result = await db.contacts.delete_one({"id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"success": True}


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

@api_router.post("/fix-image-urls")
async def fix_image_urls(user: dict = Depends(require_roles([UserRole.SUPERADMIN]))):
    """Fix CMS image URLs - converts absolute URLs to relative paths"""
    # Find all documents with old preview/deployment URLs
    old_patterns = [
        "paramedic-care-018-1.preview.emergentagent.com",
        "paramedic-care-018-1.emergent.host",
        "care-dispatch-hub.preview.emergentagent.com"
    ]
    
    fixed_count = 0
    
    for pattern in old_patterns:
        docs = await db.page_content.find(
            {"image_url": {"$regex": pattern}},
            {"id": 1, "image_url": 1}
        ).to_list(100)
        
        for doc in docs:
            old_url = doc.get('image_url', '')
            if '/api/uploads/' in old_url:
                filename = old_url.split('/api/uploads/')[-1]
                new_url = f"/api/uploads/{filename}"
                
                await db.page_content.update_one(
                    {"id": doc['id']},
                    {"$set": {"image_url": new_url}}
                )
                fixed_count += 1
    
    return {"success": True, "fixed_count": fixed_count, "message": f"Fixed {fixed_count} image URLs"}


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
            "phone": "+381 66 81 01 007",
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
