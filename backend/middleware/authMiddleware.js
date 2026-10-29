const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // "Bearer <token>"
  if (!token) return res.status(401).json({ message: "Please login first" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, isAdmin }
    next();
  } catch (err) {
    res.status(401).json({ message: "Session expired, please login again" });
  }
};
// admin check reads the database, so removing someone's admin role takes effect immediately
auth.admin = (req, res, next) =>
  auth(req, res, async () => {
    try {
      const u = await require("../models/User").findById(req.user.id).select("isAdmin");
      if (!u || !u.isAdmin) return res.status(403).json({ message: "Admin only" });
      next();
    } catch (err) { res.status(500).json({ message: err.message }); }
  });

module.exports = auth;
