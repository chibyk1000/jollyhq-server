import multer from "multer";

export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_UPLOAD_SIZE_LABEL = "5MB";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
});
