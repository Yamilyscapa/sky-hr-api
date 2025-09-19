import { Hono } from "hono";
import { logger } from "hono/logger";
import router from "./router";
import { serveStatic } from "hono/serve-static";

// ENV
const PORT = process.env.PORT ?? 8080;

// APP
const app = new Hono();

// Middleware
app.use(logger());

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
