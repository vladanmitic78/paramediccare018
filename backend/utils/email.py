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
    logger.info(f"Attempting to send email to {to_email} with subject: {subject}")
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
        logger.info(f"Email successfully sent to {to_email} from {INFO_EMAIL}")
        return True
    except Exception as e:
        logger.error(f"Email failed to {to_email}: {str(e)}")
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
            <p style="margin: 5px 0;">Phone: +381 66 81 01 007 | Email: info@paramedic-care018.rs</p>
            <p style="margin: 5px 0;">PIB: 115243796 | MB: 68211557</p>
            <p style="margin: 15px 0 5px 0; font-size: 11px;">© 2026 Paramedic Care 018. All rights reserved.</p>
        </div>
        """
    else:
        return """
        <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; margin-top: 30px;">
            <p style="margin: 5px 0;"><strong>Paramedic Care 018</strong></p>
            <p style="margin: 5px 0;">Žarka Zrenjanina 50A, 18103 Niš, Srbija</p>
            <p style="margin: 5px 0;">Telefon: +381 66 81 01 007 | Email: info@paramedic-care018.rs</p>
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


# ============ TRANSPORT NOTIFICATION EMAIL TEMPLATES ============

def get_transport_email_template(template_type: str, data: dict, language: str = "sr"):
    """
    Generate email templates for transport notifications
    
    Template types:
    - booking_confirmation: New booking created
    - driver_assigned: Driver assigned to booking
    - driver_arriving: Driver is on the way
    - transport_completed: Transport finished
    - pickup_reminder: Reminder before pickup
    """
    
    header = get_email_header()
    footer = get_email_footer(language)
    
    # Common styles
    button_style = "display: inline-block; padding: 12px 24px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;"
    card_style = "background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;"
    
    if template_type == "booking_confirmation":
        patient_name = data.get('patient_name', '')
        booking_date = data.get('booking_date', '')
        pickup_time = data.get('pickup_time', 'TBD')
        start_point = data.get('start_point', '')
        end_point = data.get('end_point', '')
        booking_id = data.get('booking_id', '')
        
        if language == "sr":
            subject = f"Potvrda rezervacije transporta - {booking_date}"
            body = f"""
            <html>
            <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9;">
                {header}
                <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #1e293b; margin-bottom: 10px;">Poštovani {patient_name},</h1>
                    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                        Vaša rezervacija medicinskog transporta je uspešno kreirana.
                    </p>
                    
                    <div style="{card_style}">
                        <h3 style="color: #0ea5e9; margin-top: 0;">📅 Detalji transporta</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Datum:</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">{booking_date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Vreme:</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">{pickup_time}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Polazna adresa:</td>
                                <td style="padding: 8px 0; color: #1e293b;">{start_point}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Odredište:</td>
                                <td style="padding: 8px 0; color: #1e293b;">{end_point}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="color: #475569; font-size: 14px;">
                        Broj rezervacije: <strong>{booking_id[:8]}</strong>
                    </p>
                    
                    <p style="color: #475569; font-size: 14px; margin-top: 20px;">
                        Obavestićemo vas kada vam dodelimo vozača i vozilo.
                    </p>
                    
                    <p style="color: #64748b; font-size: 13px; margin-top: 30px;">
                        Za sva pitanja pozovite nas na <strong>+381 66 81 01 007</strong>
                    </p>
                </div>
                {footer}
            </body>
            </html>
            """
        else:
            subject = f"Transport Booking Confirmation - {booking_date}"
            body = f"""
            <html>
            <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9;">
                {header}
                <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #1e293b; margin-bottom: 10px;">Dear {patient_name},</h1>
                    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                        Your medical transport booking has been successfully created.
                    </p>
                    
                    <div style="{card_style}">
                        <h3 style="color: #0ea5e9; margin-top: 0;">📅 Transport Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Date:</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">{booking_date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Time:</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">{pickup_time}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Pickup Address:</td>
                                <td style="padding: 8px 0; color: #1e293b;">{start_point}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Destination:</td>
                                <td style="padding: 8px 0; color: #1e293b;">{end_point}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="color: #475569; font-size: 14px;">
                        Booking Reference: <strong>{booking_id[:8]}</strong>
                    </p>
                    
                    <p style="color: #475569; font-size: 14px; margin-top: 20px;">
                        We will notify you when a driver and vehicle are assigned.
                    </p>
                    
                    <p style="color: #64748b; font-size: 13px; margin-top: 30px;">
                        For any questions, call us at <strong>+381 66 81 01 007</strong>
                    </p>
                </div>
                {footer}
            </body>
            </html>
            """
        return subject, body
    
    elif template_type == "driver_assigned":
        patient_name = data.get('patient_name', '')
        driver_name = data.get('driver_name', '')
        vehicle_info = data.get('vehicle_info', '')
        booking_date = data.get('booking_date', '')
        pickup_time = data.get('pickup_time', '')
        
        if language == "sr":
            subject = f"Vozač dodeljen - {booking_date}"
            body = f"""
            <html>
            <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9;">
                {header}
                <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #1e293b; margin-bottom: 10px;">Poštovani {patient_name},</h1>
                    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                        Vozač je dodeljen vašem transportu!
                    </p>
                    
                    <div style="{card_style}">
                        <h3 style="color: #0ea5e9; margin-top: 0;">🚑 Detalji vozača</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Vozač:</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">{driver_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Vozilo:</td>
                                <td style="padding: 8px 0; color: #1e293b;">{vehicle_info}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Datum:</td>
                                <td style="padding: 8px 0; color: #1e293b;">{booking_date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Vreme:</td>
                                <td style="padding: 8px 0; color: #1e293b;">{pickup_time}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="color: #475569; font-size: 14px; margin-top: 20px;">
                        Obavestićemo vas kada vozač krene ka vama.
                    </p>
                </div>
                {footer}
            </body>
            </html>
            """
        else:
            subject = f"Driver Assigned - {booking_date}"
            body = f"""
            <html>
            <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9;">
                {header}
                <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #1e293b; margin-bottom: 10px;">Dear {patient_name},</h1>
                    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                        A driver has been assigned to your transport!
                    </p>
                    
                    <div style="{card_style}">
                        <h3 style="color: #0ea5e9; margin-top: 0;">🚑 Driver Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Driver:</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">{driver_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Vehicle:</td>
                                <td style="padding: 8px 0; color: #1e293b;">{vehicle_info}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Date:</td>
                                <td style="padding: 8px 0; color: #1e293b;">{booking_date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Time:</td>
                                <td style="padding: 8px 0; color: #1e293b;">{pickup_time}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="color: #475569; font-size: 14px; margin-top: 20px;">
                        We will notify you when the driver is on the way.
                    </p>
                </div>
                {footer}
            </body>
            </html>
            """
        return subject, body
    
    elif template_type == "driver_arriving":
        patient_name = data.get('patient_name', '')
        eta_minutes = data.get('eta_minutes', 15)
        driver_name = data.get('driver_name', '')
        vehicle_info = data.get('vehicle_info', '')
        
        if language == "sr":
            subject = f"Vozač stiže za {eta_minutes} minuta!"
            body = f"""
            <html>
            <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9;">
                {header}
                <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #1e293b; margin-bottom: 10px;">Poštovani {patient_name},</h1>
                    
                    <div style="background-color: #dcfce7; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                        <h2 style="color: #166534; margin: 0;">🚑 Vozač je na putu!</h2>
                        <p style="color: #15803d; font-size: 24px; font-weight: bold; margin: 10px 0;">
                            Stiže za ~{eta_minutes} minuta
                        </p>
                    </div>
                    
                    <div style="{card_style}">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Vozač:</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">{driver_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Vozilo:</td>
                                <td style="padding: 8px 0; color: #1e293b;">{vehicle_info}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="color: #475569; font-size: 14px;">
                        Molimo vas da budete spremni na dogovorenoj lokaciji.
                    </p>
                </div>
                {footer}
            </body>
            </html>
            """
        else:
            subject = f"Driver arriving in {eta_minutes} minutes!"
            body = f"""
            <html>
            <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9;">
                {header}
                <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #1e293b; margin-bottom: 10px;">Dear {patient_name},</h1>
                    
                    <div style="background-color: #dcfce7; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                        <h2 style="color: #166534; margin: 0;">🚑 Driver is on the way!</h2>
                        <p style="color: #15803d; font-size: 24px; font-weight: bold; margin: 10px 0;">
                            Arriving in ~{eta_minutes} minutes
                        </p>
                    </div>
                    
                    <div style="{card_style}">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Driver:</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">{driver_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Vehicle:</td>
                                <td style="padding: 8px 0; color: #1e293b;">{vehicle_info}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="color: #475569; font-size: 14px;">
                        Please be ready at the agreed pickup location.
                    </p>
                </div>
                {footer}
            </body>
            </html>
            """
        return subject, body
    
    elif template_type == "transport_completed":
        patient_name = data.get('patient_name', '')
        start_point = data.get('start_point', '')
        end_point = data.get('end_point', '')
        
        if language == "sr":
            subject = "Transport uspešno završen - Hvala vam!"
            body = f"""
            <html>
            <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9;">
                {header}
                <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #1e293b; margin-bottom: 10px;">Poštovani {patient_name},</h1>
                    
                    <div style="background-color: #dbeafe; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                        <h2 style="color: #1e40af; margin: 0;">✅ Transport završen</h2>
                        <p style="color: #1d4ed8; margin: 10px 0;">
                            Hvala vam što ste koristili naše usluge!
                        </p>
                    </div>
                    
                    <div style="{card_style}">
                        <h3 style="color: #0ea5e9; margin-top: 0;">Detalji putovanja</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Od:</td>
                                <td style="padding: 8px 0; color: #1e293b;">{start_point}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Do:</td>
                                <td style="padding: 8px 0; color: #1e293b;">{end_point}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="color: #475569; font-size: 14px; margin-top: 20px;">
                        Ako imate bilo kakvih pitanja ili povratnih informacija, slobodno nas kontaktirajte.
                    </p>
                    
                    <p style="color: #64748b; font-size: 13px; margin-top: 30px;">
                        S poštovanjem,<br>
                        <strong>Tim Paramedic Care 018</strong>
                    </p>
                </div>
                {footer}
            </body>
            </html>
            """
        else:
            subject = "Transport Completed - Thank You!"
            body = f"""
            <html>
            <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9;">
                {header}
                <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #1e293b; margin-bottom: 10px;">Dear {patient_name},</h1>
                    
                    <div style="background-color: #dbeafe; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                        <h2 style="color: #1e40af; margin: 0;">✅ Transport Completed</h2>
                        <p style="color: #1d4ed8; margin: 10px 0;">
                            Thank you for using our services!
                        </p>
                    </div>
                    
                    <div style="{card_style}">
                        <h3 style="color: #0ea5e9; margin-top: 0;">Trip Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">From:</td>
                                <td style="padding: 8px 0; color: #1e293b;">{start_point}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">To:</td>
                                <td style="padding: 8px 0; color: #1e293b;">{end_point}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="color: #475569; font-size: 14px; margin-top: 20px;">
                        If you have any questions or feedback, feel free to contact us.
                    </p>
                    
                    <p style="color: #64748b; font-size: 13px; margin-top: 30px;">
                        Best regards,<br>
                        <strong>Paramedic Care 018 Team</strong>
                    </p>
                </div>
                {footer}
            </body>
            </html>
            """
        return subject, body
    
    elif template_type == "pickup_reminder":
        patient_name = data.get('patient_name', '')
        booking_date = data.get('booking_date', '')
        pickup_time = data.get('pickup_time', '')
        start_point = data.get('start_point', '')
        
        if language == "sr":
            subject = f"Podsetnik: Transport danas u {pickup_time}"
            body = f"""
            <html>
            <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9;">
                {header}
                <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #1e293b; margin-bottom: 10px;">Poštovani {patient_name},</h1>
                    
                    <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                        <h2 style="color: #92400e; margin: 0;">⏰ Podsetnik</h2>
                        <p style="color: #b45309; font-size: 18px; margin: 10px 0;">
                            Vaš transport počinje uskoro!
                        </p>
                    </div>
                    
                    <div style="{card_style}">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Datum:</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">{booking_date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Vreme:</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">{pickup_time}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Lokacija:</td>
                                <td style="padding: 8px 0; color: #1e293b;">{start_point}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="color: #475569; font-size: 14px;">
                        Molimo vas da budete spremni na vreme. Vozač će vas kontaktirati po dolasku.
                    </p>
                </div>
                {footer}
            </body>
            </html>
            """
        else:
            subject = f"Reminder: Transport today at {pickup_time}"
            body = f"""
            <html>
            <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9;">
                {header}
                <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #1e293b; margin-bottom: 10px;">Dear {patient_name},</h1>
                    
                    <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                        <h2 style="color: #92400e; margin: 0;">⏰ Reminder</h2>
                        <p style="color: #b45309; font-size: 18px; margin: 10px 0;">
                            Your transport starts soon!
                        </p>
                    </div>
                    
                    <div style="{card_style}">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Date:</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">{booking_date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Time:</td>
                                <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">{pickup_time}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Location:</td>
                                <td style="padding: 8px 0; color: #1e293b;">{start_point}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="color: #475569; font-size: 14px;">
                        Please be ready on time. The driver will contact you upon arrival.
                    </p>
                </div>
                {footer}
            </body>
            </html>
            """
        return subject, body
    
    # Default: return empty
    return "", ""


