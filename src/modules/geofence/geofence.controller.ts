import type { Context } from "hono";
import { ErrorCodes, errorResponse, successResponse } from "../../core/http";
import { geofence, organization } from "../../db/schema";
import { db } from "../../db";
import { and, eq } from "drizzle-orm";
interface GeofenceBody {
    name: string;
    type: "circular" | "polygon";
    center_latitude: string;
    center_longitude: string;
    radius: number;
    organization_id: string;
}

function validateGeofenceBody(body: any): GeofenceBody {
    if (!body || !body.name || !body.center_latitude || !body.center_longitude || !body.radius || !body.organization_id) {
        throw new Error("Invalid body: name, center_latitude, center_longitude, radius and organization_id are required");
    }

    const gf: GeofenceBody = {
        name: body.name,
        type: "circular", // ! Only circular geofences are supported for now
        center_latitude: body.center_latitude,
        center_longitude: body.center_longitude,
        radius: body.radius,
        organization_id: body.organization_id,
    }

    return gf;
}

export async function createGeofence(c: Context): Promise<Response> {
    const body = await c.req.json();

    try {
        console.log('body', body);
        const gf = validateGeofenceBody(body);
        if (!gf) return errorResponse(c, "Invalid body: name, center_latitude, center_longitude, radius and organization_id are required", ErrorCodes.BAD_REQUEST);

        const newGeofence = await db.insert(geofence).values(gf).returning();

        if (!newGeofence || newGeofence.length === 0) return errorResponse(c, "Failed to create geofence", ErrorCodes.INTERNAL_SERVER_ERROR);

        return successResponse(c, {
            message: "Geofence created successfully",
            data: newGeofence[0],
        });
    } catch (error) {
        return errorResponse(c, "Failed to create geofence", ErrorCodes.INTERNAL_SERVER_ERROR);
    }
}

export async function getGeofence(c: Context): Promise<Response> {
    const { id } = await c.req.json();

    if (!id) return errorResponse(c, "Geofence ID is required", ErrorCodes.BAD_REQUEST);

    try {
        const gf = await db.select().from(geofence).where(eq(geofence.id, id as string));
        if (!gf || gf.length === 0) return errorResponse(c, "Geofence not found", ErrorCodes.NOT_FOUND);

        return successResponse(c, {
            message: "Geofence found",
            data: gf[0],
        });
    } catch (error) {
        return errorResponse(c, "Failed to get geofence", ErrorCodes.INTERNAL_SERVER_ERROR);
    }
}

/**
 * Calculates the great-circle distance between two points on Earth using the Haversine formula
 * @param lat1 - Latitude of point 1 in degrees
 * @param lon1 - Longitude of point 1 in degrees
 * @param lat2 - Latitude of point 2 in degrees
 * @param lon2 - Longitude of point 2 in degrees
 * @returns Distance in meters
 */
function calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const EARTH_RADIUS_METERS = 6371000; // Earth's mean radius in meters

    // Convert degrees to radians
    const toRadians = (degrees: number): number => degrees * (Math.PI / 180);

    const lat1Radians = toRadians(lat1);
    const lat2Radians = toRadians(lat2);
    const latDifferenceRadians = toRadians(lat2 - lat1);
    const lonDifferenceRadians = toRadians(lon2 - lon1);

    // Haversine formula
    const a = Math.sin(latDifferenceRadians / 2) * Math.sin(latDifferenceRadians / 2) +
        Math.cos(lat1Radians) * Math.cos(lat2Radians) *
        Math.sin(lonDifferenceRadians / 2) * Math.sin(lonDifferenceRadians / 2);

    const angularDistance = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_METERS * angularDistance;
}

export async function isInGeofence(c: Context): Promise<Response> {
    try {
        const { latitude, longitude, geofence_id } = await c.req.json();

        if (!latitude || !longitude || !geofence_id) return errorResponse(c, "Latitude, longitude and geofence_id are required", ErrorCodes.BAD_REQUEST);

        const gf = await db.select().from(geofence).where(eq(geofence.id, geofence_id as string));
        if (!gf || gf.length === 0) return errorResponse(c, "Geofence not found", ErrorCodes.NOT_FOUND);

        const gfBody: GeofenceBody = gf[0] as GeofenceBody & { center_latitude: string, center_longitude: string };

        const centerLat = parseFloat(gfBody.center_latitude);
        const centerLon = parseFloat(gfBody.center_longitude);

        if (!gfBody.center_latitude || !gfBody.center_longitude) {
            return errorResponse(c, "Invalid geofence center coordinates", ErrorCodes.BAD_REQUEST);
        }

        if (isNaN(centerLat) || isNaN(centerLon)) {
            return errorResponse(c, "Invalid geofence center coordinates", ErrorCodes.BAD_REQUEST);
        }

        if (isNaN(Number(latitude)) || isNaN(Number(longitude))) {
            return errorResponse(c, "Invalid user coordinates", ErrorCodes.BAD_REQUEST);
        }

        const distance = calculateHaversineDistance(
            Number(latitude),
            Number(longitude),
            centerLat,
            centerLon
        );

        return successResponse(c, {
            message: "User is in geofence",
            data: { isInGeofence: distance <= gfBody.radius },
        });
    } catch (error) {
        return errorResponse(c, "Failed to check if user is in geofence", ErrorCodes.INTERNAL_SERVER_ERROR);
    }
}