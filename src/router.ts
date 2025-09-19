import { Hono } from "hono";
import healthRouter from "./modules/health/health-route";
import authRouter from "./modules/auth/routes";
import storageRouter from "./modules/storage/routes";

const router = new Hono();

router.route("/health", healthRouter);
router.route("/auth", authRouter);
router.route("/storage", storageRouter);

export default router;