def get_password_reset_email_template(full_name: str, reset_link: str, language: str = "sr"):
    """
    Generate email template for password reset requests
    """
    header = get_email_header()
    footer = get_email_footer(language)
    
    if language == "sr":
        subject = "Resetovanje lozinke - Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9;">
            {header}
            <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #1e293b; margin-bottom: 10px;">Poštovani {full_name},</h1>
                <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                    Primili smo zahtev za resetovanje lozinke za vaš nalog.
                </p>
                
                <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                    <p style="color: #92400e; margin: 0 0 15px 0;">
                        Kliknite na dugme ispod da resetujete vašu lozinku:
                    </p>
                    <a href="{reset_link}" style="display: inline-block; padding: 14px 28px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                        Resetuj Lozinku
                    </a>
                </div>
                
                <div style="background-color: #f8fafc; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="color: #64748b; font-size: 13px; margin: 0;">
                        <strong>Napomena:</strong> Ovaj link ističe za 1 sat. Ako niste zatražili resetovanje lozinke, možete ignorisati ovaj email.
                    </p>
                </div>
                
                <p style="color: #64748b; font-size: 13px; margin-top: 30px;">
                    Za sva pitanja pozovite nas na <strong>+381 66 81 01 007</strong>
                </p>
            </div>
            {footer}
        </body>
        </html>
        """
    else:
        subject = "Password Reset - Paramedic Care 018"
        body = f"""
        <html>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9;">
            {header}
            <div style="padding: 30px; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #1e293b; margin-bottom: 10px;">Dear {full_name},</h1>
                <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                    We received a request to reset the password for your account.
                </p>
                
                <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                    <p style="color: #92400e; margin: 0 0 15px 0;">
                        Click the button below to reset your password:
                    </p>
                    <a href="{reset_link}" style="display: inline-block; padding: 14px 28px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                        Reset Password
                    </a>
                </div>
                
                <div style="background-color: #f8fafc; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="color: #64748b; font-size: 13px; margin: 0;">
                        <strong>Note:</strong> This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
                    </p>
                </div>
                
                <p style="color: #64748b; font-size: 13px; margin-top: 30px;">
                    For any questions, call us at <strong>+381 66 81 01 007</strong>
                </p>
            </div>
            {footer}
        </body>
        </html>
        """
    
    return subject, body
