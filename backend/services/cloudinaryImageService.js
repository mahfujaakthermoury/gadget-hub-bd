import { Readable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

export async function uploadImageToCloudinary(file) {
  const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME } =
    process.env;
  if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET || !CLOUDINARY_CLOUD_NAME) {
    throw httpError(503, "Image uploads are not configured.");
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  try {
    const result = await new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: "gadget-hub",
          resource_type: "image",
          allowed_formats: ["jpg", "jpeg", "png", "webp"],
          max_file_size: 5 * 1024 * 1024,
        },
        (error, uploaded) => {
          if (error) reject(error);
          else resolve(uploaded);
        },
      );
      Readable.from(file.buffer).pipe(upload);
    });
    if (typeof result?.secure_url !== "string") {
      throw httpError(502, "The image hosting service returned an invalid response.");
    }
    return result.secure_url;
  } catch (error) {
    if (error.status) throw error;
    console.error("Cloudinary image upload failed:", error.name);
    throw httpError(502, "The image hosting service could not upload this file.");
  }
}
