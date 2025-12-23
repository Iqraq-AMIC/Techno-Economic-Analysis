# SAFAPAC API Changelog

**API Version**: 2.0.0
**Last Updated**: December 23, 2025

---

## Table of Contents

1. [Version 2.0.0 - Current](#version-200---current)
2. [Breaking Changes](#breaking-changes)
3. [Migration Guide](#migration-guide)

---

## Version 2.0.0 - Current

**Release Date**: December 18, 2025
**Status**: Active Development

### New Features

#### User Registration Endpoint (December 18, 2025)

**Added**: `POST /api/v1/auth/register`

New user registration system with occupation tracking.

**Request Schema**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "occupation": "student"
}
```

**Response** (201 Created):
```json
{
  "message": "Registration successful",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "accessLevel": "CORE",
    "occupation": "student"
  }
}
```

**Features**:
- Email validation using Pydantic EmailStr
- Password requirements: 8-72 characters (bcrypt limit)
- Occupation field: Must be "student" or "researcher"
- Default access level: "CORE" for new registrations
- Email uniqueness validation (returns 409 Conflict if email exists)
- Automatic password hashing with bcrypt

**Error Responses**:
- `409 Conflict`: Email already registered
- `422 Unprocessable Entity`: Invalid input data (validation errors)
- `500 Internal Server Error`: Registration system failure

**Location**: [backend/app/api/endpoints/auth.py:90](backend/app/api/endpoints/auth.py#L90)

---

### Modified Features

#### User Schema Enhancement (December 18, 2025)

**Modified**: User data model and schemas

**Changes**:
1. Added `occupation` field to User model
   - Type: Optional String
   - Allowed values: "student", "researcher"
   - Database column: nullable

2. Updated `UserSchema` response
   - Added `occupation` field (optional)
   - Included in login and registration responses

3. Database Migration Required
   - New column: `users.occupation`
   - Existing users will have `NULL` occupation

**Before**:
```json
{
  "id": "...",
  "name": "John Doe",
  "email": "john@example.com",
  "accessLevel": "CORE"
}
```

**After**:
```json
{
  "id": "...",
  "name": "John Doe",
  "email": "john@example.com",
  "accessLevel": "CORE",
  "occupation": "student"
}
```

**Impact**:
- Non-breaking: occupation is optional in responses
- Frontend can now display/use occupation information
- Login endpoint now returns occupation field

**Locations**:
- Model: [backend/app/models/user_project.py:22](backend/app/models/user_project.py#L22)
- Schema: [backend/app/schemas/user_schema.py:15](backend/app/schemas/user_schema.py#L15)
- Auth endpoint: [backend/app/api/endpoints/auth.py:129](backend/app/api/endpoints/auth.py#L129)

---

### Database Schema Changes

#### Users Table Update (December 18, 2025)

**Table**: `users`

**Added Column**:
```sql
ALTER TABLE users ADD COLUMN occupation VARCHAR NULL;
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `occupation` | `String` | NULLABLE | User occupation ("student" or "researcher") |

**Migration Script** (if using Alembic):
```python
def upgrade():
    op.add_column('users', sa.Column('occupation', sa.String(), nullable=True))

def downgrade():
    op.drop_column('users', 'occupation')
```

**Backward Compatibility**:
- ✅ Existing users: occupation will be NULL
- ✅ API responses: occupation field is optional
- ✅ No data migration required for existing users

---

### Security Enhancements

#### Password Validation (December 18, 2025)

**Enhanced**: Password handling and validation

**Changes**:
1. **Registration Password Requirements**
   - Minimum length: 8 characters
   - Maximum length: 72 characters (bcrypt limit enforced at Pydantic level)
   - Field validation in `RegisterRequest` schema

2. **Login Password Truncation**
   - Passwords > 72 characters automatically truncated
   - Warning logged when truncation occurs
   - Maintains bcrypt compatibility

**Security Best Practices**:
- ✅ Passwords hashed with bcrypt before storage
- ✅ Password never stored in plain text
- ✅ Password never returned in API responses
- ✅ Length validation prevents buffer issues
- ✅ Email uniqueness enforced at database level

**Code Reference**:
```python
# Registration validation
password: str = Field(..., min_length=8, max_length=72)

# Login truncation
if len(password_to_check) > 72:
    password_to_check = password_to_check[:72]
    logger.warning(f"Password truncated for user {login_data.email}")
```

---

### API Response Format Updates

#### CamelCase Conversion (Existing Feature)

All API responses use camelCase for JSON keys via `CamelCaseBaseModel`:

**Database/Python** → **API Response**
- `access_level` → `accessLevel`
- `created_at` → `createdAt`
- `updated_at` → `updatedAt`
- `scenario_name` → `scenarioName`
- `user_id` → `userId`

**Example**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "projectName": "My SAF Project",
  "createdAt": "2025-12-01T10:00:00Z",
  "updatedAt": "2025-12-01T10:00:00Z"
}
```

---

## Breaking Changes

### None in Version 2.0.0

All changes in this release are backward compatible:
- New registration endpoint (additive)
- New occupation field (optional)
- User schema enhancement (non-breaking)

---

## Migration Guide

### For Frontend Developers

#### Adopting User Registration

**Step 1**: Implement Registration Form
```typescript
interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  occupation: 'student' | 'researcher';
}

