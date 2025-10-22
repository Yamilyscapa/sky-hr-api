import { Hono } from "hono";
import qrcode from "qrcode";
import { createMulterAdapter } from "../storage/adapters/multer-adapter";
import { createStorageService } from "../storage/storage.service";
import { errorResponse, successResponse, ErrorCodes } from "../../core/http";
import { obfuscateJsonPayload, deobfuscateJsonPayload } from "../../utils/obfuscation";

const qrRouter = new Hono();

const storageAdapter = createMulterAdapter();
const storageService = createStorageService(storageAdapter);


interface Payload {
  organization_id: string;
  location_id: string;
}

qrRouter.post("/register-location", async (c) => {
  const { organization_id, location_id } = await c.req.parseBody<{ organization_id: string, location_id: string }>();
  const payload = {
    organization_id,
    location_id
  } as Payload;
  
  if (!organization_id || !location_id) {
    return errorResponse(c, "Organization ID and location ID are required", ErrorCodes.BAD_REQUEST);
  }
  
  // Obfuscate the payload using the utility function
  const obfuscated = obfuscateJsonPayload(payload);
  
  const qr = await qrcode.toBuffer(obfuscated, {
    errorCorrectionLevel: "M",
    margin: 2,
    scale: 8
  });

  const result = await storageService.uploadQr(new File([qr], "qr.png", { type: "image/png" }), "location", location_id);

  return successResponse(c, {
    message: "QR uploaded successfully",
    data: {
      url: result.url,
      fileName: result.fileName
    }
  });
});

// Test route for deobfuscation
qrRouter.post("/deobfuscate", async (c) => {
  const { obfuscated_data } = await c.req.parseBody<{ obfuscated_data: string }>();

  const secret = process.env.QR_SECRET || "skyhr-secret-2024";
  
  if (!obfuscated_data || !secret) {
    return errorResponse(c, "Obfuscated data is required", ErrorCodes.BAD_REQUEST);
  }
  
  try {
    const payload = deobfuscateJsonPayload<Payload>(obfuscated_data, secret);
    return successResponse(c, {
      message: "Data deobfuscated successfully",
      data: payload
    });
  } catch (error) {
    return errorResponse(c, `Failed to deobfuscate data: ${error instanceof Error ? error.message : 'Unknown error'}`, ErrorCodes.BAD_REQUEST);
  }
});

export default qrRouter;