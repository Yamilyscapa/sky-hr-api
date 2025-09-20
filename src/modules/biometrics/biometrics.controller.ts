import type { Context } from "hono";
import { successResponse, errorResponse } from "../../core/http";
import { 
  compareFaces as compareFacesService,
  detectFaces as detectFacesService,
  indexFace as indexFaceService,
  indexFaceForOrganization as indexFaceForOrganizationService,
  searchFacesByImage as searchFacesByImageService,
  searchFacesByImageForOrganization as searchFacesByImageForOrganizationService,
  testConnection as testConnectionService
} from "./biometrics.service";

export async function compareFaces(c: Context) {
  try {
    const formData = await c.req.formData();
    const sourceImage = formData.get('sourceImage') as File;
    const targetImage = formData.get('targetImage') as File;

    if (!sourceImage || !targetImage) {
      return errorResponse(c, "Both source and target images are required", 400);
    }

    const sourceBuffer = Buffer.from(await sourceImage.arrayBuffer());
    const targetBuffer = Buffer.from(await targetImage.arrayBuffer());

    const result = await compareFacesService(sourceBuffer, targetBuffer);

    return successResponse(c, {
      message: "Face comparison completed",
      data: result,
    });
  } catch (error) {
    console.error("Face comparison error:", error);
    return errorResponse(c, "Face comparison failed", 500);
  }
}

export async function detectFaces(c: Context) {
  try {
    const formData = await c.req.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return errorResponse(c, "Image is required", 400);
    }

    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const result = await detectFacesService(imageBuffer);

    return successResponse(c, {
      message: "Face detection completed",
      data: result,
    });
  } catch (error) {
    console.error("Face detection error:", error);
    return errorResponse(c, "Face detection failed", 500);
  }
}

export async function indexFace(c: Context) {
  try {
    const formData = await c.req.formData();
    const image = formData.get('image') as File;
    const externalImageId = formData.get('externalImageId') as string;
    
    if (!image || !externalImageId) {
      return errorResponse(c, "Image and external image ID are required", 400);
    }

    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const result = await indexFaceService(imageBuffer, externalImageId);

    return successResponse(c, {
      message: "Face indexing completed",
      data: result,
    });
  } catch (error) {
    console.error("Face indexing error:", error);
    return errorResponse(c, "Face indexing failed", 500);
  }
}

export async function searchFaces(c: Context) {
  try {
    const formData = await c.req.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return errorResponse(c, "Image is required", 400);
    }

    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const result = await searchFacesByImageService(imageBuffer);

    return successResponse(c, {
      message: "Face search completed",
      data: result,
    });
  } catch (error) {
    console.error("Face search error:", error);
    return errorResponse(c, "Face search failed", 500);
  }
}

export async function testConnection(c: Context) {
  try {
    const isConnected = await testConnectionService();
    
    return successResponse(c, {
      message: "Rekognition connection test completed",
      data: { connected: isConnected },
    });
  } catch (error) {
    console.error("Connection test error:", error);
    return errorResponse(c, "Connection test failed", 500);
  }
}

export async function indexFaceForOrganization(c: Context) {
  try {
    const formData = await c.req.formData();
    const image = formData.get('image') as File;
    const externalImageId = formData.get('externalImageId') as string;
    const organizationId = formData.get('organizationId') as string;

    if (!image || !externalImageId || !organizationId) {
      return errorResponse(c, "Image, external image ID, and organization ID are required", 400);
    }

    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const result = await indexFaceForOrganizationService(imageBuffer, externalImageId, organizationId);

    return successResponse(c, {
      message: "Face indexing for organization completed",
      data: result,
    });
  } catch (error) {
    console.error("Organization face indexing error:", error);
    return errorResponse(c, "Organization face indexing failed", 500);
  }
}

export async function searchFacesForOrganization(c: Context) {
  try {
    const formData = await c.req.formData();
    const image = formData.get('image') as File;
    const organizationId = formData.get('organizationId') as string;

    if (!image || !organizationId) {
      return errorResponse(c, "Image and organization ID are required", 400);
    }

    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const result = await searchFacesByImageForOrganizationService(imageBuffer, organizationId);

    return successResponse(c, {
      message: "Face search for organization completed",
      data: result,
    });
  } catch (error) {
    console.error("Organization face search error:", error);
    return errorResponse(c, "Organization face search failed", 500);
  }
}