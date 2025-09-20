import { Hono } from "hono";
import healthRouter from "./modules/health/health.routes";
import authRouter from "./modules/auth/auth.routes";
import storageRouter from "./modules/storage/storage.routes";
import biometricsRouter from "./modules/biometrics/biometrics.routes";
import organizationsRouter from "./modules/organizations/organizations.routes";

const router = new Hono();

router.route("/health", healthRouter);
router.route("/auth", authRouter);
router.route("/storage", storageRouter);
router.route("/biometrics", biometricsRouter);
router.route("/organizations", organizationsRouter);

export default router;
