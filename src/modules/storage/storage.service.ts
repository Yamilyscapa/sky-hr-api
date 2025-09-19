import type { StorageAdapter } from "./adapters/storage-interface";

const getFileExtension = (mimeType: string): string => {
  return mimeType.includes('jpeg') ? 'jpg' : mimeType.split('/')[1] || 'bin';
};

const generateFileName = (userId: string, faceIndex: number, fileExtension: string): string => {
  return `${userId}-${faceIndex}-user-face.${fileExtension}`;
};

export const uploadUserFace = (storageAdapter: StorageAdapter) => 
  async (file: File, userId: string, faceIndex: number): Promise<{ url: string; fileName: string }> => {
    const type = file.type;
    const fileExtension = getFileExtension(type);
    const fileName = generateFileName(userId, faceIndex, fileExtension);

    const result = await storageAdapter.uploadFile(file, fileName, type);

    return {
      url: result.url,
      fileName: result.key,
    };
  };

export const createStorageService = (storageAdapter: StorageAdapter) => ({
  uploadUserFace: uploadUserFace(storageAdapter)
});
