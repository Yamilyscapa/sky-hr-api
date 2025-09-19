import { Hono } from "hono";
import healthRouter from "./modules/health/health.routes";
import authRouter from "./modules/auth/auth.routes";
import storageRouter from "./modules/storage/storage.routes";

const router = new Hono();

router.route("/health", healthRouter);
router.route("/auth", authRouter);
router.route("/storage", storageRouter);

export default router;
