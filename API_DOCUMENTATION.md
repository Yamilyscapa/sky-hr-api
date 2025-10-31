# SkyHR API Documentation

## Overview
The SkyHR API is built on Hono (Bun runtime). It exposes modules for health checks, authentication (via Better Auth), storage, biometrics (AWS Rekognition), organizations, QR workflows, and attendance. Base app mounts all routes at `/`.

- Base URL: `${BETTER_AUTH_URL || http://localhost:8080}`
- CORS: Restricted to `TRUSTED_ORIGINS` (comma-separated). Credentials enabled.
- Static files (development): `/upload/*` serves files from local `upload/` directory.

## Authentication
Authentication is handled by Better Auth with Drizzle (Postgres). The auth system mounts at `/auth/*` and includes organizations and teams.

- Session cookie: `httpOnly`, `SameSite=None`, `secure=true` (requires HTTPS in production)
- Session lifetime: 7 days, daily rolling update
- Trusted origins: from `TRUSTED_ORIGINS` or defaults for local dev
- Additional user field: `user_face_url: string[] | null`

Protected endpoints use middleware:
- `requireAuth`: Validates session and injects `user` and `session` into context
- `requireOrganization`: Validates membership and loads `member` and `organization` into context
- `requireRole(roles[])`: Enforces org role membership
- `requireEmailVerified`: Enforces verified email

Note: The `/auth/*` endpoints are provided by Better Auth’s handler and are not listed individually here.

## HTTP Conventions
- Success: JSON bodies with `message?`, `data?`. Standard HTTP codes via `successResponse`.
- Error: JSON bodies `{ error, details? }` with proper HTTP codes via `errorResponse`.

## Modules and Endpoints

### Health
Base path: `/health`

- GET `/health/`
  - Public
  - Response 200:
    ```json
    { "status": "OK", "timestamp": "ISO-8601", "version": "1.0.0", "environment": "..." }
    ```

### Auth (Better Auth)
Base path: `/auth/*`

- All methods proxy to Better Auth handler. Examples include sign-in, sign-out, organizations, invitations, sessions, etc. Refer to Better Auth docs. Base path is configured as `/auth` (not `/api/auth`).

### Storage
Base path: `/storage`

- POST `/storage/register-biometric`
  - Public in current code path (no auth middleware in router)
  - FormData fields:
    - `file`: File (image/video, validated by adapter)
  - Behavior: Uploads user face file. Uses a placeholder user `id=123`. File name: `${userId}-${faceIndex}-user-face.<ext>`
  - Responses:
    - 200: `{ message, url, fileName }`
    - 400: `No file provided` or `Maximum number of images exceeded`
    - 500: `File upload failed`
  - Notes: In production you should secure this endpoint and use actual authenticated user context.

- POST `/storage/upload-qr`
  - Public in current code path
  - FormData fields:
    - `file`: File (image)
    - `location_id`: string
  - Behavior: Uploads QR image; file name `${location_id}-0-qr-code.<ext>`
  - Responses: same shape as above

