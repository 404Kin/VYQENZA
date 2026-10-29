const express = require("express");
const router = express.Router();
const { Subscriber } = require("../models/Misc");
const limit = require("../middleware/rateLimit");

router.post("/newsletter", limit(10, 3600000), async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ message: "Please enter a valid email" });
    if (await Subscriber.findOne({ email })) return res.json({ message: "You are already subscribed" });
    await Subscriber.create({ email });
    res.json({ message: "Thank you for subscribing!" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
