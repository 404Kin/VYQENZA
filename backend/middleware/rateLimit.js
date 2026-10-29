// tiny in-memory rate limiter (per IP) - enough for a small shop, no extra package needed
module.exports = (max, windowMs) => {
  const hits = new Map();
  setInterval(() => hits.clear(), windowMs * 4).unref();
  return (req, res, next) => {
    const now = Date.now(), list = (hits.get(req.ip) || []).filter((t) => now - t < windowMs);
    if (list.length >= max) return res.status(429).json({ message: "Too many requests, please slow down" });
    list.push(now); hits.set(req.ip, list); next();
  };
};
