import { Hono } from "hono";
import { requireAuth, requireOrganization } from "../../middleware/auth-middleware";
import { checkIn, validateQr } from "./attendance.controller";

const attendanceRouter = new Hono();

attendanceRouter.post("/check-in", requireAuth, requireOrganization, checkIn);
attendanceRouter.post("/qr/validate", requireAuth, requireOrganization, validateQr);

export default attendanceRouter;


