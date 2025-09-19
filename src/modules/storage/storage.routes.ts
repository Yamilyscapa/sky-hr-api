import { Hono } from "hono";
import { uploadUserFace } from "./storage.controller";

const storageRouter = new Hono();

storageRouter.post("/user-biometric", uploadUserFace);

export default storageRouter;
