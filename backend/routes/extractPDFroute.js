const express = require("express");
const multer = require("multer");

const router = express.Router();
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 },
}); // 50MB limit
const { extractPdf } = require("../controllers/extractPdfController");
router.post("/extract", upload.single("file"), extractPdf);

module.exports = router;
