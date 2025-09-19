import type { Context } from "hono";
import { errorResponse, successResponse, ErrorCodes } from "../../core/http";
import { createStorageService } from "./storage.service";
import { createMulterAdapter } from "./adapters/multer-adapter";
import { createS3Adapter } from "./adapters/s3-adapter";

// Use multer or s3 adapter, depending on the environment
const storageAdapter = process.env.NODE_ENV === "development" || !process.env.NODE_ENV ? createMulterAdapter() : createS3Adapter();
const storageService = createStorageService(storageAdapter);

// Helper function to get placeholder user (this should come from auth in real implementation)
const getPlaceholderUser = () => ({
  id: "123",
  name: "John Doe",
  email: "john.doe@example.com",
  user_face_url: [],
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const uploadUserFace = async (c: Context) => {
  const { file } = await c.req.parseBody();
  const user = getPlaceholderUser(); // placeholder for user;

  if (!file) {
    return errorResponse(c, "No file provided", ErrorCodes.BAD_REQUEST);
  }

  try {
    const result = await storageService.uploadUserFace(
      file as File, 
      user.id, 
      user.user_face_url.length
    );
    
    return successResponse(c, { 
      message: "File uploaded successfully",
      url: result.url,
      fileName: result.fileName
    });
  } catch (error) {
    console.error('File upload failed:', error);
    return errorResponse(c, "File upload failed", ErrorCodes.INTERNAL_SERVER_ERROR);
  }
};
