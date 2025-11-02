import { Hono } from "hono";
import { requireAuth, requireOrganization } from "../../middleware/auth-middleware";
import {
  checkIn,
  validateQr,
  checkOut,
  markAbsences,
  updateAttendanceStatusController,
  getAttendanceReport,
} from "./attendance.controller";

const attendanceRouter = new Hono();

// QR validation
attendanceRouter.post("/qr/validate", requireAuth, requireOrganization, validateQr);

// Check-in and check-out
attendanceRouter.post("/check-in", requireAuth, requireOrganization, checkIn);
attendanceRouter.post("/check-out", requireAuth, requireOrganization, checkOut);

// Admin endpoints (ideally would use requireRole(['admin', 'owner']) but not fully implemented)
attendanceRouter.post("/admin/mark-absences", requireAuth, requireOrganization, markAbsences);
attendanceRouter.put("/admin/update-status/:eventId", requireAuth, requireOrganization, updateAttendanceStatusController);

// Reports
attendanceRouter.get("/report", requireAuth, requireOrganization, getAttendanceReport);

export default attendanceRouter;


