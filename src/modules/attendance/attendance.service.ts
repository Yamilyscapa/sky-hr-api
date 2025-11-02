import { db } from "../../db";
import { attendance_event, geofence } from "../../db/schema";
import { and, eq } from "drizzle-orm";
import { deobfuscateJsonPayload } from "../../utils/obfuscation";

export type QrPayload = { organization_id: string; location_id: string };

export type CreateAttendanceEventArgs = {
  userId: string;
  organizationId: string;
  latitude?: string | null;
  longitude?: string | null;
  faceConfidence?: string | null;
  spoofFlag?: boolean;
};

export function getQrSecret(): string {
  const raw = process.env.QR_SECRET;
  if (!raw) return "skyhr-secret-2024";
  try {
    return Buffer.from(raw, "base64").toString("utf8");
  } catch {
    return raw;
  }
}

export function parseQrPayload(qrData: string): QrPayload {
  const secret = getQrSecret();
  return deobfuscateJsonPayload<QrPayload>(qrData, secret);
}

export async function findActiveGeofence(locationId: string, orgId: string) {
  const rows = await db
    .select()
    .from(geofence)
    .where(and(eq(geofence.id, locationId), eq(geofence.organization_id, orgId), eq(geofence.active, true)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createAttendanceEvent(args: CreateAttendanceEventArgs) {
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
}
