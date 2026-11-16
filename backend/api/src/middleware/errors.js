import multer from "multer";
import { HttpError } from "../lib/http-error.js";

export function notFound(_req, _res, next) {
  next(new HttpError(404, "Not found."));
}

// Express recognises error handlers by their four arguments.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "The file is too large." : "The upload could not be read.";
    return res.status(400).json({ error: message });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "The request body is not valid JSON." });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
}
