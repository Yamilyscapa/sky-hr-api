import { Hono } from "hono";
import { createMulterAdapter } from "../storage/adapters/multer-adapter";
import { createStorageService } from "../storage/storage.service";
import { createQrService } from "./qr.service";

const qrRouter = new Hono();

// QR Secret - centralized configuration
const QR_SECRET = process.env.QR_SECRET 
  ? Buffer.from(process.env.QR_SECRET, 'base64').toString('utf8')
  : "skyhr-secret-2024";

// Initialize dependencies
const storageAdapter = createMulterAdapter();
const storageService = createStorageService(storageAdapter);
const qrService = createQrService(storageService, QR_SECRET);

// Routes
qrRouter.post("/register-location", qrService.registerLocation);
qrRouter.post("/deobfuscate", qrService.deobfuscateData);

export default qrRouter;