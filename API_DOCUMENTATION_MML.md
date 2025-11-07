# SkyHR API Documentation - LLM Optimized

**Document Version**: v1.4.0  
**Last Updated**: December 2024  
**Optimization Target**: Large Language Model (LLM) consumption and code generation

This documentation is specifically structured for optimal LLM consumption with:
- Complete endpoint specifications with request/response schemas
- Functional programming patterns throughout (no OOP)
- Comprehensive data models with TypeScript type definitions
- Detailed authentication and authorization flows
- Real-world examples and edge case handling
- Security considerations and implementation notes

---

## API Overview

**Base URL**: `${BETTER_AUTH_URL || http://localhost:8080}`

**Architecture**: 
- **Framework**: Hono.js (lightweight, fast web framework)
- **Runtime**: Bun (modern JavaScript runtime)
- **Paradigm**: Functional Programming (pure functions, immutability, composition)
- **Database**: PostgreSQL with Drizzle ORM
- **Cloud Services**: AWS Rekognition for biometrics, AWS S3 for storage

**Authentication**: 
- Session-based via Better Auth library
- Organization-scoped with role-based access control (RBAC)
- Cookie-based session management with secure flags

**Content Types**: 
- `application/json` for standard requests/responses
- `multipart/form-data` for file uploads (images, documents)
- Base64-encoded images supported in JSON payloads

**CORS**: 
- Enabled with credentials support
- Restricted to origins defined in `TRUSTED_ORIGINS` environment variable
- Preflight requests supported

---

## Endpoint Index

### Public Endpoints
- `GET /health/` - Health check

### Storage Endpoints
- `POST /storage/register-biometric` - Upload user face image
- `POST /storage/upload-qr` - Upload QR code image

### Biometric Endpoints (Public Utilities)
- `POST /biometrics/compare-faces` - Compare two face images (1:1 verification)
- `POST /biometrics/detect-faces` - Detect faces in an image
- `GET /biometrics/test-connection` - Test AWS Rekognition connection

### Biometric Endpoints (Protected)
- `POST /biometrics/register` - Register user face in organization collection
- `POST /biometrics/search` - Search for faces in organization collection

### Organization Endpoints
- `POST /organizations/webhook/created` - Webhook handler for organization creation
- `POST /organizations/webhook/deleted` - Webhook handler for organization deletion
- `GET /organizations/:organizationId` - Get organization details

### Geofence Endpoints
- `POST /geofence/create` - Create a new geofence with QR code
- `POST /geofence/get` - Get geofence by ID
- `GET /geofence/get-by-organization` - Get all geofences for organization
- `POST /geofence/is-in` - Check if coordinates are within geofence

### User-Geofence Endpoints
- `POST /user-geofence/assign` - Assign geofences to a user
- `POST /user-geofence/remove` - Remove a geofence assignment from a user
- `POST /user-geofence/remove-all` - Remove all geofence assignments from a user
- `GET /user-geofence/user-geofences` - Get all geofences assigned to a user
- `GET /user-geofence/geofence-users` - Get all users assigned to a geofence
- `POST /user-geofence/check-access` - Check if user has access to a geofence

### Schedule Endpoints
- `POST /schedules/shifts/create` - Create a new shift definition
- `GET /schedules/shifts` - Get all shifts for organization
- `PUT /schedules/shifts/:id` - Update an existing shift
- `POST /schedules/assign` - Assign a shift to a user
- `GET /schedules/user/:userId` - Get user's schedule

### Attendance Endpoints
- `POST /attendance/qr/validate` - Validate QR code data
- `POST /attendance/check-in` - Record attendance check-in (JSON + base64 image)
- `POST /attendance/check-out` - Record attendance check-out
- `POST /attendance/admin/mark-absences` - Auto-mark absent users
- `PUT /attendance/admin/update-status/:eventId` - Update attendance event status
- `GET /attendance/events` - Get attendance events with filtering
- `GET /attendance/report` - Get flagged attendance events report

