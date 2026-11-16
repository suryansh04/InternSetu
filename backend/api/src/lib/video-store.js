import { v2 as cloudinary } from "cloudinary";

/**
 * Stores interview recordings in Cloudinary.
 * @param {{ cloud_name: string, api_key: string, api_secret: string }} credentials
 * @returns {import("../types.js").VideoStore}
 */
export function createVideoStore(credentials) {
  cloudinary.config({ ...credentials, secure: true });
  return {
    upload(video, { folder }) {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "video", folder },
          (error, result) => {
            if (error || !result) reject(error ?? new Error("Cloudinary returned no result"));
            else resolve(result.secure_url);
          },
        );
        stream.end(video);
      });
    },
  };
}
