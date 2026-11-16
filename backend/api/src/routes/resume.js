import { Router } from "express";
import multer from "multer";
import { HttpError } from "../lib/http-error.js";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_BYTES, files: 1 },
});

/** @param {Buffer} buffer */
const isPdf = (buffer) => buffer.subarray(0, 5).toString("latin1") === "%PDF-";

/** @param {{ resumeService: import("../types.js").ResumeService }} deps */
export function resumeRoutes({ resumeService }) {
  const router = Router();

  // PDF in, structured profile out. The file's bytes are checked, not its name.
  router.post("/parse", upload.single("file"), async (req, res) => {
    if (!req.file) throw new HttpError(400, "Attach a PDF resume as 'file'.");
    if (!isPdf(req.file.buffer)) throw new HttpError(415, "Only PDF resumes are supported.");
    res.json({ profile: await resumeService.extractProfile(req.file.buffer) });
  });

  return router;
}
