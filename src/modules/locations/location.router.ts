import { Hono } from "hono";
import { registerLocation, deobfuscateData } from "./location.controller";

const locationRouter = new Hono();

// Routes
locationRouter.post("/register-location", registerLocation);
locationRouter.post("/deobfuscate", deobfuscateData);

export default locationRouter;