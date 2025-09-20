import {
  CompareFacesCommand,
  DetectFacesCommand,
  IndexFacesCommand,
  SearchFacesByImageCommand,
  CreateCollectionCommand,
  DeleteCollectionCommand,
  ListCollectionsCommand,
  type CompareFacesCommandInput,
  type DetectFacesCommandInput,
  type IndexFacesCommandInput,
  type SearchFacesByImageCommandInput,
} from "@aws-sdk/client-rekognition";

import rekognitionClient, { 
  rekognitionSettings, 
  validateRekognitionConfig,
  testRekognitionConnection 
} from "../../config/rekognition";

export interface FaceComparisonResult {
  isMatch: boolean;
  similarity: number;
  confidence: number;
}

export interface FaceDetectionResult {
  faceCount: number;
  faces: Array<{
    confidence: number;
    boundingBox: {
      width: number;
      height: number;
      left: number;
      top: number;
    };
    landmarks?: any[];
    attributes?: any;
  }>;
}

export interface FaceIndexResult {
  faceId: string;
  faceRecords: any[];
  success: boolean;
}

// Initialize configuration validation
validateRekognitionConfig();

/**
 * Compare two face images to determine if they are the same person
 */
export const compareFaces = async (
  sourceImageBuffer: Buffer,
  targetImageBuffer: Buffer,
  similarityThreshold?: number
): Promise<FaceComparisonResult> => {
  try {
    const threshold = similarityThreshold ?? rekognitionSettings.similarityThreshold;

    const params: CompareFacesCommandInput = {
      SourceImage: {
        Bytes: sourceImageBuffer,
      },
      TargetImage: {
        Bytes: targetImageBuffer,
      },
      SimilarityThreshold: threshold,
    };

    const command = new CompareFacesCommand(params);
    const response = await rekognitionClient.send(command);

    if (response.FaceMatches && response.FaceMatches.length > 0) {
      const bestMatch = response.FaceMatches[0];
      if (bestMatch) {
        return {
          isMatch: true,
          similarity: bestMatch.Similarity ?? 0,
          confidence: bestMatch.Face?.Confidence ?? 0,
        };
      }
    }

    return {
      isMatch: false,
      similarity: 0,
      confidence: 0,
    };
  } catch (error) {
    console.error("Face comparison failed:", error);
    throw new Error(`Face comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Detect faces in an image
 */
export const detectFaces = async (imageBuffer: Buffer): Promise<FaceDetectionResult> => {
  try {
    const params: DetectFacesCommandInput = {
      Image: {
        Bytes: imageBuffer,
      },
      Attributes: ["ALL"],
    };

    const command = new DetectFacesCommand(params);
    const response = await rekognitionClient.send(command);

    const faces = (response.FaceDetails ?? []).map(face => ({
      confidence: face.Confidence ?? 0,
      boundingBox: {
        width: face.BoundingBox?.Width ?? 0,
        height: face.BoundingBox?.Height ?? 0,
        left: face.BoundingBox?.Left ?? 0,
        top: face.BoundingBox?.Top ?? 0,
      },
      landmarks: face.Landmarks,
      attributes: {
        ageRange: face.AgeRange,
        gender: face.Gender,
        emotions: face.Emotions,
        eyeglasses: face.Eyeglasses,
        sunglasses: face.Sunglasses,
        beard: face.Beard,
        mustache: face.Mustache,
        smile: face.Smile,
      },
    }));

    return {
      faceCount: faces.length,
      faces,
    };
  } catch (error) {
    console.error("Face detection failed:", error);
    throw new Error(`Face detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Index a face into a collection for future searching
 */
export const indexFace = async (
  imageBuffer: Buffer,
  externalImageId: string,
  collectionId?: string
): Promise<FaceIndexResult> => {
  try {
    const collection = collectionId ?? rekognitionSettings.collectionId;

    const params: IndexFacesCommandInput = {
      CollectionId: collection,
      Image: {
        Bytes: imageBuffer,
      },
      ExternalImageId: externalImageId,
      MaxFaces: 1,
      QualityFilter: rekognitionSettings.qualityFilter,
      DetectionAttributes: ["ALL"],
    };

    const command = new IndexFacesCommand(params);
    const response = await rekognitionClient.send(command);

    if (response.FaceRecords && response.FaceRecords.length > 0) {
      const faceRecord = response.FaceRecords[0];
      return {
        faceId: faceRecord?.Face?.FaceId ?? "",
        faceRecords: response.FaceRecords,
        success: true,
      };
    }

    return {
      faceId: "",
      faceRecords: [],
      success: false,
    };
  } catch (error) {
    console.error("Face indexing failed:", error);
    throw new Error(`Face indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Index a face for a specific organization
 */
export const indexFaceForOrganization = async (
  imageBuffer: Buffer,
  externalImageId: string,
  organizationId: string
): Promise<FaceIndexResult> => {
  const { getOrganizationCollectionId } = await import("../organizations/organizations.service");
  
  try {
    const collectionId = await getOrganizationCollectionId(organizationId);
    
    if (!collectionId) {
      throw new Error(`No Rekognition collection found for organization: ${organizationId}`);
    }
    
    return await indexFace(imageBuffer, externalImageId, collectionId);
  } catch (error) {
    console.error(`Face indexing failed for organization ${organizationId}:`, error);
    throw new Error(`Face indexing failed for organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Search for similar faces in a collection
 */
export const searchFacesByImage = async (
  imageBuffer: Buffer,
  collectionId?: string,
  maxFaces?: number
): Promise<any[]> => {
  try {
    const collection = collectionId ?? rekognitionSettings.collectionId;
    const max = maxFaces ?? rekognitionSettings.maxFaces;

    const params: SearchFacesByImageCommandInput = {
      CollectionId: collection,
      Image: {
        Bytes: imageBuffer,
      },
      MaxFaces: max,
      FaceMatchThreshold: rekognitionSettings.similarityThreshold,
    };

    const command = new SearchFacesByImageCommand(params);
    const response = await rekognitionClient.send(command);

    return response.FaceMatches ?? [];
  } catch (error) {
    console.error("Face search failed:", error);
    throw new Error(`Face search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Search for similar faces in an organization's collection
 */
export const searchFacesByImageForOrganization = async (
  imageBuffer: Buffer,
  organizationId: string,
  maxFaces?: number
): Promise<any[]> => {
  const { getOrganizationCollectionId } = await import("../organizations/organizations.service");
  
  try {
    const collectionId = await getOrganizationCollectionId(organizationId);
    
    if (!collectionId) {
      throw new Error(`No Rekognition collection found for organization: ${organizationId}`);
    }
    
    return await searchFacesByImage(imageBuffer, collectionId, maxFaces);
  } catch (error) {
    console.error(`Face search failed for organization ${organizationId}:`, error);
    throw new Error(`Face search failed for organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Create a face collection
 */
export const createCollection = async (collectionId?: string): Promise<boolean> => {
  try {
    const collection = collectionId ?? rekognitionSettings.collectionId;

    const command = new CreateCollectionCommand({
      CollectionId: collection,
    });

    await rekognitionClient.send(command);
    return true;
  } catch (error) {
    console.error("Collection creation failed:", error);
    return false;
  }
};

/**
 * Delete a face collection
 */
export const deleteCollection = async (collectionId?: string): Promise<boolean> => {
  try {
    const collection = collectionId ?? rekognitionSettings.collectionId;

    const command = new DeleteCollectionCommand({
      CollectionId: collection,
    });

    await rekognitionClient.send(command);
    return true;
  } catch (error) {
    console.error("Collection deletion failed:", error);
    return false;
  }
};

/**
 * List all face collections
 */
export const listCollections = async (): Promise<string[]> => {
  try {
    const command = new ListCollectionsCommand({});
    const response = await rekognitionClient.send(command);
    return response.CollectionIds ?? [];
  } catch (error) {
    console.error("Failed to list collections:", error);
    return [];
  }
};

/**
 * Test the Rekognition service connection
 */
export const testConnection = async (): Promise<boolean> => {
  return testRekognitionConnection();
};

// Functional service object for easier migration (optional - can be removed if preferred)
export const biometricsService = {
  compareFaces,
  detectFaces,
  indexFace,
  indexFaceForOrganization,
  searchFacesByImage,
  searchFacesByImageForOrganization,
  createCollection,
  deleteCollection,
  listCollections,
  testConnection,
};
