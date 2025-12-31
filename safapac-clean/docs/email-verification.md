# Email Verification System

This document describes the email verification system implemented for SAFAPAC user registration.

## Overview

The email verification system ensures that users provide a valid email address during registration. After signing up, users receive a verification email with a unique link that must be clicked to activate their account. Users cannot log in until their email is verified.

## Architecture

### Flow Diagram

```
1. User fills signup form
         |
         v
2. Frontend calls POST /api/v1/auth/register
         |
         v
3. Backend creates user with email_verified=false
         |
         v
4. Backend generates verification token (24hr expiry)
         |
         v
5. Backend sends verification email
         |
         v
6. User clicks link in email
         |
         v
7. Frontend /verify-email page calls POST /api/v1/auth/verify-email
         |
         v
8. Backend validates token and sets email_verified=true
         |
         v
9. User can now login
```

### Login Flow with Verification Check

```
1. User enters credentials on login page
         |
         v
2. Backend validates credentials
         |
         v
3. Backend checks email_verified status
         |
    [verified?]
      /     \
    Yes      No
     |        |
     v        v
4. Return    Return 403 error
   tokens    "Please verify your email"
     |        |
     v        v
5. Login    Show resend verification
   success  option on frontend
```

## Implementation Details

### Phase 1: Backend Foundation (Completed)

#### 1. User Model Updates
**File:** `backend/app/models/user_project.py`

Added fields to the User model:
```python
email_verified = Column(Boolean, nullable=False, default=False)
verification_token = Column(String, nullable=True)
verification_token_expires = Column(DateTime, nullable=True)
```

**Database Migration Required:**
```sql
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN verification_token VARCHAR;
ALTER TABLE users ADD COLUMN verification_token_expires TIMESTAMP;
```

#### 2. Email Configuration
**File:** `backend/app/core/config.py`

Environment variables for email:
```python
MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
MAIL_FROM = os.getenv("MAIL_FROM", "noreply@safapac.com")
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "SAFAPAC")
MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
MAIL_STARTTLS = os.getenv("MAIL_STARTTLS", "True").lower() == "true"
MAIL_SSL_TLS = os.getenv("MAIL_SSL_TLS", "False").lower() == "true"
VERIFICATION_TOKEN_EXPIRE_HOURS = int(os.getenv("VERIFICATION_TOKEN_EXPIRE_HOURS", "24"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
```

#### 3. Email Service Module
**File:** `backend/app/core/email.py`

Uses `aiosmtplib` for async email sending.

Functions:
- `generate_verification_token()` - Generates secure random token using `secrets.token_urlsafe(32)`
- `get_verification_token_expiry()` - Returns expiry datetime (24 hours)
- `get_verification_url(token)` - Builds frontend verification URL
- `send_verification_email(email, name, token)` - Sends HTML + plain text verification email
- `send_resend_verification_email(email, name, token)` - Resends verification email

#### 4. API Endpoints
**File:** `backend/app/api/endpoints/auth.py`

| Endpoint | Method | Description | Rate Limit |
|----------|--------|-------------|------------|
| `/api/v1/auth/register` | POST | Create user + send verification email | 3/hour |
| `/api/v1/auth/login` | POST | Login (blocks unverified users with 403) | 5/minute |
| `/api/v1/auth/verify-email` | POST | Verify email with token | 10/minute |
| `/api/v1/auth/resend-verification` | POST | Resend verification email | 3/hour |

#### 5. Request/Response Schemas
**File:** `backend/app/schemas/user_schema.py`

```python
class RegisterResponse:
    message: str
    user: UserSchema
    requires_verification: bool = True

class VerifyEmailRequest:
    token: str

class VerifyEmailResponse:
    message: str
    verified: bool

class ResendVerificationRequest:
    email: EmailStr

class ResendVerificationResponse:
    message: str
```

### Phase 2: Dependencies (Completed)

**File:** `backend/requirements.txt`

Added:
```
aiosmtplib
```

Install with:
```bash
cd backend
pip install -r requirements.txt
```

### Phase 3: Frontend (Completed)

#### 1. API Functions
**File:** `frontend/src/api/projectApi.js`

Added functions:
- `signUp(name, email, password, occupation)` - Calls register endpoint
- `verifyEmail(token)` - Calls verify-email endpoint
- `resendVerificationEmail(email)` - Calls resend-verification endpoint

#### 2. SignUp Page Updates
**File:** `frontend/src/views/SignUp.js`

- Added verification message state
- Shows "Check Your Email" message after successful registration
- Displays email icon and instructions
- Link to navigate to login

#### 3. VerifyEmail Page
**File:** `frontend/src/views/VerifyEmail.js`

States:
- **verifying** - Shows loading spinner while validating token
- **success** - Shows success message with login button
- **expired** - Shows form to resend verification email
- **error** - Shows error message with back to login link

#### 4. Route Configuration
**File:** `frontend/src/routes.js`

Added route:
```javascript
{
  path: "/verify-email",
  exact: true,
  layout: React.Fragment,
  component: VerifyEmail,
  publicOnly: true,
  redirect: "/TEA"
}
```

### Phase 4: Security & Polish (Completed)

#### 1. Login Verification Check
**File:** `backend/app/api/endpoints/auth.py`

Added email verification check in login endpoint:
```python
# Check if email is verified
if not user.email_verified:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Please verify your email before signing in."
    )
```

This blocks unverified users from logging in with a clear error message.

#### 2. Frontend Login Error Handling
**File:** `frontend/src/views/LoginForm.js`

- Detects 403 "verify email" error from backend
- Shows warning alert with verification message
- Displays "Resend verification email" link
- Handles resend API call with loading state
- Shows success/error status for resend operation

