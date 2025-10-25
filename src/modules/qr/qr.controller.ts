import qrcode from "qrcode";
import type { Context } from "hono";
import { errorResponse, successResponse, ErrorCodes } from "../../core/http";
import { obfuscateJsonPayload, deobfuscateJsonPayload } from "../../utils/obfuscation";
import type { StorageService } from "../storage/storage.service";
import { db } from "../../db";
import { geofence } from "../../db/schema";
import { and, eq } from "drizzle-orm";

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

/**
 * Validates the register location request payload
 */
const validateRegisterLocationRequest = (data: any): data is RegisterLocationRequest => {
  return data && 
         typeof data.organization_id === 'string' && 
         typeof data.location_id === 'string' &&
         data.organization_id.trim() !== '' &&
         data.location_id.trim() !== '';
};

/**
 * Validates the deobfuscate request payload
 */
const validateDeobfuscateRequest = (data: any): data is DeobfuscateRequest => {
  return data && 
         typeof data.obfuscated_data === 'string' &&
         data.obfuscated_data.trim() !== '';
};

/**
 * Generates QR code buffer from obfuscated payload
 */
const generateQrCode = async (obfuscatedPayload: string): Promise<Buffer> => {
  return qrcode.toBuffer(obfuscatedPayload, {
    errorCorrectionLevel: "M",
    margin: 2,
    scale: 8
  });
};

/**
 * Creates a File object from buffer
 */
const createFileFromBuffer = (buffer: Buffer, fileName: string, mimeType: string): File => {
  return new File([buffer], fileName, { type: mimeType });
};

/**
 * Handles location registration by creating a QR code
 */
export const registerLocation = (storageService: StorageService, secret: string) =>
  async (c: Context): Promise<Response> => {
    try {
      const data = await c.req.parseBody();
      
      if (!validateRegisterLocationRequest(data)) {
        return errorResponse(c, "Organization ID and location ID are required", ErrorCodes.BAD_REQUEST);
      }

      // Validate geofence belongs to the organization and is active
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
      
      // Obfuscate the payload using the utility function
      const obfuscated = obfuscateJsonPayload(payload, secret);
      
      // Generate QR code
      const qrBuffer = await generateQrCode(obfuscated);
      const qrFile = createFileFromBuffer(qrBuffer, "qr.png", "image/png");

      // Upload QR code using storage service
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

/**
 * Handles deobfuscation of QR payload data
 */
export const deobfuscateData = (secret: string) => async (c: Context): Promise<Response> => {
  try {
    const data = await c.req.parseBody();
    
    if (!validateDeobfuscateRequest(data)) {
      return errorResponse(c, "Obfuscated data is required", ErrorCodes.BAD_REQUEST);
    }
    
    try {
      const payload = deobfuscateJsonPayload<Payload>(data.obfuscated_data, secret);
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
