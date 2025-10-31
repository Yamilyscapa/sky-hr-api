import qrcode from "qrcode";
import type { Context } from "hono";
import { errorResponse, successResponse, ErrorCodes } from "../../core/http";
import { obfuscateJsonPayload, deobfuscateJsonPayload } from "../../utils/obfuscation";
import { createMulterAdapter } from "../storage/adapters/multer-adapter";
import { createStorageService } from "../storage/storage.service";
import { db } from "../../db";
import { geofence } from "../../db/schema";
import { and, eq } from "drizzle-orm";
import { createS3Adapter } from "../storage/adapters/s3-adapter";

export interface Payload {
  organization_id: string;
  location_id: string;
}

export interface RegisterLocationRequest {
  organization_id: string;
  location_id: string;
}

export interface DeobfuscateRequest {
  obfuscated_data: string;
}

const QR_SECRET = process.env.QR_SECRET
  ? Buffer.from(process.env.QR_SECRET, 'base64').toString('utf8')
  : "skyhr-secret-2024";

const storageAdapter = process.env.NODE_ENV === "development" || !process.env.NODE_ENV ? createMulterAdapter() : createS3Adapter();
const storageService = createStorageService(storageAdapter);

const validateRegisterLocationRequest = (data: any): data is RegisterLocationRequest => {
  if (!data || !data.organization_id || !data.location_id) {
    return false;
  }

  return true;
};

const validateDeobfuscateRequest = (data: any): data is DeobfuscateRequest => {
  if (!data || !data.obfuscated_data) {
    return false;
  }

  return true;
};

const generateQrCode = async (obfuscatedPayload: string): Promise<Buffer> => {
  return qrcode.toBuffer(obfuscatedPayload, {
    errorCorrectionLevel: "M",
    margin: 2,
    scale: 8
  });
};

const createFileFromBuffer = (buffer: Buffer, fileName: string, mimeType: string): File => {
  return new File([buffer], fileName, { type: mimeType });
};

export const registerLocation = async (c: Context): Promise<Response> => {
  try {
    const data = await c.req.parseBody();

    if (!validateRegisterLocationRequest(data)) {
      return errorResponse(c, "Organization ID and location ID are required", ErrorCodes.BAD_REQUEST);
    }

    const gf = await db
      .select()
      .from(geofence)
      .where(and(eq(geofence.id, data.location_id), eq(geofence.organization_id, data.organization_id), eq(geofence.active, true)))
      .limit(1);

    if (!gf || gf.length === 0) {
      return errorResponse(c, "Invalid location for organization or inactive geofence", ErrorCodes.FORBIDDEN);
    }

    const payload: Payload = {
      organization_id: data.organization_id,
      location_id: data.location_id
    };

    const obfuscated = obfuscateJsonPayload(payload, QR_SECRET);

    const qrBuffer = await generateQrCode(obfuscated);
    const qrFile = createFileFromBuffer(qrBuffer, "qr.png", "image/png");

    const result = await storageService.uploadQr(qrFile, "location", data.location_id);

    return successResponse(c, {
      message: "QR uploaded successfully",
      data: {
        url: result.url,
        fileName: result.fileName
      }
    });
  } catch (error) {
    return errorResponse(
      c,
      `Failed to register location: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ErrorCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const deobfuscateData = async (c: Context): Promise<Response> => {
  try {
    const data = await c.req.parseBody();

    if (!validateDeobfuscateRequest(data)) {
      return errorResponse(c, "Obfuscated data is required", ErrorCodes.BAD_REQUEST);
    }

    try {
      const payload = deobfuscateJsonPayload<Payload>(data.obfuscated_data, QR_SECRET);
      return successResponse(c, {
        message: "Data deobfuscated successfully",
        data: payload
      });
    } catch (deobfuscateError) {
      return errorResponse(
        c,
        `Failed to deobfuscate data: ${deobfuscateError instanceof Error ? deobfuscateError.message : 'Unknown error'}`,
        ErrorCodes.BAD_REQUEST
      );
    }
  } catch (error) {
    return errorResponse(
      c,
      `Failed to process deobfuscate request: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ErrorCodes.INTERNAL_SERVER_ERROR
    );
  }
};
