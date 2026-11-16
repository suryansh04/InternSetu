import { v2 as cloudinary } from "cloudinary";

/** Stores interview recordings in Cloudinary. */
export function createVideoStore(credentials) {
  cloudinary.config({ ...credentials, secure: true });
  return {
    upload(buffer, { folder }) {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "video", folder },
          (error, result) => (error ? reject(error) : resolve(result.secure_url)),
        );
        stream.end(buffer);
      });
    },
  };
}
