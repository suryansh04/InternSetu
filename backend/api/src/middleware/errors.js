import multer from "multer";
import { HttpError } from "../lib/http-error.js";

/**
 * @param {import("express").Request} _req
 * @param {import("express").Response} _res
 * @param {import("express").NextFunction} next
 */
export function notFound(_req, _res, next) {
  next(new HttpError(404, "Not found."));
}

/**
 * Turns any error into a JSON response whose message is safe to show.
 * Express recognises error handlers by their four parameters.
 * @param {any} err
 * @param {import("express").Request} _req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} _next
 */
export function errorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "The file is too large." : "The upload could not be read.";
    res.status(400).json({ error: message });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "The request body is not valid JSON." });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
}
