import type { StorageService } from "../storage/storage.service";
import { registerLocation, deobfuscateData } from "./qr.controller";

/**
 * Creates QR service with dependency injection
 */
export const createQrService = (storageService: StorageService, secret: string) => ({
  registerLocation: registerLocation(storageService, secret),
  deobfuscateData: deobfuscateData(secret)
});