async function register(data: RegisterRequest) {
  const response = await fetch('http://localhost:8000/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (response.status === 409) {
    throw new Error('Email already registered');
  }

  return await response.json();
}
```

**Step 2**: Update User Interface Type
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  accessLevel: string;
  occupation?: 'student' | 'researcher';  // Optional for backward compatibility
}
```

**Step 3**: Handle Registration Flow
```typescript
// 1. Collect registration data
const registerData = {
  name: formData.name,
  email: formData.email,
  password: formData.password,
  occupation: formData.occupation  // 'student' or 'researcher'
};

// 2. Call registration endpoint
const result = await register(registerData);

// 3. User is created with CORE access level
console.log(result.user.accessLevel); // "CORE"

// 4. User can now login
const loginResult = await login({
  email: registerData.email,
  password: registerData.password
});
```

**Step 4**: Display Occupation (Optional)
```typescript
function UserProfile({ user }: { user: User }) {
  return (
    <div>
      <h2>{user.name}</h2>
      <p>Email: {user.email}</p>
      <p>Access Level: {user.accessLevel}</p>
      {user.occupation && (
        <p>Occupation: {user.occupation}</p>
      )}
    </div>
  );
}
```

---

### For Backend Developers

#### Database Migration

**Option 1: Manual SQL**
```sql
-- Add occupation column to users table
ALTER TABLE users ADD COLUMN occupation VARCHAR NULL;

-- Verify migration
SELECT id, name, email, access_level, occupation FROM users LIMIT 5;
```

**Option 2: Using Alembic**
```bash
# Generate migration
alembic revision -m "add occupation field to users table"

# Edit migration file (alembic/versions/xxx_add_occupation.py)
def upgrade():
    op.add_column('users', sa.Column('occupation', sa.String(), nullable=True))

def downgrade():
    op.drop_column('users', 'occupation')

# Apply migration
alembic upgrade head
```

**Option 3: Automatic (SQLAlchemy)**
```python
# If using create_all() in development
from app.core.database import engine, Base
Base.metadata.create_all(bind=engine)
# Column will be added automatically
```

---

#### Updating Seeding Script

If you have database seeding, update user creation:

**Before**:
```python
new_user = User(
    name="Test User",
    email="test@example.com",
    password_hash=hashed_password,
    access_level="CORE"
)
```

**After**:
```python
new_user = User(
    name="Test User",
    email="test@example.com",
    password_hash=hashed_password,
    access_level="CORE",
    occupation="researcher"  # Optional, can be None
)
```

---

### Testing Registration Endpoint

#### cURL Example
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "password": "securepass123",
    "occupation": "researcher"
  }'
```

#### Python Example
```python
import requests

