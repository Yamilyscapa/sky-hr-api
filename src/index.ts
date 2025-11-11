import { Hono } from "hono";
import { logger } from "hono/logger";
import router from "./router";
import { serveStatic } from "hono/serve-static";
import { cors } from "hono/cors";
import { TRUSTED_ORIGINS } from "./utils/cors";

// ENV
const PORT = process.env.PORT ?? 8080;

// APP
const app = new Hono();

// Middleware
app.use(logger());
app.use(cors({
  origin: TRUSTED_ORIGINS,
  allowHeaders: ["Authorization", "Content-Type", "Cookie"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));
  
// Router
app.route("/", router);

// Serve static files in development
if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
  app.get("/upload/*", serveStatic({ 
    root: "./upload",
    rewriteRequestPath: (path) => path.replace(/^\/upload/, ""),
    getContent: async (path, c) => {
      return Bun.file(path).stream();
    }
  }));
}

export default {
  port: PORT,
  fetch: app.fetch,
};