### Announcement Endpoints
- `POST /announcements/` - Create a new announcement (Admin only)
- `GET /announcements/` - Get all active announcements
- `GET /announcements/:id` - Get a specific announcement by ID
- `PUT /announcements/:id` - Update an existing announcement (Admin only)
- `DELETE /announcements/:id` - Soft delete an announcement (Admin only)

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
GET /geofence/get-by-organization?id=org-123&page=1&pageSize=20
```

**Query Parameters**:
- `id`: string (required) - Organization ID
- `page`: integer (default: 1) - Page number for pagination
- `pageSize`: integer (default: 20, max: 100) - Items per page

**Response 200**:
```json
{
  "message": "Geofences found",
  "data": [
    {
      "id": "uuid-123",
      "name": "Main Office",
      "type": "circular",
      "center_latitude": "40.7128",
      "center_longitude": "-74.0060",
      "radius": 100,
      "qr_code_url": "https://...",
      "active": true,
      "organization_id": "org-123",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

**Response 400**: Invalid pagination parameters or missing organization ID

**Response 404**: No geofences found for organization

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
GET /user-geofence/user-geofences?user_id=user-123&page=1&pageSize=20
```

**Query Parameters**:
- `user_id`: string (required) - User ID
- `page`: integer (default: 1) - Page number for pagination
- `pageSize`: integer (default: 20, max: 100) - Items per page

**Response 200**:
```json
{
  "message": "User geofences retrieved successfully",
  "data": [
    {
      "id": "assignment-uuid",
      "geofence_id": "uuid-123",
      "created_at": "2024-01-01T00:00:00.000Z",
      "geofence": {
        "id": "uuid-123",
        "name": "Main Office",
        "type": "circular",
        "center_latitude": "40.7128",
        "center_longitude": "-74.0060",
        "radius": 100,
        "qr_code_url": "https://...",
        "active": true
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 8,
    "totalPages": 1
  }
}
```

**Response 400**: Invalid pagination parameters or missing user_id

#### GET /user-geofence/geofence-users

**Description**: Get all users assigned to a geofence

**Authentication**: requireAuth, requireOrganization

**Request**:
```
GET /user-geofence/geofence-users?geofence_id=uuid-123&page=1&pageSize=20
```

**Query Parameters**:
- `geofence_id`: string (required) - Geofence ID
- `page`: integer (default: 1) - Page number for pagination
- `pageSize`: integer (default: 20, max: 100) - Items per page

**Response 200**:
```json
{
  "message": "Geofence users retrieved successfully",
  "data": [
    {
      "id": "assignment-uuid",
      "user_id": "user-123",
      "created_at": "2024-01-01T00:00:00.000Z",
      "user": {
        "id": "user-123",
        "name": "John Doe",
        "email": "john@example.com",
        "image": "https://..."
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

**Response 400**: Invalid pagination parameters or missing geofence_id

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
GET /schedules/shifts?page=1&pageSize=20
```

**Query Parameters**:
- `page`: integer (default: 1) - Page number for pagination
- `pageSize`: integer (default: 20, max: 100) - Items per page

**Response 200**:
```json
{
  "message": "Shifts retrieved successfully",
  "data": [
    {
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
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

**Response 400**: Invalid pagination parameters

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
```json
POST /attendance/check-in
Content-Type: application/json

{
  "organization_id": "org-123",
  "location_id": "uuid-123",
  "image": "base64-encoded-image-string",
  "latitude": "40.7128",
  "longitude": "-74.0060"
}
```

**Image Format**: Base64-encoded image string (with or without data URL prefix)

**Verification Process**:
1. User organization membership validation
2. Location validation (organization and geofence match)
3. Geofence boundary validation
4. Duplicate check-in prevention (one active check-in per day)
5. Biometric face verification (AWS Rekognition 1:N search)
6. Shift-based status calculation (on_time, late, early, out_of_bounds)

**Response 200**:
```json
{
  "message": "Attendance recorded successfully",
  "data": {
    "id": "uuid-789",
    "check_in": "2024-01-01T09:00:00.000Z",
    "user_id": "user-123",
    "organization_id": "org-123",
    "shift_id": "uuid-456",
    "status": "on_time",
    "is_within_geofence": true,
    "distance_to_geofence_m": 45,
    "face_confidence": "95.5",
    "is_verified": true,
    "notes": null
  }
}
```

**Response 200 (Out of Bounds)**:
```json
{
  "message": "Attendance recorded but flagged as out of bounds",
  "data": {
    "id": "uuid-789",
    "status": "out_of_bounds",
    "is_within_geofence": false,
    "distance_to_geofence_m": 250,
    "notes": "Check-in 250m from geofence (radius: 100m).",
    ...
  }
}
```

**Response 400**: Missing required fields, invalid coordinates, duplicate check-in, or invalid base64 image

**Response 403**: User not in organization, location inactive, or face doesn't match user

**Response 404**: Organization not found

#### POST /attendance/check-out

**Description**: Record attendance check-out for the user's active check-in

**Authentication**: requireAuth, requireOrganization

**Request**:
```
POST /attendance/check-out
Content-Type: multipart/form-data

FormData:
- latitude: string (required) - GPS latitude
- longitude: string (required) - GPS longitude
```

**Behavior**: Automatically finds today's active check-in (no check-out yet) for the authenticated user

**Response 200**:
```json
{
  "message": "Check-out recorded successfully",
  "data": {
    "id": "uuid-789",
    "check_in": "2024-01-01T09:00:00.000Z",
    "check_out": "2024-01-01T17:00:00.000Z",
    "work_duration_minutes": 480,
    "status": "on_time",
    "is_verified": true
  }
}
```

**Response 400**: Missing latitude/longitude, invalid coordinates, or no active check-in found

**Response 401**: Unauthorized - missing user or organization context

#### POST /attendance/admin/mark-absences

**Description**: Automatically mark users as absent who have active shifts but haven't checked in within grace period

**Authentication**: requireAuth, requireOrganization

**Request**:
```
POST /attendance/admin/mark-absences
Content-Type: application/json
```

**Behavior**: 
- Finds all users with active shifts for today
- Checks if grace period has passed since shift start time
- Marks users as absent if no check-in exists
- Creates attendance records with status "absent" and source "system"

**Response 200**:
```json
{
  "message": "Marked 3 user(s) as absent",
  "data": {
    "count": 3,
    "absences": [
      {
        "id": "uuid-789",
        "user_id": "user-123",
        "shift_id": "uuid-456",
        "notes": "Auto-marked absent. Expected shift start: 09:00:00"
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

#### GET /attendance/events

**Description**: Get attendance events with filtering and pagination

**Authentication**: requireAuth, requireOrganization

**Request**:
```
GET /attendance/events?user_id=user-123&start_date=2024-01-01&end_date=2024-01-31&status=late&page=1&pageSize=20
```

**Query Parameters**:
- `user_id`: string (optional) - Filter by specific user, otherwise returns all organization events
- `start_date`: string (optional) - ISO date format
- `end_date`: string (optional) - ISO date format (end of day automatically added)
- `status`: string (optional) - Filter by status (on_time, late, early, absent, out_of_bounds)
- `page`: integer (default: 1) - Page number for pagination
- `pageSize`: integer (default: 20, max: 100) - Items per page

**Response 200**:
```json
{
  "message": "Attendance events retrieved successfully",
  "data": [
    {
      "id": "uuid-789",
      "user_id": "user-123",
      "organization_id": "org-123",
      "check_in": "2024-01-01T09:00:00.000Z",
      "check_out": "2024-01-01T17:00:00.000Z",
      "status": "late",
      "is_verified": true,
      "is_within_geofence": true,
      "distance_to_geofence_m": 45,
      "latitude": "40.7128",
      "longitude": "-74.0060",
      "source": "mobile_app",
      "face_confidence": "95.5",
      "liveness_score": null,
      "spoof_flag": false,
      "shift_id": "uuid-456",
      "notes": "Checked in 15 minutes late.",
      "created_at": "2024-01-01T09:00:00.000Z",
      "updated_at": "2024-01-01T09:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

**Response 400**: Invalid pagination parameters or invalid date/status format

#### GET /attendance/report

**Description**: Get flagged attendance events report (out_of_bounds, absent, late)

**Authentication**: requireAuth, requireOrganization

**Request**:
```
GET /attendance/report
```

**Response 200**:
```json
{
  "message": "Attendance report retrieved successfully",
  "data": {
    "flagged_count": 23,
    "flagged_events": [
      {
        "id": "uuid-789",
        "user_id": "user-123",
        "check_in": "2024-01-01T09:15:00.000Z",
        "check_out": "2024-01-01T17:00:00.000Z",
        "status": "late",
        "is_within_geofence": true,
        "distance_to_geofence_m": 45,
        "shift_id": "uuid-456",
        "notes": null
      }
    ]
  }
}
```

---

### Announcement Endpoints

#### POST /announcements/

**Description**: Create a new announcement

**Authentication**: requireAuth, requireOrganization, requireRole(['owner', 'admin'])

**Request**:
```json
POST /announcements/
Content-Type: application/json

{
  "title": "Office Closure Notice",
  "content": "The office will be closed on Monday for maintenance.",
  "priority": "important",
  "published_at": "2024-01-01T00:00:00.000Z",
  "expires_at": "2024-01-31T23:59:59.999Z"
}
```

**Priority Values**: "normal", "important", "urgent"

**Date Fields**:
- published_at: ISO 8601 timestamp (defaults to now if not provided)
- expires_at: ISO 8601 timestamp or null for no expiration

**Response 201**:
```json
{
  "message": "Announcement created successfully",
  "data": {
    "id": "uuid-123",
    "organizationId": "org-123",
    "title": "Office Closure Notice",
    "content": "The office will be closed on Monday for maintenance.",
    "priority": "important",
    "publishedAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": "2024-01-31T23:59:59.999Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response 400**: Missing required fields (title, content) or invalid priority/dates

**Response 401**: Unauthorized - insufficient permissions

#### GET /announcements/

**Description**: Get all active announcements for organization

**Authentication**: requireAuth, requireOrganization

**Request**:
```
GET /announcements/?includeExpired=false&includeFuture=false&page=1&pageSize=20
```

**Query Parameters**:
- `includeExpired`: boolean (default: false, Admin only) - Include expired announcements
- `includeFuture`: boolean (default: false, Admin only) - Include not-yet-published announcements
- `page`: integer (default: 1) - Page number for pagination
- `pageSize`: integer (default: 20, max: 100) - Items per page

**Behavior**:
- Regular members only see currently active announcements (published and not expired)
- Admins/owners can use query parameters to include expired or future announcements
- Results are paginated and ordered by `published_at` descending (newest first)

**Response 200**:
```json
{
  "message": "Announcements retrieved successfully",
  "data": [
    {
      "id": "uuid-123",
      "organizationId": "org-123",
      "title": "Office Closure Notice",
      "content": "The office will be closed on Monday for maintenance.",
      "priority": "important",
      "publishedAt": "2024-01-01T00:00:00.000Z",
      "expiresAt": "2024-01-31T23:59:59.999Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 47,
    "totalPages": 3
  }
}
```

**Response 400**: Invalid pagination parameters

#### GET /announcements/:id

**Description**: Get a specific announcement by ID

**Authentication**: requireAuth, requireOrganization

**Request**:
```
GET /announcements/uuid-123
```

**Behavior**:
- Regular members can only view active announcements
- Admins/owners can view any announcement (including expired or future)

**Response 200**:
```json
{
  "message": "Announcement retrieved successfully",
  "data": {
    "id": "uuid-123",
    "organizationId": "org-123",
    "title": "Office Closure Notice",
    "content": "The office will be closed on Monday for maintenance.",
    "priority": "important",
    "publishedAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": "2024-01-31T23:59:59.999Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response 404**: Announcement not found or not accessible

#### PUT /announcements/:id

**Description**: Update an existing announcement

**Authentication**: requireAuth, requireOrganization, requireRole(['owner', 'admin'])

**Request**:
```json
PUT /announcements/uuid-123
Content-Type: application/json

{
  "title": "Updated Title",
  "priority": "urgent",
  "expires_at": "2024-02-15T23:59:59.999Z"
}
```

**Partial Updates**: Only provide fields you want to update

**Updatable Fields**:
- title: string
- content: string
- priority: "normal" | "important" | "urgent"
- published_at: ISO 8601 timestamp
- expires_at: ISO 8601 timestamp or null

**Validation**:
- expires_at must be greater than published_at
- At least one field must be provided

**Response 200**:
```json
{
  "message": "Announcement updated successfully",
  "data": {
    "id": "uuid-123",
    "title": "Updated Title",
    "priority": "urgent",
    "expiresAt": "2024-02-15T23:59:59.999Z",
    "updatedAt": "2024-01-02T10:30:00.000Z",
    ...
  }
}
```

**Response 400**: Validation errors (empty fields, invalid dates, no fields provided)

**Response 404**: Announcement not found

#### DELETE /announcements/:id

**Description**: Soft delete an announcement (sets deleted_at timestamp)

**Authentication**: requireAuth, requireOrganization, requireRole(['owner', 'admin'])

**Request**:
```
DELETE /announcements/uuid-123
```

**Response 200**:
```json
{
  "message": "Announcement deleted successfully",
  "data": {
    "id": "uuid-123",
    "organizationId": "org-123",
    "title": "Office Closure Notice",
    "content": "The office will be closed on Monday for maintenance.",
    "priority": "important",
    "publishedAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": "2024-01-31T23:59:59.999Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-02T15:00:00.000Z"
  }
}
```

**Response 404**: Announcement not found

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
  source: string; // "qr_face", "system", "manual", "fingerprint", etc.
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

### Announcement Object
```typescript
{
  id: uuid;
  organizationId: string;
  title: string;
  content: string;
  priority: "normal" | "important" | "urgent";
  publishedAt: timestamp;
  expiresAt: timestamp | null;
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

### Organization Settings Object
```typescript
{
  id: uuid;
  organization_id: string;
  grace_period_minutes: number; // Default: 5 minutes
  timezone: string; // Default: "UTC"
  created_at: timestamp;
  updated_at: timestamp;
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

### Pagination Pattern

Pagination is implemented across all list endpoints using query parameters `page` and `pageSize`.

**Query Parameters**:
- `page`: integer (default: 1) - Page number (1-indexed, must be positive)
- `pageSize`: integer (default: 20, max: 100) - Number of items per page

**Response Format**:
```json
{
  "message": "Records retrieved successfully",
  "data": [
    // ... array of items
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Pagination Metadata**:
- `page`: Current page number
- `pageSize`: Items per page
- `total`: Total number of items across all pages
- `totalPages`: Total number of pages (calculated as `ceil(total / pageSize)`)

**Error Handling**:
- Invalid `page` or `pageSize` values return `400 Bad Request` with `PaginationError`
- `pageSize` values exceeding 100 are automatically capped at 100
- Non-integer or negative values are rejected

**Endpoints with Pagination**:
- `GET /announcements/`
- `GET /attendance/events`
- `GET /geofence/get-by-organization`
- `GET /user-geofence/user-geofences`
- `GET /user-geofence/geofence-users`
- `GET /schedules/shifts`

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

## Important Implementation Notes

### Attendance Check-In Process

The check-in endpoint implements a comprehensive multi-factor verification system:

1. **User Validation**: Verifies user belongs to the specified organization
2. **Location Validation**: Ensures geofence exists, is active, and belongs to organization
3. **Geofence Boundary Check**: Calculates Haversine distance to determine if user is within radius
4. **Duplicate Prevention**: Prevents multiple active check-ins per day (one check-in must be checked-out before creating new one)
5. **Biometric Verification**: Uses AWS Rekognition 1:N face search within organization's collection
6. **Shift-Based Status**: Automatically calculates status (on_time, late, early) based on user's active shift and organization grace period
7. **Out of Bounds Handling**: If user is outside geofence radius, status is overridden to "out_of_bounds"

### Grace Period and Status Calculation

Organizations have configurable grace period settings (default: 5 minutes):
- **Early**: Check-in more than grace_period_minutes before shift start
- **On Time**: Check-in within ±grace_period_minutes of shift start
- **Late**: Check-in more than grace_period_minutes after shift start
- **Out of Bounds**: Check-in outside geofence radius (overrides other statuses)
- **Absent**: No check-in within grace period (auto-marked by system)

### Biometric Security

- Face images are stored as base64 in check-in requests
- AWS Rekognition searches within organization-specific collections
- Similarity threshold enforced at search level
- Face confidence scores stored with attendance records

### QR Code Security

- QR codes contain obfuscated JSON payload with organization_id and location_id
- Payload encrypted using QR_SECRET environment variable
- Validation ensures QR belongs to user's active organization
- Location must be active in database

---

## Change Log

- **v1.4.0**: Implemented pagination across all list endpoints (Announcements, Attendance, Geofence, User-Geofence, Schedules). Added reusable pagination utility with consistent query parameters (`page`, `pageSize`) and response metadata. Added bulk attendance generation script for testing.
- **v1.3.0**: Added Announcements module, Organization Settings, improved attendance validation
- **v1.2.0**: Added Schedules, User-Geofence, Check-out, Reports
- **v1.1.0**: Added Geofence module, Attendance refactor
- **v1.0.0**: Initial API release

---

## Documentation Structure Summary

### For LLM Code Generation

When generating code that interacts with this API:

1. **Always use functional programming patterns** - No classes, use pure functions
2. **Handle authentication properly** - All protected endpoints require session cookies
3. **Validate organization context** - Most endpoints require organization membership
4. **Include proper error handling** - Check for 400, 401, 403, 404, 500 responses
5. **Use TypeScript types** - Leverage the data model definitions provided
6. **Follow security best practices** - Validate inputs, use HTTPS, handle sensitive data properly

### Key Features to Understand

**Multi-Factor Attendance Verification**: Check-in combines QR codes, GPS geofencing, biometric facial recognition, and shift validation.

**Organization Isolation**: Each organization has isolated Rekognition collections and data boundaries.

**Role-Based Access**: Three roles (owner, admin, member) with hierarchical permissions.

**Shift Management**: Flexible shift scheduling with grace periods and automatic status calculation.

**Soft Deletes**: Many entities use `deleted_at` timestamps instead of hard deletion.

### Common Integration Patterns

```typescript
// Example: Authenticated request with organization context
const response = await fetch(`${BASE_URL}/attendance/check-in`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Important: sends cookies
  body: JSON.stringify({
    organization_id: 'org-123',
    location_id: 'uuid-123',
    image: 'base64-encoded-image',
    latitude: '40.7128',
    longitude: '-74.0060',
  }),
});

const data = await response.json();
if (response.ok) {
  console.log('Check-in successful:', data.data);
} else {
  console.error('Check-in failed:', data.error);
}
```

### Testing Recommendations

1. Use `/health/` endpoint for connectivity tests
2. Test biometric endpoints with `/biometrics/test-connection`
3. Validate QR codes before attempting check-in
4. Test geofence boundaries with `/geofence/is-in`
5. Use `/attendance/events` for debugging attendance records

---

This documentation is optimized for LLM consumption with structured schemas, consistent formatting, and comprehensive endpoint coverage. All code examples use functional programming patterns and modern JavaScript/TypeScript best practices.

**Maintained by**: SkyHR Development Team  
**Support**: Contact via repository issues or documentation feedback

