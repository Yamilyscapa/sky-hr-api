# SkyHR API Documentation - MML Format

This document is structured for Model Meta Language (MML) consumption and training purposes. It provides comprehensive API specifications with detailed schemas, examples, and structured data formats.

## API Overview

**Base URL**: `${BETTER_AUTH_URL || http://localhost:8080}`

**Architecture**: Functional Programming with Hono framework on Bun runtime

**Authentication**: Session-based via Better Auth with organization context

**Content Types**: 
- JSON for most endpoints
- multipart/form-data for file uploads
- application/json for standard requests

**CORS**: Enabled with credentials support, restricted to `TRUSTED_ORIGINS`

---

## Authentication

### Session Authentication

All protected endpoints require session authentication via Better Auth. Session cookie is set automatically on login.

**Cookie Attributes**:
- `httpOnly`: true
- `SameSite`: None
- `secure`: true (requires HTTPS in production)

**Session Lifetime**: 7 days with daily rolling updates

### Middleware Types

1. **requireAuth**: Validates session, injects `user` and `session` into context
2. **requireOrganization**: Validates organization membership, injects `organization` and `member` into context
3. **requireRole(roles[])**: Enforces specific organization roles (owner, admin, member)
4. **requireEmailVerified**: Validates email verification status

### Context Variables

After authentication middleware, the following are available in request context:
- `c.get("user")`: Authenticated user object
- `c.get("session")`: Session object
- `c.get("organization")`: Active organization object
- `c.get("member")`: Organization membership object with role

---

## Endpoint Specifications

### Health Endpoints

#### GET /health/

**Description**: Health check endpoint

**Authentication**: None (Public)

**Request**:
```
GET /health/
```

**Response 200**:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "development"
}
```

**Response Codes**: 200

---

### Storage Endpoints

#### POST /storage/register-biometric

**Description**: Upload user face image for biometric registration

**Authentication**: None (⚠️ Should be protected in production)

**Request**:
```
POST /storage/register-biometric
Content-Type: multipart/form-data

FormData:
- file: File (required) - Image or video file
```

**Constraints**:
- Max file size: 50MB
- Allowed types: jpeg, jpg, png, gif, webp, mp4, mpeg, quicktime, avi

**Response 200**:
```json
{
  "message": "File uploaded successfully",
  "url": "http://localhost:8080/upload/123-0-user-face.jpg",
  "fileName": "123-0-user-face.jpg"
}
```

**Response 400**:
```json
{
  "error": "No file provided"
}
```

**Response 500**:
```json
{
  "error": "File upload failed"
}
```

#### POST /storage/upload-qr

**Description**: Upload QR code image for location

**Authentication**: None (⚠️ Should be protected in production)

**Request**:
```
POST /storage/upload-qr
Content-Type: multipart/form-data

FormData:
- file: File (required) - Image file
- location_id: string (required) - Location identifier
```

**Response**: Same structure as `/register-biometric`

---

### Biometric Endpoints

#### POST /biometrics/compare-faces

**Description**: Compare two face images (1:1 verification)

**Authentication**: None (Public utility)

**Request**:
```
POST /biometrics/compare-faces
Content-Type: multipart/form-data

FormData:
- sourceImage: File (required)
- targetImage: File (required)
```

**Response 200**:
```json
{
  "message": "Faces compared",
  "data": {
    "isMatch": true,
    "similarity": 95.5,
    "confidence": 99.2
  }
}
```

#### POST /biometrics/detect-faces

**Description**: Detect faces in an image

**Authentication**: None (Public utility)

**Request**:
```
POST /biometrics/detect-faces
Content-Type: multipart/form-data

