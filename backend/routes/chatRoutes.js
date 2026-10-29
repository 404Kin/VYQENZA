const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { Chat } = require("../models/Misc");
const User = require("../models/User");
const Order = require("../models/Order");
const auth = require("../middleware/authMiddleware");
const limit = require("../middleware/rateLimit");

// token is optional here: logged-in users get a thread tied to their account, guests get one tied to a random id
const optAuth = (req, res, next) => {
  try { const t = req.headers.authorization?.split(" ")[1]; if (t) req.user = jwt.verify(t, process.env.JWT_SECRET); } catch (e) {}
  next();
};
const keyOf = (req) => {
  if (req.user) return "u:" + req.user.id;
  const g = req.headers["x-guest-id"] || "";
  return /^[\w-]{16,64}$/.test(g) ? "g:" + g : null;
};
const view = (c) => ({ messages: c.messages.map((m) => ({ from: m.from, text: m.text, at: m.at })), unread: c.unreadUser });

/* ---- instant bot answers; anything else waits for a human ---- */
const FALLBACK = "Thanks for your message! Our support team has been notified and will reply here soon.";
async function bot(text, user) {
  const t = text.toLowerCase();
  if (/cancel/.test(t)) return "You can cancel a Pending order from Profile > Orders. Once it has shipped it can no longer be cancelled.";
  if (/(order|track|status|parcel)/.test(t)) {
    if (!user) return "Please login and open Profile > Orders to see your order status.";
    const o = await Order.findOne({ user: user.id }).sort({ createdAt: -1 });
    return o ? `Your latest order #${String(o._id).slice(-6).toUpperCase()} is ${o.status} (total TK${o.totalPrice.toFixed(2)}).` : "You have not placed any orders yet.";
  }
  if (/(ship|deliver)/.test(t)) return "We deliver in 3-5 working days. Delivery details are collected at checkout.";
  if (/(return|refund|exchange)/.test(t)) return "Unworn items can be returned within 7 days of delivery. Tell us your order number and we will help.";
  if (/(pay|cash|cod|bkash|price)/.test(t)) return "We currently accept Cash on Delivery. You pay when your order arrives.";
  if (/(size|fit)/.test(t)) return "Pick your size on the product page. If you are between sizes we suggest the larger one.";
  if (/(human|agent|person|support|help)/.test(t)) return "A support agent has been notified and will reply here as soon as possible.";
  if (/^(hi|hello|hey|hii|salam|assalam)/.test(t)) return "Hi! How can we help you today? You can ask about orders, delivery, returns or sizes.";
  return null;
}

router.get("/me", optAuth, async (req, res) => {
  try {
    const key = keyOf(req); if (!key) return res.json({ messages: [], unread: 0 });
    const chat = await Chat.findOne({ key });
    if (!chat) return res.json({ messages: [], unread: 0 });
    if (req.query.open === "1" && chat.unreadUser) { chat.unreadUser = 0; await chat.save(); }
    res.json(view(chat));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post("/me", optAuth, limit(30, 60000), async (req, res) => {
  try {
    const key = keyOf(req); if (!key) return res.status(400).json({ message: "Missing chat id" });
    const text = String(req.body.text || "").trim().slice(0, 1000);
    if (!text) return res.status(400).json({ message: "Message is empty" });
    let chat = await Chat.findOne({ key });
    if (!chat) {
      chat = new Chat({ key, name: String(req.body.name || "").trim().slice(0, 60) || "Guest" });
      if (req.user) { const u = await User.findById(req.user.id); if (u) { chat.user = u._id; chat.name = u.name; chat.email = u.email; } }
    }
    chat.messages.push({ from: "user", text }); chat.unreadAdmin += 1;
    const reply = await bot(text, req.user);
    const recentFallback = chat.messages.slice(-4).some((m) => m.text === FALLBACK);
    if (reply) chat.messages.push({ from: "bot", text: reply });
    else if (!recentFallback) chat.messages.push({ from: "bot", text: FALLBACK });
    await chat.save();
    res.json(view(chat));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/* ---- admin inbox ---- */
router.get("/admin/list", auth.admin, async (req, res) => {
  const chats = await Chat.find().sort({ updatedAt: -1 });
  res.json(chats.map((c) => ({ _id: c._id, name: c.name, email: c.email, isUser: !!c.user, unread: c.unreadAdmin, updatedAt: c.updatedAt, last: (c.messages[c.messages.length - 1] || {}).text || "" })));
});
router.get("/admin/:id", auth.admin, async (req, res) => {
  const c = await Chat.findById(req.params.id);
  if (!c) return res.status(404).json({ message: "Chat not found" });
  if (c.unreadAdmin) { c.unreadAdmin = 0; await c.save(); }
  res.json({ _id: c._id, name: c.name, email: c.email, messages: c.messages });
});
router.post("/admin/:id/reply", auth.admin, async (req, res) => {
  const text = String(req.body.text || "").trim().slice(0, 1000);
  const c = await Chat.findById(req.params.id);
  if (!c || !text) return res.status(400).json({ message: "Chat not found or message empty" });
  c.messages.push({ from: "admin", text }); c.unreadUser += 1; await c.save();
  res.json({ _id: c._id, name: c.name, email: c.email, messages: c.messages });
});
router.delete("/admin/:id", auth.admin, async (req, res) => { await Chat.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); });

module.exports = router;
