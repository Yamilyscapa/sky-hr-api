import { Hono } from "hono";
import { requireAuth, requireOrganization } from "../../middleware/auth-middleware";
import { createGeofence, getGeofence, isInGeofence } from "./geofence.controller";
import type { Context } from "hono";

export const geofenceRoutes = new Hono()

geofenceRoutes.post("/create", requireAuth, requireOrganization, createGeofence);
geofenceRoutes.post("/get", requireAuth, requireOrganization, getGeofence);
geofenceRoutes.post("/is-in", requireAuth, requireOrganization, isInGeofence);

export default geofenceRoutes;