const express = require("express");
const multer = require("multer");
const { extractPdf } = require("../controllers/extractPdfController");

const router = express.Router();

// Keep uploads in memory: the PDF is parsed once and never needs to touch disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

router.post("/extract", upload.single("file"), extractPdf);

module.exports = router;