FormData:
- image: File (required)
```

**Response 200**:
```json
{
  "message": "Faces detected",
  "data": {
    "faceCount": 2,
    "faces": [
      {
        "boundingBox": {...},
        "confidence": 99.5
      }
    ]
  }
}
```

#### GET /biometrics/test-connection

**Description**: Test AWS Rekognition connection

**Authentication**: None (Public utility)

**Response 200**:
```json
{
  "message": "Connection test complete",
  "data": {
    "connected": true
  }
}
```

#### POST /biometrics/register

**Description**: Register user face in organization's Rekognition collection

**Authentication**: requireAuth, requireOrganization

**Request**:
```
POST /biometrics/register
Content-Type: multipart/form-data

FormData:
- image: File (required)
```

**Response 200**:
```json
{
  "message": "Face registered successfully",
  "data": {
    "success": true,
    "faceId": "abc123",
    "collectionId": "org-123-faces"
  }
}
```

#### POST /biometrics/search

**Description**: Search for faces in organization's collection

**Authentication**: requireAuth, requireOrganization

**Request**:
```
POST /biometrics/search
Content-Type: multipart/form-data

FormData:
- image: File (required)
```

**Response 200**:
```json
{
  "message": "Face search complete",
  "data": {
    "matches": [
      {
        "Face": {...},
        "Similarity": 95.5,
        "ExternalImageId": "user-123"
      }
    ]
  }
}
```

---

### Organization Endpoints

#### POST /organizations/webhook/created

**Description**: Webhook handler for organization creation (creates Rekognition collection)

**Authentication**: None (⚠️ Should verify webhook signature)

**Request**:
```json
POST /organizations/webhook/created
Content-Type: application/json

{
  "organizationId": "org-123"
}
```

**Response 200**:
```json
{
  "message": "Collection created",
  "data": {
    "organizationId": "org-123",
    "collectionId": "org-123-faces"
  }
}
```

#### POST /organizations/webhook/deleted

**Description**: Webhook handler for organization deletion (deletes Rekognition collection)

**Authentication**: None (⚠️ Should verify webhook signature)

**Request**:
```json
POST /organizations/webhook/deleted
Content-Type: application/json

{
  "organizationId": "org-123"
}
```

**Response 200**: Success confirmation

#### GET /organizations/:organizationId

**Description**: Get organization details with Rekognition collection ID

**Authentication**: None (⚠️ Should be protected)

**Request**:
```
GET /organizations/org-123
```

**Response 200**:
```json
{
  "message": "Organization found",
  "data": {
    "id": "org-123",
    "name": "Acme Corp",
    "rekognition_collection_id": "org-123-faces",
    "is_active": true
  }
}
```

---

### Geofence Endpoints

#### POST /geofence/create

**Description**: Create a new geofence with automatic QR code generation

**Authentication**: requireAuth, requireOrganization

**Request**:
```json
POST /geofence/create
Content-Type: application/json