Storage backends:
- Development (default): local disk via multer adapter; file URL: `${BASE_URL}/upload/<file>`
- Production: AWS S3; requires `S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- Max upload size (multer config): 50MB; Allowed types: images (jpeg/jpg/png/gif/webp) and videos (mp4/mpeg/quicktime/avi)

### Biometrics
Base path: `/biometrics`

Public utilities:
- POST `/biometrics/compare-faces`
  - FormData: `sourceImage` File, `targetImage` File
  - Response: `{ message, data: { isMatch, similarity, confidence } }`

- POST `/biometrics/detect-faces`
  - FormData: `image` File
  - Response: `{ message, data: { faceCount, faces: [...] } }`

- GET `/biometrics/test-connection`
  - Response: `{ message, data: { connected: boolean } }`

Admin/system (auth required):
- POST `/biometrics/index-face`
  - Auth: `requireAuth`
  - FormData: `image` File, `externalImageId` string
  - Response: `{ message, data: { faceId, faceRecords, success } }`

- POST `/biometrics/search-faces`
  - Auth: `requireAuth`
  - FormData: `image` File
  - Response: `{ message, data: FaceMatches[] }`

Organization specific (auth required; org id supplied manually):
- POST `/biometrics/organization/index-face`
  - Auth: `requireAuth`
  - FormData: `image` File, `externalImageId` string, `organizationId` string

- POST `/biometrics/organization/search-faces`
  - Auth: `requireAuth`
  - FormData: `image` File, `organizationId` string

User-level (auth + active organization context):
- POST `/biometrics/register`
  - Auth: `requireAuth`, `requireOrganization`
  - FormData: `image` File
  - Behavior: Indexes the face into the user’s organization collection (ensuring collection exists) with `externalImageId = user.id`.

- POST `/biometrics/search`
  - Auth: `requireAuth`, `requireOrganization`
  - FormData: `image` File
  - Behavior: Searches within the user’s organization collection.

Rekognition configuration:
- `similarityThreshold`: 80
- `faceDetectionConfidence`: 90
- `maxFaces`: 10
- `qualityFilter`: AUTO
- Default `collectionId`: `REKOGNITION_COLLECTION_ID` or `skyhr-faces`
- Required env: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

### Organizations
Base path: `/organizations`

- POST `/organizations/webhook/created`
  - Public webhook
  - JSON: `{ organizationId }`
  - Behavior: Creates Rekognition collection for organization and persists `rekognition_collection_id`.

- POST `/organizations/webhook/deleted`
  - Public webhook
  - JSON: `{ organizationId }`
  - Behavior: Deletes Rekognition collection and clears it from DB.

- GET `/organizations/:organizationId`
  - Public in current code path (no auth middleware)
  - Response: `{ message, data: OrganizationWithCollection | null }`

- POST `/organizations/:organizationId/ensure-collection`
  - Public in current code path
  - Behavior: Ensures Rekognition collection exists (creates if missing) and persists id in DB.

Notes: In production, consider securing organization endpoints and authenticating webhook origin.

### QR
Base path: `/qr`

- POST `/qr/register-location`
  - Public in current code path
  - Form/URL-encoded or multipart body parsed via `parseBody`
  - Fields: `organization_id` string, `location_id` string
  - Behavior:
    - Validates that the `geofence` (location) exists, is active, and belongs to `organization_id`
    - Obfuscates payload `{ organization_id, location_id }` using secret
    - Generates PNG QR code, uploads via Storage service with key `${location_id}-0-location.png`
  - Response: `{ message, data: { url, fileName } }`

- POST `/qr/deobfuscate`
  - Public in current code path
  - Form/URL-encoded body: `obfuscated_data` string
  - Behavior: Deobfuscates payload -> `{ organization_id, location_id }`
  - Response: `{ message, data: { organization_id, location_id } }`

Secret handling:
- `QR_SECRET` base64-encoded preferred. Fallback: literal value. Default: `skyhr-secret-2024`.
- Obfuscation: hex encoding of JSON with secret suffix; not cryptographically secure.

### Attendance
Base path: `/attendance`

- POST `/attendance/qr/validate`
  - Auth: `requireAuth`, `requireOrganization`
  - JSON: `{ qr_data: string }`
  - Behavior: Deobfuscates payload and validates it matches active organization and an active geofence
  - Response 200: `{ message: "QR valid", data: { location_id, organization_id } }`

- POST `/attendance/check-in`
  - Auth: `requireAuth`, `requireOrganization`
  - FormData: `qr_data` string, `image` File, optional `latitude` string, `longitude` string
  - Behavior:
    - Validates QR belongs to user’s active organization and geofence is active
    - Biometric verification: searches in the organization collection and compares `ExternalImageId` against `user.id`
    - On success, creates `attendance_event` with metadata (geolocation, face confidence)
  - Response 200: `{ message: "Attendance recorded", data: { id, check_in, user_id, organization_id, face_confidence, is_verified } }`

## Data Model Highlights
- `users`: includes `user_face_url: text[]` for stored user face image keys
- `organization`: includes `rekognition_collection_id`
- `geofence`: org-scoped locations, can be circular or polygonal, `active: boolean`
- `attendance_event`: records check-in with verification source and scores

## Capabilities
- User authentication, sessions, organizations, teams via Better Auth
- Local and S3 file storage with validation and typed adapters
- AWS Rekognition integration: compare, detect, index, and search faces; per-organization collections
- QR workflow: generate organization/location QR codes, validate and deobfuscate
- Attendance check-in with QR validation and biometric verification

## Limitations and Security Considerations
- Several routes are public in current code (no auth middleware):
  - `/storage/*`, `/organizations/*` (including ensure, get), `/qr/*`, and all Better Auth webhooks
  - Recommendation: Add signature verification for webhooks; add `requireAuth`/`requireRole` where appropriate.
- QR obfuscation is not encryption; it is reversible hex + secret. Use a cryptographically secure scheme (e.g., AES-GCM, HMAC for integrity) if tamper-resistance is needed.
- `register-biometric` uses placeholder user; replace with authenticated context and enforce quotas.
- CORS origins must be configured via `TRUSTED_ORIGINS` for production. Cookies are `SameSite=None; Secure` so HTTPS is required.
- Rekognition requires AWS credentials and regional configuration; rate limits and costs apply. Validate request sizes and content types. Consider liveness/spoof detection.
- File uploads limited to 50MB in multer adapter; S3 path has no explicit limit but should be validated server-side.
- Error messages may leak implementation details in logs; avoid logging sensitive data (face images, secrets).
- Organization endpoints lack role checks; add `requireRole(["admin","owner"])` where needed.

## Environment Variables
- Server: `PORT` (default 8080), `TRUSTED_ORIGINS`, `NODE_ENV`
- Auth: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- Storage (local): `BASE_URL` for building file URLs
- Storage (S3): `S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- Rekognition: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `REKOGNITION_COLLECTION_ID`
- QR: `QR_SECRET` (prefer base64-encoded)

## Response Codes
- Success: 200, 201, 202, 203, 207, 208, 226
- Errors: 400, 401, 403, 404, 405, 409, 422, 500

## Local Development Notes
- Start server on `PORT` (default 8080)
- Local uploads served at `/upload/*` when `NODE_ENV` is development or unset
- Base URL for local file links defaults to `http://localhost:3000` (configurable via `BASE_URL`)

## Changelog
- v1.0.0: Initial documented routes and modules based on current codebase.
