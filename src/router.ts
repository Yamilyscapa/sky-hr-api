import { Hono } from "hono";
import healthRouter from "./modules/health/health-route";
import authRouter from "./modules/auth/routes";

const router = new Hono();

router.route("/health", healthRouter);
router.route("/auth", authRouter);

export default router;
