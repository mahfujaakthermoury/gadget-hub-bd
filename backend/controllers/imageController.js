import { uploadImageToCloudinary } from "../services/cloudinaryImageService.js";

const imageSignatures = {
  "image/jpeg": (buffer) =>
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff,
  "image/png": (buffer) =>
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  "image/webp": (buffer) =>
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP",
};

export function validateUploadedImage(file) {
  if (!file) return false;
  const matchesSignature = imageSignatures[file.mimetype];
  return Boolean(matchesSignature && matchesSignature(file.buffer));
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

export function createImageController({
  uploadImage = uploadImageToCloudinary,
} = {}) {
  return {
    uploadImage: async (request, response, next) => {
      try {
        const file = request.file;
        if (!file) throw httpError(400, "Choose an image file to upload.");
        if (!validateUploadedImage(file)) {
          throw httpError(400, "Upload a valid JPEG, PNG, or WebP image.");
        }
        const url = await uploadImage(file);
        response.status(201).json({ success: true, data: { url } });
      } catch (error) {
        next(error);
      }
    },
  };
}
