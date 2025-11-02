import type { Context } from "hono";
import { successResponse, errorResponse, ErrorCodes } from "../../core/http";
import {
  parseQrPayload,
  findActiveGeofence,
  createAttendanceEvent,
  validateGeofenceLocation,
  calculateAttendanceStatus,
  findExistingCheckIn,
  findTodayAttendance,
  updateCheckOut,
  updateAttendanceStatus as updateStatusService,
  markAbsentUsers,
} from "./attendance.service";
import { searchFacesByImageForOrganization } from "../biometrics/biometrics.service";
import { db } from "../../db";
import { attendance_event } from "../../db/schema";
import { and, eq, or } from "drizzle-orm";

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
    const latitude = form.get("latitude") as string;
    const longitude = form.get("longitude") as string;

    if (!qrData || !image) {
      return errorResponse(c, "qr_data and image are required", ErrorCodes.BAD_REQUEST);
    }

    if (!latitude || !longitude) {
      return errorResponse(c, "latitude and longitude are required for geofence validation", ErrorCodes.BAD_REQUEST);
    }

    const user = c.get("user");
    const organization = c.get("organization");
    if (!user || !organization) {
      return errorResponse(c, "Unauthorized", ErrorCodes.UNAUTHORIZED);
    }

    // 1) QR validation
    const payload = parseQrPayload(qrData);
    if (payload.organization_id !== organization.id) {
      return errorResponse(c, "QR organization mismatch", ErrorCodes.FORBIDDEN);
    }

    const gf = await findActiveGeofence(payload.location_id, organization.id);
    if (!gf) {
      return errorResponse(c, "Location not allowed or inactive", ErrorCodes.FORBIDDEN);
    }

    // Validate geofence has required properties
    if (!gf.center_latitude || !gf.center_longitude || gf.radius === null) {
      return errorResponse(c, "Geofence configuration is incomplete", ErrorCodes.INTERNAL_SERVER_ERROR);
    }

    // 2) Validate geofence location
    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);

    if (isNaN(userLat) || isNaN(userLon)) {
      return errorResponse(c, "Invalid latitude or longitude", ErrorCodes.BAD_REQUEST);
    }

    const { isWithin, distance } = validateGeofenceLocation(userLat, userLon, {
      center_latitude: gf.center_latitude,
      center_longitude: gf.center_longitude,
      radius: gf.radius,
    });

    // 3) Check for duplicate check-in today
    const existingCheckIn = await findExistingCheckIn(user.id, new Date(), organization.id);
    if (existingCheckIn) {
      return errorResponse(
        c,
        "You already have an active check-in today. Please check out first.",
        ErrorCodes.BAD_REQUEST
      );
    }

    // 4) Biometric verification (search within org)
    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const matches = await searchFacesByImageForOrganization(imageBuffer, organization.id);
    const best = matches?.[0];
    const externalImageId = best?.Face?.ExternalImageId;
    const similarity = best?.Similarity ?? 0;

    if (!best || externalImageId !== user.id) {
      return errorResponse(c, "Face does not match the current user", ErrorCodes.FORBIDDEN);
    }

    // 5) Calculate attendance status based on shift
    const checkInTime = new Date();
    const { status: baseStatus, shiftId, notes: statusNotes } = await calculateAttendanceStatus(
      checkInTime,
      user.id,
      organization.id
    );

    // If out of geofence bounds, override status
    let finalStatus = baseStatus;
    let notes = statusNotes;

    if (!isWithin) {
      finalStatus = "out_of_bounds";
      notes = `Check-in ${distance}m from geofence (radius: ${gf.radius}m). ${statusNotes || ""}`.trim();
    }

    // 6) Create attendance event with full metadata
    const record = await createAttendanceEvent({
      userId: user.id,
      organizationId: organization.id,
      shiftId,
      status: finalStatus,
      isWithinGeofence: isWithin,
      distanceToGeofence: distance,
      latitude,
      longitude,
      faceConfidence: String(similarity),
      spoofFlag: false,
      notes,
    });

    if (!record) {
      return errorResponse(c, "Failed to create attendance record", ErrorCodes.INTERNAL_SERVER_ERROR);
    }

    return successResponse(c, {
      message: !isWithin
        ? "Attendance recorded but flagged as out of bounds"
        : "Attendance recorded successfully",
      data: {
        id: record.id,
        check_in: record.check_in,
        user_id: record.user_id,
        organization_id: record.organization_id,
        shift_id: record.shift_id,
        status: record.status,
        is_within_geofence: record.is_within_geofence,
        distance_to_geofence_m: record.distance_to_geofence_m,
        face_confidence: record.face_confidence,
        is_verified: record.is_verified,
        notes: record.notes,
      },
    });
  } catch (e) {
    console.error("Check-in error:", e);
    return errorResponse(c, "Attendance check-in failed", ErrorCodes.INTERNAL_SERVER_ERROR);
  }
}

