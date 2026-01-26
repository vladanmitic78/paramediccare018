"""
Email utilities and templates for Paramedic Care 018
Contains all email template functions and the send_email helper
"""
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import SMTP_HOST, SMTP_PORT, INFO_EMAIL, INFO_PASS, logger


async def send_email(to_email: str, subject: str, body_html: str):
    """Send email from info@paramedic-care018.rs"""
    try:
        message = MIMEMultipart("alternative")
        message["From"] = INFO_EMAIL
        message["To"] = to_email
        message["Subject"] = subject
        message.attach(MIMEText(body_html, "html"))
        
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=INFO_EMAIL,
            password=INFO_PASS,
            use_tls=True
        )
        logger.info(f"Email sent to {to_email} from {INFO_EMAIL}")
        return True
    except Exception as e:
        logger.error(f"Email failed: {e}")
        return False


def get_email_header():
    """Common email header with company logo and branding"""
    return """
    <div style="background-color: #0ea5e9; padding: 20px; text-align: center;">
        <img src="https://customer-assets.emergentagent.com/job_433955cc-2ea1-4976-bce7-1cf9f8ad9654/artifacts/j7ye45w5_Paramedic%20Care%20018%20Logo.jpg" alt="Paramedic Care 018" style="height: 60px; width: auto;">
    </div>
    """


def get_email_footer(language: str = "sr"):
    """Common email footer with company details"""
    if language == "en":
        return """
        <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; margin-top: 30px;">
            <p style="margin: 5px 0;"><strong>Paramedic Care 018</strong></p>
            <p style="margin: 5px 0;">Žarka Zrenjanina 50A, 18103 Niš, Serbia</p>
            <p style="margin: 5px 0;">Phone: +381 18 123 456 | Email: info@paramedic-care018.rs</p>
            <p style="margin: 5px 0;">PIB: 115243796 | MB: 68211557</p>
            <p style="margin: 15px 0 5px 0; font-size: 11px;">© 2026 Paramedic Care 018. All rights reserved.</p>
        </div>
        """
    else:
        return """
        <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; margin-top: 30px;">
            <p style="margin: 5px 0;"><strong>Paramedic Care 018</strong></p>
            <p style="margin: 5px 0;">Žarka Zrenjanina 50A, 18103 Niš, Srbija</p>
            <p style="margin: 5px 0;">Telefon: +381 18 123 456 | Email: info@paramedic-care018.rs</p>
            <p style="margin: 5px 0;">PIB: 115243796 | MB: 68211557</p>
            <p style="margin: 15px 0 5px 0; font-size: 11px;">© 2026 Paramedic Care 018. Sva prava zadržana.</p>
        </div>
        """


def get_internal_notification_template(notification_type: str, data: dict):
    """Internal notification email for staff"""
    if notification_type == "new_booking":
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>Nova Rezervacija / New Booking</h2>
            <p><strong>Pacijent / Patient:</strong> {data.get('patient_name', 'N/A')}</p>
            <p><strong>Polazna tačka / Start:</strong> {data.get('start_point', 'N/A')}</p>
            <p><strong>Odredište / Destination:</strong> {data.get('end_point', 'N/A')}</p>
            <p><strong>Datum / Date:</strong> {data.get('booking_date', 'N/A')}</p>
            <p><strong>Telefon / Phone:</strong> {data.get('contact_phone', 'N/A')}</p>
            <p><strong>Email:</strong> {data.get('contact_email', 'N/A')}</p>
            <p><strong>Napomene / Notes:</strong> {data.get('notes', 'N/A')}</p>
            <hr>
            <p>Booking ID: {data.get('booking_id', 'N/A')}</p>
        </body>
        </html>
        """
    elif notification_type == "new_contact":
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>Nova Kontakt Poruka / New Contact Message</h2>
            <p><strong>Tip upita / Inquiry Type:</strong> {data.get('inquiry_type', 'N/A')}</p>
            <p><strong>Ime / Name:</strong> {data.get('name', 'N/A')}</p>
            <p><strong>Email:</strong> {data.get('email', 'N/A')}</p>
            <p><strong>Telefon / Phone:</strong> {data.get('phone', 'N/A')}</p>
            <p><strong>Poruka / Message:</strong></p>
            <p>{data.get('message', 'N/A')}</p>
        </body>
        </html>
        """
    return ""
