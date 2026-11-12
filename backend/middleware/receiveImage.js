import multer from "multer";

const parseImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
}).single("image");

export function receiveImage(request, response, next) {
  parseImageUpload(request, response, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return next(
        Object.assign(
          new Error(
            error.code === "LIMIT_FILE_SIZE"
              ? "Image files must be 5 MB or smaller."
              : "Upload one image file at a time.",
          ),
          { status },
        ),
      );
    }
    return next(error);
  });
}
