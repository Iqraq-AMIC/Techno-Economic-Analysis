# app/core/email.py

import logging
import secrets
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

import aiosmtplib

from app.core.config import (
    MAIL_USERNAME,
    MAIL_PASSWORD,
    MAIL_FROM,
    MAIL_FROM_NAME,
    MAIL_SERVER,
    MAIL_PORT,
    MAIL_STARTTLS,
    MAIL_SSL_TLS,
    VERIFICATION_TOKEN_EXPIRE_HOURS,
    FRONTEND_URL
)

logger = logging.getLogger(__name__)


def generate_verification_token() -> str:
    """Generate a secure random verification token."""
    return secrets.token_urlsafe(32)


def get_verification_token_expiry() -> datetime:
    """Get the expiry datetime for verification token."""
    return datetime.utcnow() + timedelta(hours=VERIFICATION_TOKEN_EXPIRE_HOURS)


def get_verification_url(token: str) -> str:
    """Generate the verification URL for the frontend."""
    return f"{FRONTEND_URL}/verify-email?token={token}"


def _create_verification_email_html(name: str, verification_url: str) -> str:
    """Create the HTML content for verification email."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - SAFAPAC</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td align="center" style="padding: 40px 0;">
                    <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 40px 40px 20px; text-align: center; background-color: #006D7C; border-radius: 8px 8px 0 0;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">SAFAPAC</h1>
                                <p style="margin: 10px 0 0; color: #e6f7f9; font-size: 14px;">Techno-Economic Analysis Platform</p>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px;">Welcome, {name}!</h2>
                                <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                                    Thank you for registering with SAFAPAC. To complete your registration and access all features, please verify your email address by clicking the button below.
                                </p>

                                <!-- CTA Button -->
                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td align="center" style="padding: 20px 0;">
                                            <a href="{verification_url}"
                                               style="display: inline-block; padding: 16px 40px; background-color: #006D7C; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
                                                Verify Email Address
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                    This verification link will expire in <strong>{VERIFICATION_TOKEN_EXPIRE_HOURS} hours</strong>.
                                </p>

                                <p style="margin: 20px 0 0; color: #999999; font-size: 13px; line-height: 1.6;">
                                    If the button doesn't work, copy and paste this link into your browser:<br>
                                    <a href="{verification_url}" style="color: #006D7C; word-break: break-all;">{verification_url}</a>
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding: 20px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                                <p style="margin: 0; color: #999999; font-size: 12px;">
                                    If you didn't create an account with SAFAPAC, you can safely ignore this email.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


def _create_verification_email_plain(name: str, verification_url: str) -> str:
    """Create plain text content for verification email."""
    return f"""
Welcome to SAFAPAC, {name}!

Thank you for registering with SAFAPAC. To complete your registration and access all features, please verify your email address by clicking the link below:

{verification_url}

This verification link will expire in {VERIFICATION_TOKEN_EXPIRE_HOURS} hours.

If you didn't create an account with SAFAPAC, you can safely ignore this email.

---
SAFAPAC - Techno-Economic Analysis Platform
    """


async def send_verification_email(email: str, name: str, token: str) -> bool:
    """
    Send verification email to the user.

    Args:
        email: User's email address
        name: User's name
        token: Verification token

    Returns:
        True if email sent successfully, False otherwise
    """
    verification_url = get_verification_url(token)

    # Check if email is configured
    if not MAIL_USERNAME or not MAIL_PASSWORD:
        logger.warning("Email not configured. Skipping verification email send.")
        logger.info(f"Verification URL for {email}: {verification_url}")
        return True  # Return True for development - email would be sent in production

    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["From"] = f"{MAIL_FROM_NAME} <{MAIL_FROM}>"
        message["To"] = email
        message["Subject"] = "Verify Your Email - SAFAPAC"

        # Attach plain text and HTML versions
        plain_content = _create_verification_email_plain(name, verification_url)
        html_content = _create_verification_email_html(name, verification_url)

        message.attach(MIMEText(plain_content, "plain"))
        message.attach(MIMEText(html_content, "html"))

        # Send email
        await aiosmtplib.send(
            message,
            hostname=MAIL_SERVER,
            port=MAIL_PORT,
            username=MAIL_USERNAME,
            password=MAIL_PASSWORD,
            start_tls=MAIL_STARTTLS,
            use_tls=MAIL_SSL_TLS
        )

        logger.info(f"Verification email sent to {email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send verification email to {email}: {e}")
        return False


async def send_resend_verification_email(email: str, name: str, token: str) -> bool:
    """
    Send a resend verification email to the user.
    Same as send_verification_email but with different logging.
    """
    return await send_verification_email(email, name, token)
