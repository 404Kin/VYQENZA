const express = require("express");
const router = express.Router();
const { Image } = require("../models/Misc");
const auth = require("../middleware/authMiddleware");
const limit = require("../middleware/rateLimit");

const MAX_BYTES = 1.5 * 1024 * 1024;

// Admin uploads one image as a data URL ("data:image/jpeg;base64,...."); the admin page shrinks it first.
router.post("/", express.json({ limit: "2.5mb" }), auth.admin, limit(60, 3600000), async (req, res) => {
  try {
    const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String((req.body || {}).data || ""));
    if (!m) return res.status(400).json({ message: "Please choose a JPG, PNG, WEBP or GIF image" });
    const buf = Buffer.from(m[2], "base64");
    if (!buf.length || buf.length > MAX_BYTES) return res.status(400).json({ message: "Image is too large (max 1.5 MB)" });
    const img = await Image.create({ data: buf, contentType: m[1] });
    res.status(201).json({ imageUrl: "/api/uploads/" + img._id });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Public: product photos
router.get("/:id", async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(404).end();
    const img = await Image.findById(req.params.id);
    if (!img) return res.status(404).end();
    res.set({ "Content-Type": img.contentType, "Cache-Control": "public, max-age=31536000, immutable" });
    res.send(Buffer.from(img.data));
  } catch (err) { res.status(500).end(); }
});

module.exports = router;
