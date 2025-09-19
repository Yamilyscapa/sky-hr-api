import { Hono } from "hono";

const storageRouter = new Hono();

storageRouter.post("/", async (c) => {
  const { file } = await c.req.parseBody();

  if (!file) {
    return c.json({ error: "No file provided" }, 400);
  }

  // TODO: Implement file upload to S3
  return c.json({ message: "File received successfully" });
});

export default storageRouter;
