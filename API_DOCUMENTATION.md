# SkyHR API Documentation

## Overview

The SkyHR API is a comprehensive human resources management system built with TypeScript, Hono framework, and Better Auth for authentication. The API provides endpoints for user management, biometric authentication, file storage, organization management, and health monitoring.

## Base URL

```
http://localhost:8080
```

## Authentication

The API uses Better Auth for authentication with the following features:
- Email/Password authentication
- Organization-based multi-tenancy
- Team management within organizations
- Session management (7-day expiration with daily updates)
- Expo mobile app support

### Authentication Headers

For protected endpoints, include the session token in your request headers:

```http
Authorization: Bearer <session_token>
```

## API Endpoints

### 1. Health Check

#### GET /health

Check the API health status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "development"
}
```

---

### 2. Authentication Endpoints

All authentication endpoints are handled by Better Auth and available under `/auth/*`.

#### User Registration
**POST** `/auth/sign-up/email`

Register a new user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": false,
    "user_face_url": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "session": {
    "id": "session_id",
    "expiresAt": "2024-01-08T00:00:00.000Z",
    "token": "session_token",
    "userId": "user_id",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### User Login
**POST** `/auth/sign-in/email`

Authenticate user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": true,
    "user_face_url": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "session": {
    "id": "session_id",
    "expiresAt": "2024-01-08T00:00:00.000Z",
    "token": "session_token",
    "userId": "user_id",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### User Logout
**POST** `/auth/sign-out`

End the current user session.

**Response:**
```json
{
  "message": "Successfully signed out"
}
```

#### Get Current Session
**GET** `/auth/session`

Get information about the current session.

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": true,
    "user_face_url": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "session": {
    "id": "session_id",
    "expiresAt": "2024-01-08T00:00:00.000Z",
    "token": "session_token",
    "userId": "user_id",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Get Current User
**GET** `/auth/user`

Get current user information.

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "John Doe",
  "emailVerified": true,
  "user_face_url": [],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Update User
**POST** `/auth/user/update`

Update user information.

**Request Body:**
```json
{
  "name": "Updated Name",
  "user_face_url": ["https://example.com/avatar1.jpg", "https://example.com/avatar2.jpg"]
}
```

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "Updated Name",
  "emailVerified": true,
  "user_face_url": ["https://example.com/avatar1.jpg", "https://example.com/avatar2.jpg"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Change Password
**POST** `/auth/user/change-password`

Change user password.

**Request Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

**Response:**
```json
{
  "message": "Password changed successfully"
}
```

#### Send Verification Email
**POST** `/auth/send-verification-email`

Send email verification to user.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Verification email sent"
}
```

#### Verify Email
**POST** `/auth/verify-email`

Verify user email with token.

**Request Body:**
```json
{
  "token": "verification_token"
}
```

**Response:**
```json
{
  "message": "Email verified successfully"
}
```

#### Forgot Password
**POST** `/auth/forget-password`

Request password reset.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Password reset email sent"
}
```

#### Reset Password
**POST** `/auth/reset-password`

Reset password with token.

**Request Body:**
```json
{
  "token": "reset_token",
  "password": "new_password"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

#### Organization Management

##### Create Organization
**POST** `/auth/organization/create`

Create a new organization.

**Request Body:**
```json
{
  "name": "My Organization",
  "slug": "my-organization"
}
```

**Response:**
```json
{
  "organization": {
    "id": "org_id",
    "name": "My Organization",
    "slug": "my-organization",
    "logo": null,
    "metadata": null,
    "subscription_id": null,
    "is_active": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

##### List User Organizations
**GET** `/auth/organization/list`

Get all organizations for the current user.

**Response:**
```json
{
  "organizations": [
    {
      "id": "org_id",
      "name": "My Organization",
      "slug": "my-organization",
      "logo": null,
      "metadata": null,
      "subscription_id": null,
      "is_active": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

##### Set Active Organization
**POST** `/auth/organization/set-active`

Set the active organization for the current user.

**Request Body:**
```json
{
  "organizationId": "org_id"
}
```

**Response:**
```json
{
  "message": "Active organization set successfully"
}
```

##### Update Organization
**POST** `/auth/organization/update`

Update organization information.

**Request Body:**
```json
{
  "organizationId": "org_id",
  "name": "Updated Organization Name",
  "slug": "updated-slug"
}
```

**Response:**
```json
{
  "organization": {
    "id": "org_id",
    "name": "Updated Organization Name",
    "slug": "updated-slug",
    "logo": null,
    "metadata": null,
    "subscription_id": null,
    "is_active": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 3. Biometric Endpoints

#### Public Biometric Utilities

##### Compare Faces
**POST** `/biometrics/compare-faces`

Compare two face images to determine if they belong to the same person.

**Request:** `multipart/form-data`
- `sourceImage`: File (source face image)
- `targetImage`: File (target face image)

**Response:**
```json
{
  "message": "Face comparison completed",
  "data": {
    "similarity": 0.95,
    "confidence": 0.98,
    "match": true
  }
}
```

##### Detect Faces
**POST** `/biometrics/detect-faces`

Detect faces in an image.

**Request:** `multipart/form-data`
- `image`: File (image containing faces)

**Response:**
```json
{
  "message": "Face detection completed",
  "data": {
    "faces": [
      {
        "boundingBox": {
          "left": 100,
          "top": 50,
          "width": 200,
          "height": 250
        },
        "confidence": 0.99
      }
    ],
    "faceCount": 1
  }
}
```

##### Test Connection
**GET** `/biometrics/test-connection`

Test AWS Rekognition connection.

**Response:**
```json
{
  "message": "Rekognition connection test completed",
  "data": {
    "connected": true
  }
}
```

#### Admin Biometric Operations

##### Index Face (Admin)
**POST** `/biometrics/index-face`

Index a face for admin/system level operations.

**Authentication:** Required

**Request:** `multipart/form-data`
- `image`: File (face image)
- `externalImageId`: String (unique identifier for the face)

**Response:**
```json
{
  "message": "Face indexing completed",
  "data": {
    "faceId": "face_id",
    "externalImageId": "external_id",
    "collectionId": "collection_id"
  }
}
```

##### Search Faces (Admin)
**POST** `/biometrics/search-faces`

Search for faces in the system.

**Authentication:** Required

**Request:** `multipart/form-data`
- `image`: File (image to search for)

**Response:**
```json
{
  "message": "Face search completed",
  "data": {
    "matches": [
      {
        "faceId": "face_id",
        "externalImageId": "external_id",
        "similarity": 0.95,
        "confidence": 0.98
      }
    ]
  }
}
```

#### Organization-Specific Biometric Operations

##### Index Face for Organization
**POST** `/biometrics/organization/index-face`

Index a face for a specific organization.

**Authentication:** Required

**Request:** `multipart/form-data`
- `image`: File (face image)
- `externalImageId`: String (unique identifier for the face)
- `organizationId`: String (organization ID)

**Response:**
```json
{
  "message": "Face indexing for organization completed",
  "data": {
    "faceId": "face_id",
    "externalImageId": "external_id",
    "organizationId": "org_id",
    "collectionId": "org_collection_id"
  }
}
```

##### Search Faces for Organization
**POST** `/biometrics/organization/search-faces`

Search for faces within a specific organization.

**Authentication:** Required

**Request:** `multipart/form-data`
- `image`: File (image to search for)
- `organizationId`: String (organization ID)

**Response:**
```json
{
  "message": "Face search for organization completed",
  "data": {
    "matches": [
      {
        "faceId": "face_id",
        "externalImageId": "external_id",
        "similarity": 0.95,
        "confidence": 0.98
      }
    ],
    "organizationId": "org_id"
  }
}
```

#### User-Level Biometric Operations

##### Register User Biometrics
**POST** `/biometrics/register`

Register biometric data for the current user in their organization.

**Authentication:** Required
**Organization:** Required

**Request:** `multipart/form-data`
- `image`: File (face image)

**Response:**
```json
{
  "message": "User biometrics registered successfully for organization",
  "data": {
    "faceId": "face_id",
    "userId": "user_id",
    "organizationId": "org_id",
    "organizationName": "Organization Name",
    "collectionId": "org_collection_id"
  }
}
```

##### Search User Biometrics
**POST** `/biometrics/search`

Search for users within the current user's organization.

**Authentication:** Required
**Organization:** Required

**Request:** `multipart/form-data`
- `image`: File (image to search for)

**Response:**
```json
{
  "message": "User biometric search completed within organization",
  "data": {
    "matches": [
      {
        "faceId": "face_id",
        "externalImageId": "user_id",
        "similarity": 0.95,
        "confidence": 0.98
      }
    ],
    "organizationId": "org_id",
    "organizationName": "Organization Name"
  }
}
```

---

### 4. Storage Endpoints

#### Register Biometric
**POST** `/storage/register-biometric`

Upload and register a biometric image for a user.

**Request:** `multipart/form-data`
- `file`: File (biometric image file)

**Response:**
```json
{
  "message": "File uploaded successfully",
  "url": "https://storage.example.com/path/to/file.jpg",
  "fileName": "123-0-user-face.jpg"
}
```

---

### 5. Organization Management Endpoints

#### Organization Webhooks

##### Organization Created Webhook
**POST** `/organizations/webhook/created`

Internal webhook for organization creation events.

**Request Body:**
```json
{
  "organizationId": "org_id"
}
```

**Response:**
```json
{
  "message": "Organization collection created successfully",
  "data": {
    "organizationId": "org_id",
    "collectionId": "collection_id"
  }
}
```

##### Organization Deleted Webhook
**POST** `/organizations/webhook/deleted`

Internal webhook for organization deletion events.

**Request Body:**
```json
{
  "organizationId": "org_id"
}
```

**Response:**
```json
{
  "message": "Organization collection deleted successfully",
  "data": {
    "organizationId": "org_id"
  }
}
```

#### Organization Management

##### Get Organization Details
**GET** `/organizations/:organizationId`

Get detailed information about an organization.

**Parameters:**
- `organizationId`: String (organization ID)

**Response:**
```json
{
  "message": "Organization retrieved successfully",
  "data": {
    "id": "org_id",
    "name": "Organization Name",
    "slug": "organization-slug",
    "logo": null,
    "metadata": null,
    "subscription_id": null,
    "is_active": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "collectionId": "collection_id"
  }
}
```

##### Ensure Collection
**POST** `/organizations/:organizationId/ensure-collection`

Manually create or ensure organization collection exists.

**Parameters:**
- `organizationId`: String (organization ID)

**Response:**
```json
{
  "message": "Organization collection ensured successfully",
  "data": {
    "organizationId": "org_id",
    "collectionId": "collection_id"
  }
}
```

---

## Error Responses

All endpoints return consistent error responses in the following format:

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

### Common HTTP Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

### Authentication Errors

- `401` - No valid session found
- `401` - Session expired
- `403` - Organization membership required
- `403` - Email verification required
- `403` - Insufficient role permissions

---

## Rate Limiting

Currently, no rate limiting is implemented. Consider implementing rate limiting for production use.

---

## CORS

The API supports CORS for the following origins:
- `http://localhost:3000` (Web development)
- `https://localhost:3000` (Web development HTTPS)
- `skyhr://` (Expo deep link scheme)
- `exp://` (Expo development scheme)
- `exp+skyhr://` (Expo development scheme with custom)

---

## Environment Variables

Required environment variables:

```env
BETTER_AUTH_SECRET=your_secret_key_here
BETTER_AUTH_URL=http://localhost:8080
TRUSTED_ORIGINS=http://localhost:3000,https://your-domain.com,skyhr://,exp://
NODE_ENV=development
```

---

## Database Schema

The API uses PostgreSQL with Drizzle ORM. Key tables include:

- `users` - User information with biometric URLs
- `sessions` - User sessions
- `accounts` - User accounts (email/password, OAuth)
- `verificationTokens` - Email verification tokens
- `organization` - Organizations
- `member` - Organization memberships
- `invitation` - Organization invitations
- `team` - Teams within organizations
- `teamMember` - Team memberships

---

## Security Considerations

1. **Authentication**: All protected endpoints require valid session tokens
2. **Organization Isolation**: Biometric data is isolated per organization
3. **File Upload**: Biometric images are validated and stored securely
4. **Session Management**: Sessions expire after 7 days with daily updates
5. **Email Verification**: Users must verify their email addresses

---

## Development

### Running the API

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production mode
npm start
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

---

## Support

For API support and questions, please contact the development team or refer to the project repository.
