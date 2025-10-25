import type { Context } from "hono";
import { successResponse, errorResponse, ErrorCodes } from "../../core/http";
import { deobfuscateJsonPayload } from "../../utils/obfuscation";
import { db } from "../../db";
import { attendance_event, geofence } from "../../db/schema";
import { and, eq } from "drizzle-orm";
import { searchFacesByImageForOrganization } from "../biometrics/biometrics.service";

type QrPayload = { organization_id: string; location_id: string };

const getQrSecret = (): string => {
  const raw = process.env.QR_SECRET;
  if (!raw) return "skyhr-secret-2024";
  try {
    return Buffer.from(raw, "base64").toString("utf8");
  } catch {
    return raw;
  }
};

const parseQrPayload = (qrData: string): QrPayload => {
  const secret = getQrSecret();
  return deobfuscateJsonPayload<QrPayload>(qrData, secret);
};

const findActiveGeofence = async (locationId: string, orgId: string) => {
  const rows = await db
    .select()
    .from(geofence)
    .where(and(eq(geofence.id, locationId), eq(geofence.organization_id, orgId), eq(geofence.active, true)))
    .limit(1);
  return rows[0] ?? null;
};

const createAttendanceEvent = async (args: {
  userId: string;
  organizationId: string;
  latitude?: string | null;
  longitude?: string | null;
  faceConfidence?: string | null;
  spoofFlag?: boolean;
}) => {
  const { userId, organizationId, latitude, longitude, faceConfidence, spoofFlag } = args;
  const inserted = await db
    .insert(attendance_event)
    .values({
      user_id: userId,
      organization_id: organizationId,
      check_in: new Date(),
      is_verified: true,
      source: "qr_face",
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      face_confidence: faceConfidence ?? null,
      liveness_score: null,
      spoof_flag: spoofFlag ?? false,
    })
    .returning();
  return inserted[0];
};

export const validateQr = async (c: Context): Promise<Response> => {
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
};

export const checkIn = async (c: Context): Promise<Response> => {
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
};


