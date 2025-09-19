import { Hono } from "hono";
import { logger } from "hono/logger";
import router from "./router";

// ENV
const PORT = process.env.PORT ?? 8080;

// APP
const app = new Hono();

// Middleware
app.use(logger());


// Router
app.route("/", router);

export default {
  port: PORT,
  fetch: app.fetch,
};