response = requests.post(
    'http://localhost:8000/api/v1/auth/register',
    json={
        'name': 'Jane Smith',
        'email': 'jane@example.com',
        'password': 'securepass123',
        'occupation': 'researcher'
    }
)

if response.status_code == 201:
    print("Registration successful!")
    print(response.json())
elif response.status_code == 409:
    print("Email already exists")
else:
    print(f"Error: {response.json()}")
```

#### JavaScript/TypeScript Example
```typescript
const response = await fetch('http://localhost:8000/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'securepass123',
    occupation: 'researcher'
  })
});

const data = await response.json();
console.log(data.message); // "Registration successful"
console.log(data.user.accessLevel); // "CORE"
```

---

## Validation Rules

### Registration Request Validation

| Field | Type | Required | Constraints | Error Message |
|-------|------|----------|-------------|---------------|
| `name` | string | ✅ | 1-100 characters | "String should have at least 1 character" |
| `email` | string | ✅ | Valid email format, unique | "Value is not a valid email address" |
| `password` | string | ✅ | 8-72 characters | "String should have at least 8 characters" |
| `occupation` | string | ✅ | "student" or "researcher" | "Input should be 'student' or 'researcher'" |

### Error Response Examples

**Invalid Email Format** (422):
```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "input": "invalid-email"
    }
  ]
}
```

**Password Too Short** (422):
```json
{
  "detail": [
    {
      "type": "string_too_short",
      "loc": ["body", "password"],
      "msg": "String should have at least 8 characters",
      "input": "short",
      "ctx": {"min_length": 8}
    }
  ]
}
```

**Invalid Occupation** (422):
```json
{
  "detail": [
    {
      "type": "literal_error",
      "loc": ["body", "occupation"],
      "msg": "Input should be 'student' or 'researcher'",
      "input": "professor"
    }
  ]
}
```

**Email Already Registered** (409):
```json
{
  "detail": "Email already registered"
}
```

---

## Known Issues and Limitations

### Registration System

1. **No Email Verification**
   - Emails are not verified during registration
   - Future enhancement: Add email verification flow
   - Users can immediately login after registration

2. **Single Access Level**
   - All new users receive "CORE" access level
   - Upgrading to "ADVANCE" or "ROADSHOW" requires admin action
   - Future enhancement: Add access level management endpoints

3. **No Password Reset**
   - Password reset functionality not yet implemented
   - Users cannot recover forgotten passwords
   - Future enhancement: Add password reset flow

4. **Occupation Update**
   - No endpoint to update occupation after registration
   - Occupation is set during registration only
   - Future enhancement: Add user profile update endpoint

---

## Future Enhancements (Roadmap)

### Planned Features

#### Authentication & User Management
- [ ] Email verification system
- [ ] Password reset/forgot password flow
- [ ] User profile update endpoint (name, occupation)
- [ ] Change password endpoint
- [ ] Refresh token mechanism
- [ ] OAuth2 social login (Google, GitHub)

#### Access Control
- [ ] Admin endpoints for user management
- [ ] Access level upgrade/downgrade system
- [ ] Role-based permissions system
- [ ] API key authentication for programmatic access

#### Security
- [ ] Rate limiting on registration endpoint
- [ ] CAPTCHA integration to prevent bot registrations
- [ ] Two-factor authentication (2FA)
- [ ] Session management and device tracking
- [ ] Account lockout after failed login attempts

---

## Deprecations

### None

No features have been deprecated in version 2.0.0.

---

## Version History

| Version | Release Date | Status | Major Changes |
|---------|--------------|--------|---------------|
| 2.0.0 | Dec 18, 2025 | Current | User registration, occupation field |
| 1.x.x | Before Dec 2025 | Legacy | Initial API implementation |

---

## Support

For questions about API changes or migration assistance:
- Review the [API Documentation](API_DOCUMENTATION.md)
- Check the [Database Schema](../architecture/DATABASE_SCHEMA.md)
- Consult the backend development team

---

**Document Version**: 1.0
**Last Updated**: December 23, 2025
**API Version**: 2.0.0
**Maintained By**: Backend Development Team
