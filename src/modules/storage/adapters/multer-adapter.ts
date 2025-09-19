
import { writeFile } from 'fs/promises';
import path from 'path';
import type { StorageAdapter, UploadResult, CreateStorageAdapter } from "./storage-interface";
import { ensureUploadDir, generateFileName, isValidFileType } from "../../../config/multer";

const validateMulterConfig = () => {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  return { baseUrl };
};

const uploadFileToLocal = async (
  file: File, 
  fileName: string, 
  contentType: string,
  baseUrl: string
): Promise<UploadResult> => {
  try {
    // Validate file type
    if (!isValidFileType(contentType)) {
      throw new Error('File type not allowed. Only images and videos are supported.');
    }

    // Ensure upload directory exists
    const uploadDir = ensureUploadDir();
    
    // Generate unique filename if not provided
    const finalFileName = fileName || generateFileName(file.name || 'file');
    
    // Get file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // Write file to local storage
    const filePath = path.join(uploadDir, finalFileName);
    await writeFile(filePath, buffer);
    
    // Generate URL for accessing the file
    const url = `${baseUrl}/upload/${finalFileName}`;
    
    return {
      url,
      key: finalFileName,
      size: buffer.length,
    };
  } catch (error) {
    console.error('Local file upload failed:', error);
    throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const createMulterAdapter: CreateStorageAdapter = (): StorageAdapter => {
  const { baseUrl } = validateMulterConfig();
  
  return {
    uploadFile: (file: File, fileName: string, contentType: string) => 
      uploadFileToLocal(file, fileName, contentType, baseUrl)
  };
};
