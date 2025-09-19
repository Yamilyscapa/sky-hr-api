import { Hono } from "hono";
import { auth } from "../../core/auth";

const authRouter = new Hono();

authRouter.all("/*", async (c) => {
  return auth.handler(c.req.raw);
});

export default authRouter;