import { Hono } from "hono";
import { registerBiometric } from "./storage.controller";
import { uploadQr } from "./storage.controller";

const storageRouter = new Hono();

storageRouter.post("/register-biometric", registerBiometric);

storageRouter.post("/upload-qr", uploadQr);

export default storageRouter;
