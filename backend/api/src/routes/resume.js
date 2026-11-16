import { Router } from "express";
import multer from "multer";
import { HttpError } from "../lib/http-error.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

export function resumeRoutes({ resumeService }) {
  const router = Router();

  // PDF in, structured profile out.
  router.post("/parse", upload.single("file"), async (req, res) => {
    const file = req.file;
    if (!file) throw new HttpError(400, "Attach a PDF resume as 'file'.");
    const isPdf = file.buffer.subarray(0, 5).toString("latin1") === "%PDF-";
    if (!isPdf) throw new HttpError(415, "Only PDF resumes are supported.");

    const profile = await resumeService.extractProfile(file.buffer);
    res.json({ profile });
  });

  return router;
}