{
  "name": "Main Office",
  "center_latitude": "40.7128",
  "center_longitude": "-74.0060",
  "radius": 100,
  "organization_id": "org-123"
}
```

**Response 200**:
```json
{
  "message": "Geofence created successfully",
  "data": {
    "id": "uuid-123",
    "name": "Main Office",
    "type": "circular",
    "center_latitude": "40.7128",
    "center_longitude": "-74.0060",
    "radius": 100,
    "organization_id": "org-123",
    "qr_code_url": "http://localhost:8080/upload/uuid-123-0-location.png",
    "active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response 400**: Invalid coordinates or missing required fields

#### POST /geofence/get

**Description**: Get geofence by ID

**Authentication**: requireAuth, requireOrganization

**Request**:
```json
POST /geofence/get
Content-Type: application/json

{
  "id": "uuid-123"
}
```

**Response 200**: Same structure as create response

**Response 404**: Geofence not found

#### GET /geofence/get-by-organization

**Description**: Get all geofences for an organization

**Authentication**: requireAuth, requireOrganization

**Request**:
```
GET /geofence/get-by-organization?id=org-123
```

**Response 200**:
```json
{
  "message": "Geofences found",
  "data": [
    {
      "id": "uuid-123",
      "name": "Main Office",
      ...
    }
  ]
}
```

#### POST /geofence/is-in

**Description**: Check if coordinates are within geofence

**Authentication**: requireAuth, requireOrganization

**Request**:
```json
POST /geofence/is-in
Content-Type: application/json

{
  "latitude": "40.7128",
  "longitude": "-74.0060",
  "geofence_id": "uuid-123"
}
```

**Response 200**:
```json
{
  "message": "User is in geofence",
  "data": {
    "isInGeofence": true
  }
}
```

---

### User-Geofence Endpoints

#### POST /user-geofence/assign

**Description**: Assign geofences to a user

**Authentication**: requireAuth, requireOrganization

**Request**:
```json
POST /user-geofence/assign
Content-Type: application/json

{
  "user_id": "user-123",
  "geofence_ids": ["uuid-123", "uuid-456"],
  "assign_all": false
}
```

**Alternative Request** (assign all):
```json
{
  "user_id": "user-123",
  "assign_all": true
}
```

**Response 200**:
```json
{
  "message": "User assigned to geofences",
  "data": {
    "new_assignments": 2,
    "existing_assignments": 0,
    "total_geofences": 2
  }
}
```

#### POST /user-geofence/remove

**Description**: Remove a geofence assignment from a user

**Authentication**: requireAuth, requireOrganization

**Request**:
```json
POST /user-geofence/remove
Content-Type: application/json

{
  "user_id": "user-123",
  "geofence_id": "uuid-123"
}
```

**Response 200**:
```json
{
  "message": "Geofence removed from user",
  "data": {
    "removed": true
  }
}
```

#### POST /user-geofence/remove-all

**Description**: Remove all geofence assignments from a user

**Authentication**: requireAuth, requireOrganization

**Request**:
```json
POST /user-geofence/remove-all
Content-Type: application/json

{
  "user_id": "user-123"
}
```

**Response 200**:
```json
{
  "message": "All geofences removed from user",
  "data": {
    "removed_count": 3
  }
}
```

#### GET /user-geofence/user-geofences

**Description**: Get all geofences assigned to a user

**Authentication**: requireAuth, requireOrganization

**Request**:
```
GET /user-geofence/user-geofences?user_id=user-123
```

**Response 200**:
```json
{
  "message": "Geofences found",
  "data": [
    {
      "id": "uuid-123",
      "name": "Main Office",
      ...
    }
  ]
}
```

#### GET /user-geofence/geofence-users

**Description**: Get all users assigned to a geofence

**Authentication**: requireAuth, requireOrganization

**Request**:
```
GET /user-geofence/geofence-users?geofence_id=uuid-123
```

**Response 200**:
```json
{
  "message": "Users found",
  "data": [
    {
      "id": "user-123",
      "name": "John Doe",
      ...
    }
  ]
}
```

#### POST /user-geofence/check-access

**Description**: Check if user has access to a geofence

**Authentication**: requireAuth, requireOrganization

**Request**:
```json
POST /user-geofence/check-access
Content-Type: application/json

{
  "user_id": "user-123",
  "geofence_id": "uuid-123"
}
```

**Response 200**:
```json
{
  "message": "Access check complete",
  "data": {
    "has_access": true
  }
}
```

---

### Schedule Endpoints

#### POST /schedules/shifts/create

**Description**: Create a new shift definition

**Authentication**: requireAuth, requireOrganization

**Request**:
```json
POST /schedules/shifts/create
Content-Type: application/json

{
  "name": "Morning Shift",
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "days_of_week": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "break_minutes": 60,
  "color": "#4CAF50",
  "active": true
}
```

**Time Format**: HH:MM:SS or HH:MM (seconds added automatically)

**Days Format**: Lowercase day names: monday, tuesday, wednesday, thursday, friday, saturday, sunday

**Response 200**:
```json
{
  "message": "Shift created",
  "data": {
    "id": "uuid-123",
    "name": "Morning Shift",
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "break_minutes": 60,
    "days_of_week": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "color": "#4CAF50",
    "active": true,
    "organization_id": "org-123",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response 400**: Invalid time format or missing required fields

#### GET /schedules/shifts

**Description**: Get all shifts for the organization

**Authentication**: requireAuth, requireOrganization

**Request**:
```
GET /schedules/shifts
```

**Response 200**:
```json
{
  "message": "Shifts found",
  "data": [
    {
      "id": "uuid-123",
      "name": "Morning Shift",
      ...
    }
  ]
}
```

#### PUT /schedules/shifts/:id

**Description**: Update an existing shift

**Authentication**: requireAuth, requireOrganization

**Request**:
```json
PUT /schedules/shifts/uuid-123
Content-Type: application/json

{
  "name": "Updated Shift Name",
  "break_minutes": 90
}
```

**Response 200**: Same structure as create

**Response 404**: Shift not found

#### POST /schedules/assign

**Description**: Assign a shift to a user

**Authentication**: requireAuth, requireOrganization

**Request**:
```json
POST /schedules/assign
Content-Type: application/json

{
  "user_id": "user-123",
  "shift_id": "uuid-123",
  "effective_from": "2024-01-01T00:00:00.000Z",
  "effective_until": null
}
```

**Date Format**: ISO 8601 timestamp

**effective_until**: null means indefinite assignment

**Response 200**:
```json
{
  "message": "Shift assigned",
  "data": {
    "id": "uuid-456",
    "user_id": "user-123",
    "shift_id": "uuid-123",
    "organization_id": "org-123",
    "effective_from": "2024-01-01T00:00:00.000Z",
    "effective_until": null,
    "created_at": "2024-01-01T00:00:00.000Z",
    "shift": {
      "id": "uuid-123",
      "name": "Morning Shift",
      ...
    }
  }
}
```

#### GET /schedules/user/:userId

**Description**: Get user's schedule

**Authentication**: requireAuth, requireOrganization

**Request**:
```
GET /schedules/user/user-123?start_date=2024-01-01&end_date=2024-01-31
```

**Response 200**:
```json
{
  "message": "Schedule found",
  "data": {
    "user_id": "user-123",
    "schedules": [
      {
        "id": "uuid-456",
        "shift": {
          "id": "uuid-123",
          "name": "Morning Shift",
          ...
        },
        "effective_from": "2024-01-01T00:00:00.000Z",
        "effective_until": null
      }
    ],
    "current_shift": {
      "id": "uuid-123",
      "name": "Morning Shift",
      ...
    }
  }
}
```

---

### Attendance Endpoints

#### POST /attendance/qr/validate

**Description**: Validate QR code data

**Authentication**: requireAuth, requireOrganization

**Request**:
```json
POST /attendance/qr/validate
Content-Type: application/json

{
  "qr_data": "hex-encoded-obfuscated-data"
}
```

**Response 200**:
```json
{
  "message": "QR valid",
  "data": {
    "location_id": "uuid-123",
    "organization_id": "org-123"
  }
}
```

**Response 400**: Invalid or malformed QR data

**Response 403**: QR doesn't belong to organization or location inactive

#### POST /attendance/check-in

**Description**: Record attendance check-in with multi-factor verification

**Authentication**: requireAuth, requireOrganization

**Request**:
```
POST /attendance/check-in
Content-Type: multipart/form-data

FormData:
- qr_data: string (required) - Obfuscated QR code data
- image: File (required) - User's face image
- latitude: string (optional) - GPS latitude
- longitude: string (optional) - GPS longitude
```

**Verification Process**:
1. QR code validation (organization and geofence match)
2. Biometric face verification (AWS Rekognition)
3. Record creation with metadata

**Response 200**:
```json
{
  "message": "Attendance recorded",
  "data": {
    "id": "uuid-789",
    "check_in": "2024-01-01T09:00:00.000Z",
    "user_id": "user-123",
    "organization_id": "org-123",
    "face_confidence": "95.5",
    "is_verified": true,
    "status": "on_time",
    "is_within_geofence": true,
    "latitude": "40.7128",
    "longitude": "-74.0060"
  }
}
```

**Response 400**: Missing qr_data or image

**Response 403**: QR mismatch, location inactive, or face doesn't match user

#### POST /attendance/check-out

**Description**: Record attendance check-out

**Authentication**: requireAuth, requireOrganization

**Request**:
```
POST /attendance/check-out
Content-Type: multipart/form-data

FormData:
- attendance_event_id: string (optional) - Specific event ID
- image: File (optional) - Face verification
- latitude: string (optional)
- longitude: string (optional)
```

**Behavior**: If event_id not provided, finds most recent check-in without check-out

**Response 200**:
```json
{
  "message": "Check-out recorded",
  "data": {
    "id": "uuid-789",
    "check_in": "2024-01-01T09:00:00.000Z",
    "check_out": "2024-01-01T17:00:00.000Z",
    "user_id": "user-123",
    "organization_id": "org-123"
  }
}
```

**Response 400**: No active check-in found

#### POST /attendance/admin/mark-absences

**Description**: Mark users as absent (Admin only)

**Authentication**: requireAuth, requireOrganization

**Request**:
```json
POST /attendance/admin/mark-absences
Content-Type: application/json

{
  "user_ids": ["user-123", "user-456"],
  "date": "2024-01-01",
  "notes": "Sick leave"
}
```

**Date Format**: YYYY-MM-DD

**Response 200**:
```json
{
  "message": "Absences marked",
  "data": {
    "marked_count": 2,
    "events": [
      {
        "id": "uuid-789",
        "status": "absent",
        ...
      }
    ]
  }
}
```

#### PUT /attendance/admin/update-status/:eventId

**Description**: Update attendance event status (Admin only)

**Authentication**: requireAuth, requireOrganization

**Request**:
```json
PUT /attendance/admin/update-status/uuid-789
Content-Type: application/json

{
  "status": "late",
  "notes": "Traffic delay"
}
```

**Valid Status Values**: "on_time", "late", "early", "absent", "out_of_bounds"

**Response 200**:
```json
{
  "message": "Status updated",
  "data": {
    "id": "uuid-789",
    "status": "late",
    "notes": "Traffic delay",
    ...
  }
}
```

**Response 404**: Event not found

#### GET /attendance/report

**Description**: Generate attendance report

**Authentication**: requireAuth, requireOrganization

**Request**:
```
GET /attendance/report?start_date=2024-01-01&end_date=2024-01-31&user_id=user-123&status=late
```

**Query Parameters**:
- start_date: string (optional) - ISO date format
- end_date: string (optional) - ISO date format
- user_id: string (optional) - Filter by user
- status: string (optional) - Filter by status

**Response 200**:
```json
{
  "message": "Report generated",
  "data": {
    "total_records": 100,
    "events": [
      {
        "id": "uuid-789",
        "check_in": "2024-01-01T09:00:00.000Z",
        "status": "late",
        ...
      }
    ],
    "summary": {
      "on_time": 80,
      "late": 15,
      "absent": 3,
      "early": 2
    }
  }
}
```

---

## Data Models

### User Object
```typescript
{
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  user_face_url: string[] | null;
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

### Organization Object
```typescript
{
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  subscription_id: uuid | null;
  is_active: boolean;
  rekognition_collection_id: string | null;
  createdAt: timestamp;
  updated_at: timestamp;
}
```

### Geofence Object
```typescript
{
  id: uuid;
  name: string;
  type: "circular" | "polygon";
  center_latitude: string | null;
  center_longitude: string | null;
  radius: number | null;
  coordinates: string | null; // JSON string for polygon
  organization_id: string;
  qr_code_url: string | null;
  active: boolean;
  created_at: timestamp;
  updated_at: timestamp;
  deleted_at: timestamp | null;
}
```

### Shift Object
```typescript
{
  id: uuid;
  name: string;
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  break_minutes: number;
  days_of_week: string[]; // ["monday", "tuesday", ...]
  color: string | null;
  active: boolean;
  organization_id: string;
  created_at: timestamp;
  updated_at: timestamp;
}
```

### Attendance Event Object
```typescript
{
  id: uuid;
  user_id: string;
  check_in: timestamp;
  check_out: timestamp | null;
  is_verified: boolean;
  status: "on_time" | "late" | "early" | "absent" | "out_of_bounds";
  source: string; // "qr_face", "manual", "fingerprint", etc.
  shift_id: uuid | null;
  is_within_geofence: boolean;
  latitude: string | null;
  longitude: string | null;
  distance_to_geofence_m: number | null;
  face_confidence: string | null;
  liveness_score: string | null;
  spoof_flag: boolean;
  notes: string | null;
  organization_id: string;
  created_at: timestamp;
  updated_at: timestamp;
  deleted_at: timestamp | null;
}
```

---

## Error Responses

All error responses follow this structure:

```json
{
  "error": "Error message",
  "details": {} // Optional additional details
}
```

### Common Error Codes

- **400 Bad Request**: Invalid request data, missing required fields
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Authenticated but insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict (e.g., duplicate entry)
- **422 Unprocessable Entity**: Validation errors
- **500 Internal Server Error**: Server-side error

---

## Environment Variables

### Required Variables

```env
# Server
PORT=8080
NODE_ENV=development|production

# Authentication
BETTER_AUTH_SECRET=<base64-encoded-secret>
BETTER_AUTH_URL=http://localhost:8080

# CORS
TRUSTED_ORIGINS=http://localhost:3000,https://example.com

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/skyhr

# Storage (Development)
BASE_URL=http://localhost:8080

# Storage (Production - S3)
S3_BUCKET=skyhr-uploads
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>

# AWS Rekognition
REKOGNITION_COLLECTION_ID=skyhr-faces

# QR Code
QR_SECRET=<base64-encoded-secret-or-plain-text>
```

---

## Response Patterns

### Success Response Pattern

```json
{
  "message": "Operation successful",
  "data": {} // Response payload
}
```

### Pagination Pattern (Future)

```json
{
  "message": "Records retrieved",
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## Rate Limiting

**Current Status**: Not implemented

**Recommended Limits**:
- General endpoints: 100 requests/minute
- Biometric endpoints: 10 requests/minute
- File uploads: 5 requests/minute

---

## Best Practices

### File Uploads

1. Always validate file type and size client-side before upload
2. Use proper MIME type validation
3. Implement upload progress tracking
4. Handle large files with chunked uploads (future)

### Authentication

1. Always include session cookie with requests
2. Handle 401 responses by redirecting to login
3. Refresh session before expiration
4. Handle organization context changes

### Error Handling

1. Always check response status code
2. Parse error messages for user feedback
3. Implement retry logic for transient errors
4. Log errors for debugging

### Security

1. Never expose API keys client-side
2. Use HTTPS in production
3. Validate all user inputs server-side
4. Implement rate limiting (future)
5. Sanitize file uploads

---

## API Versioning

**Current Version**: v1

**Version Strategy**: Not yet implemented, all endpoints are unversioned

**Future Strategy**: `/api/v1/*` or header-based versioning

---

## Testing

### Health Check Test

```bash
curl http://localhost:8080/health/
```

### Authenticated Request Example

```bash
curl -X POST http://localhost:8080/attendance/qr/validate \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{"qr_data": "hex-data"}'
```

---

## Change Log

- **v1.2.0**: Added Schedules, User-Geofence, Check-out, Reports
- **v1.1.0**: Added Geofence module, Attendance refactor
- **v1.0.0**: Initial API release

---

This documentation is optimized for MML consumption with structured schemas, consistent formatting, and comprehensive endpoint coverage.


