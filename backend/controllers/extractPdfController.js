const pdf = require("pdf-parse");

exports.extractPdf = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    // pdf-parse's bundled pdf.js misreads Node Buffers that sit inside the shared
    // buffer pool (common for small uploads); a plain Uint8Array copy is safe.
    const data = await pdf(new Uint8Array(req.file.buffer));
    res.json({ text: data.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Extraction failed", details: err.message });
  }
};