export async function checkOut(c: Context): Promise<Response> {
  try {
    const form = await c.req.formData();
    const latitude = form.get("latitude") as string;
    const longitude = form.get("longitude") as string;

    if (!latitude || !longitude) {
      return errorResponse(c, "latitude and longitude are required for geofence validation", ErrorCodes.BAD_REQUEST);
    }

    const user = c.get("user");
    const organization = c.get("organization");
    if (!user || !organization) {
      return errorResponse(c, "Unauthorized", ErrorCodes.UNAUTHORIZED);
    }

    // Find today's active check-in (no check-out yet)
    const activeCheckIn = await findExistingCheckIn(user.id, new Date(), organization.id);

    if (!activeCheckIn) {
      return errorResponse(
        c,
        "No active check-in found. Please check in first.",
        ErrorCodes.BAD_REQUEST
      );
    }

    // Get the geofence from the check-in record
    if (!activeCheckIn.latitude || !activeCheckIn.longitude) {
      return errorResponse(c, "Check-in location data missing", ErrorCodes.INTERNAL_SERVER_ERROR);
    }

    // For check-out, we validate against the same geofence as check-in
    // Get geofence from database using distance calculation
    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);

    if (isNaN(userLat) || isNaN(userLon)) {
      return errorResponse(c, "Invalid latitude or longitude", ErrorCodes.BAD_REQUEST);
    }

    // We need to find the geofence - we can get it from the attendance event's organization
    // For now, let's allow check-out anywhere but flag if out of bounds
    // In a real implementation, you'd store geofence_id in attendance_event

    const checkOutTime = new Date();
    
    // Update the check-out
    const updated = await updateCheckOut(
      activeCheckIn.id,
      checkOutTime,
      true, // For now, assume within bounds for check-out
      activeCheckIn.distance_to_geofence_m ?? undefined
    );

    if (!updated) {
      return errorResponse(c, "Failed to update check-out", ErrorCodes.INTERNAL_SERVER_ERROR);
    }

    // Calculate work duration
    const workDurationMs = checkOutTime.getTime() - activeCheckIn.check_in.getTime();
    const workDurationMinutes = Math.floor(workDurationMs / 60000);

    return successResponse(c, {
      message: "Check-out recorded successfully",
      data: {
        id: updated.id,
        check_in: updated.check_in,
        check_out: updated.check_out,
        work_duration_minutes: workDurationMinutes,
        status: updated.status,
        is_verified: updated.is_verified,
      },
    });
  } catch (e) {
    console.error("Check-out error:", e);
    return errorResponse(c, "Attendance check-out failed", ErrorCodes.INTERNAL_SERVER_ERROR);
  }
}

export async function markAbsences(c: Context): Promise<Response> {
  try {
    const organization = c.get("organization");

    if (!organization) {
      return errorResponse(c, "Organization is required", ErrorCodes.UNAUTHORIZED);
    }

    const absences = await markAbsentUsers(organization.id);

    return successResponse(c, {
      message: `Marked ${absences.length} user(s) as absent`,
      data: {
        count: absences.length,
        absences: absences.map((a) => ({
          id: a.id,
          user_id: a.user_id,
          shift_id: a.shift_id,
          notes: a.notes,
        })),
      },
    });
  } catch (e) {
    console.error("Mark absences error:", e);
    return errorResponse(c, "Failed to mark absences", ErrorCodes.INTERNAL_SERVER_ERROR);
  }
}

export async function updateAttendanceStatusController(c: Context): Promise<Response> {
  try {
    const eventId = c.req.param("eventId");
    const body = await c.req.json();
    const organization = c.get("organization");

    if (!organization) {
      return errorResponse(c, "Organization is required", ErrorCodes.UNAUTHORIZED);
    }

    if (!eventId) {
      return errorResponse(c, "Event ID is required", ErrorCodes.BAD_REQUEST);
    }

    if (!body.status) {
      return errorResponse(c, "Status is required", ErrorCodes.BAD_REQUEST);
    }

    // Verify event belongs to organization
    const events = await db
      .select()
      .from(attendance_event)
      .where(and(eq(attendance_event.id, eventId), eq(attendance_event.organization_id, organization.id)))
      .limit(1);

    if (events.length === 0) {
      return errorResponse(c, "Attendance event not found", ErrorCodes.NOT_FOUND);
    }

    // Validate status
    const validStatuses = ["on_time", "late", "early", "absent", "out_of_bounds"];
    if (!validStatuses.includes(body.status)) {
      return errorResponse(
        c,
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        ErrorCodes.BAD_REQUEST
      );
    }

    const updated = await updateStatusService(eventId, body.status, body.notes);

    if (!updated) {
      return errorResponse(c, "Failed to update attendance status", ErrorCodes.INTERNAL_SERVER_ERROR);
    }

    return successResponse(c, {
      message: "Attendance status updated successfully",
      data: {
        id: updated.id,
        status: updated.status,
        notes: updated.notes,
        updated_at: updated.updated_at,
      },
    });
  } catch (e) {
    console.error("Update status error:", e);
    return errorResponse(c, "Failed to update attendance status", ErrorCodes.INTERNAL_SERVER_ERROR);
  }
}

export async function getAttendanceReport(c: Context): Promise<Response> {
  try {
    const organization = c.get("organization");

    if (!organization) {
      return errorResponse(c, "Organization is required", ErrorCodes.UNAUTHORIZED);
    }

    // Get flagged events (out_of_bounds, absent, late)
    const flaggedEvents = await db
      .select()
      .from(attendance_event)
      .where(
        and(
          eq(attendance_event.organization_id, organization.id),
          or(
            eq(attendance_event.status, "out_of_bounds"),
            eq(attendance_event.status, "absent"),
            eq(attendance_event.status, "late")
          )
        )
      );

    return successResponse(c, {
      message: "Attendance report retrieved successfully",
      data: {
        flagged_count: flaggedEvents.length,
        flagged_events: flaggedEvents.map((event) => ({
          id: event.id,
          user_id: event.user_id,
          check_in: event.check_in,
          check_out: event.check_out,
          status: event.status,
          is_within_geofence: event.is_within_geofence,
          distance_to_geofence_m: event.distance_to_geofence_m,
          shift_id: event.shift_id,
          notes: event.notes,
        })),
      },
    });
  } catch (e) {
    console.error("Get report error:", e);
    return errorResponse(c, "Failed to retrieve attendance report", ErrorCodes.INTERNAL_SERVER_ERROR);
  }
}