#### 3. Token Security (Already Implemented)
- Uses cryptographically secure tokens (`secrets.token_urlsafe(32)`)
- One-time use tokens (cleared after verification)
- IP-based rate limiting with slowapi
- Token expiration (24 hours default)

#### 4. Email Template Features
- HTML email with styled template matching SAFAPAC branding
- Plain text fallback for email clients that don't support HTML
- Clear call-to-action button
- Expiration time displayed in email
- Fallback URL link if button doesn't work

## Configuration

### Environment Variables (.env)

Add to your backend `.env` file:

```env
# Email Configuration
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@safapac.com
MAIL_FROM_NAME=SAFAPAC
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_STARTTLS=True
MAIL_SSL_TLS=False

# Verification Settings
VERIFICATION_TOKEN_EXPIRE_HOURS=24
FRONTEND_URL=http://localhost:3000
```

### Gmail Setup (Recommended for Development)

1. Enable 2-Factor Authentication on your Google account
2. Go to Google Account > Security > App Passwords
3. Generate an app password for "Mail"
4. Use this app password as `MAIL_PASSWORD`

### Other Email Providers

| Provider | MAIL_SERVER | MAIL_PORT | Notes |
|----------|-------------|-----------|-------|
| Gmail | smtp.gmail.com | 587 | Requires app password |
| Outlook | smtp.office365.com | 587 | Use your email password |
| SendGrid | smtp.sendgrid.net | 587 | Use API key as password |
| AWS SES | email-smtp.{region}.amazonaws.com | 587 | Use IAM credentials |

## File Summary

### Backend Files

| File | Purpose |
|------|---------|
| `backend/app/models/user_project.py` | User model with verification fields |
| `backend/app/core/config.py` | Email and verification configuration |
| `backend/app/core/email.py` | Email service with verification functions |
| `backend/app/schemas/user_schema.py` | Verification request/response schemas |
| `backend/app/api/endpoints/auth.py` | Auth endpoints with verification logic |
| `backend/requirements.txt` | Dependencies including aiosmtplib |

### Frontend Files

| File | Purpose |
|------|---------|
| `frontend/src/api/projectApi.js` | API functions for auth and verification |
| `frontend/src/views/SignUp.js` | Signup form with verification message |
| `frontend/src/views/LoginForm.js` | Login form with unverified email handling |
| `frontend/src/views/VerifyEmail.js` | Email verification page |
| `frontend/src/routes.js` | Route configuration |

## Testing

### Manual Testing Checklist

1. **Registration Flow**
   - [x] Fill out signup form
   - [x] Submit and see "Check Your Email" message
   - [x] Verify email is received (or logged in console if not configured)

2. **Verification Flow**
   - [x] Click verification link in email
   - [x] See "Verifying..." loading state
   - [x] See success message
   - [x] Click "Sign In" and login successfully

3. **Unverified Login Flow**
   - [x] Try to login without verifying email
   - [x] See warning message "Please verify your email"
   - [x] Click "Resend verification email" link
   - [x] Receive new verification email

4. **Expired Token Flow**
   - [x] Use an expired verification link
   - [x] See "Link Expired" message
   - [x] Enter email and click "Resend"
   - [x] Receive new verification email

5. **Invalid Token Flow**
   - [x] Navigate to `/verify-email?token=invalid`
   - [x] See error message
   - [x] Click "Back to Sign In"

### Development Mode (No Email Configured)

When `MAIL_USERNAME` and `MAIL_PASSWORD` are not set:
- Verification emails are NOT sent
- Verification URL is logged to console
- Registration still succeeds
- You can manually copy the URL from logs to test verification

## API Reference

### POST /api/v1/auth/register

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "occupation": "researcher"
}
```

**Response (201):**
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "accessLevel": "CORE",
    "occupation": "researcher"
  },
  "requiresVerification": true
}
```

### POST /api/v1/auth/login

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (200) - Verified User:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "tokenType": "bearer",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "accessLevel": "CORE"
  }
}
```

**Response (403) - Unverified User:**
```json
{
  "detail": "Please verify your email before signing in."
}
```

### POST /api/v1/auth/verify-email

**Request:**
```json
{
  "token": "verification-token-from-email"
}
```

**Response (200):**
```json
{
  "message": "Email verified successfully! You can now sign in.",
  "verified": true
}
```

### POST /api/v1/auth/resend-verification

**Request:**
```json
{
  "email": "john@example.com"
}
```

**Response (200):**
```json
{
  "message": "If an account exists with this email, a verification email has been sent."
}
```

## Troubleshooting

### Email Not Sending

1. Check `MAIL_USERNAME` and `MAIL_PASSWORD` are set
2. Verify SMTP server settings
3. For Gmail, ensure app password is used (not regular password)
4. Check server logs for error messages

### Token Expired Immediately

1. Check server time is synchronized
2. Verify `VERIFICATION_TOKEN_EXPIRE_HOURS` is set correctly
3. Ensure database DateTime is in UTC

### Verification Link Not Working

1. Check `FRONTEND_URL` matches your actual frontend URL
2. Ensure route is registered in `routes.js`
3. Check browser console for JavaScript errors

### "Please verify your email" on Login

This is expected behavior for unverified users. Options:
1. Click "Resend verification email" link
2. Check email inbox (and spam folder)
3. Use verification URL from server logs (development mode)

## Future Enhancements (Optional)

These features are not currently implemented but could be added:

1. **Magic Link Login** - Allow login via email link without password
2. **Password Reset** - Email-based password recovery
3. **Two-Factor Authentication** - Additional security layer
4. **Account Lockout** - Lock account after failed attempts
5. **Email Change Verification** - Verify new email when changing
