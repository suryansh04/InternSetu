const pdf = require("pdf-parse");
const fs = require("fs");
exports.extractPdf = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const buffer = fs.readFileSync(req.file.path);
    const data = await pdf(buffer);
    // data.text contains the full extracted text
    res.json({ text: data.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Extraction failed", details: err.message });
  } finally {
    // cleanup
    fs.unlink(req.file.path, () => {});
  }
};
