const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");
const limit = require("../middleware/rateLimit");

const sign = (u) => jwt.sign({ id: u._id, isAdmin: u.isAdmin }, process.env.JWT_SECRET, { expiresIn: "7d" });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email, isAdmin: u.isAdmin });

router.post("/register", limit(20, 900000), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password are required" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(400).json({ message: "User already exists" });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
    res.json({ token: sign(user), user: pub(user) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post("/login", limit(20, 900000), async (req, res) => {
  try {
    const user = await User.findOne({ email: String(req.body.email || "").toLowerCase() });
    if (!user || !(await bcrypt.compare(req.body.password || "", user.password)))
      return res.status(400).json({ message: "Invalid email or password" });
    res.json({ token: sign(user), user: pub(user) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ message: "Account not found" });
  res.json({ ...pub(user), wishlist: user.wishlist, createdAt: user.createdAt });
});

// Update profile name
router.put("/me", auth, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "Name cannot be empty" });
    const user = await User.findByIdAndUpdate(req.user.id, { name }, { new: true });
    res.json(pub(user));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Change password
router.put("/password", auth, async (req, res) => {
  try {
    const { current, password } = req.body;
    const user = await User.findById(req.user.id);
    if (!user || !(await bcrypt.compare(current || "", user.password))) return res.status(400).json({ message: "Current password is wrong" });
    if (!password || password.length < 6) return res.status(400).json({ message: "New password must be at least 6 characters" });
    user.password = await bcrypt.hash(password, 10); await user.save();
    res.json({ message: "Password updated" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
