export function storagePolicies() {
  return {
    userFace: {
      maxSize: 50 * 1024 * 1024, // 50MB
      allowedTypes: ["image/png", "image/jpg", "image/jpeg", "image/webp","image/heic", "image/heif", "video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo"],
    },
    imagesLimit: (images: string[]): boolean => {
        const MAX_IMAGES = 3;
        return !(images.length < MAX_IMAGES);
    }
  };
}