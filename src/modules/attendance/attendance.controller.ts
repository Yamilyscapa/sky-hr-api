import type { Context } from "hono";
import { successResponse, errorResponse, ErrorCodes } from "../../core/http";
import {
  parseQrPayload,
  findActiveGeofence,
  createAttendanceEvent,
} from "./attendance.service";
import { searchFacesByImageForOrganization } from "../biometrics/biometrics.service";

export async function validateQr(c: Context): Promise<Response> {
  try {
    const body = await c.req.json();
    const qrData = body?.qr_data as string;
    if (!qrData) return errorResponse(c, "qr_data is required", ErrorCodes.BAD_REQUEST);

    const organization = c.get("organization");
    if (!organization) return errorResponse(c, "Organization is required", ErrorCodes.UNAUTHORIZED);

    const payload = parseQrPayload(qrData);
    if (payload.organization_id !== organization.id) {
      return errorResponse(c, "QR does not belong to active organization", ErrorCodes.FORBIDDEN);
    }

    const gf = await findActiveGeofence(payload.location_id, organization.id);
    if (!gf) return errorResponse(c, "Location not allowed or inactive", ErrorCodes.FORBIDDEN);

    return successResponse(c, {
      message: "QR valid",
      data: { location_id: gf.id, organization_id: organization.id },
    });
  } catch (e) {
    return errorResponse(c, "Invalid or malformed QR", ErrorCodes.BAD_REQUEST);
  }
}

export async function checkIn(c: Context): Promise<Response> {
  try {
    const form = await c.req.formData();
    const qrData = form.get("qr_data") as string;
    const image = form.get("image") as File;
    const latitude = (form.get("latitude") as string) ?? null;
    const longitude = (form.get("longitude") as string) ?? null;

    if (!qrData || !image) return errorResponse(c, "qr_data and image are required", ErrorCodes.BAD_REQUEST);

    const user = c.get("user");
    const organization = c.get("organization");
    if (!user || !organization) return errorResponse(c, "Unauthorized", ErrorCodes.UNAUTHORIZED);

    // 1) QR validation
    const payload = parseQrPayload(qrData);
    if (payload.organization_id !== organization.id) {
      return errorResponse(c, "QR organization mismatch", ErrorCodes.FORBIDDEN);
    }
    const gf = await findActiveGeofence(payload.location_id, organization.id);
    if (!gf) return errorResponse(c, "Location not allowed or inactive", ErrorCodes.FORBIDDEN);

    // 2) Biometric verification (search within org)
    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const matches = await searchFacesByImageForOrganization(imageBuffer, organization.id);
    const best = matches?.[0];
    const externalImageId = best?.Face?.ExternalImageId;
    const similarity = best?.Similarity ?? 0;

    if (!best || externalImageId !== user.id) {
      return errorResponse(c, "Face does not match the current user", ErrorCodes.FORBIDDEN);
    }

    // 3) Create attendance event
    const record = await createAttendanceEvent({
      userId: user.id,
      organizationId: organization.id,
      latitude,
      longitude,
      faceConfidence: String(similarity),
      spoofFlag: false,
    });

    if (!record) {
      return errorResponse(c, "Failed to create attendance record", ErrorCodes.INTERNAL_SERVER_ERROR);
    }

    return successResponse(c, {
      message: "Attendance recorded",
      data: {
        id: record.id,
        check_in: record.check_in,
        user_id: record.user_id,
        organization_id: record.organization_id,
        face_confidence: record.face_confidence,
        is_verified: record.is_verified,
      },
    });
  } catch (e) {
    return errorResponse(c, "Attendance check-in failed", ErrorCodes.INTERNAL_SERVER_ERROR);
  }
}

