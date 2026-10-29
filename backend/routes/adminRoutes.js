const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { Subscriber, Chat } = require("../models/Misc");
const auth = require("../middleware/authMiddleware");

router.use(auth.admin); // everything below is admin only

router.get("/stats", async (req, res) => {
  try {
    const [users, products, orders, pending, subscribers, lowStock, unread, revenue, recent, top] = await Promise.all([
      User.countDocuments(), Product.countDocuments(), Order.countDocuments(), Order.countDocuments({ status: "Pending" }),
      Subscriber.countDocuments(), Product.countDocuments({ stock: { $lte: 5 } }),
      Chat.aggregate([{ $group: { _id: null, n: { $sum: "$unreadAdmin" } } }]),
      Order.aggregate([{ $match: { status: { $ne: "Cancelled" } } }, { $group: { _id: null, t: { $sum: "$totalPrice" } } }]),
      Order.find().sort({ createdAt: -1 }).limit(5),
      Product.find().sort({ clicks: -1 }).limit(5).select("name clicks loves imageUrl"),
    ]);
    res.json({ users, products, orders, pending, subscribers, lowStock, unreadChats: unread[0] ? unread[0].n : 0, revenue: revenue[0] ? revenue[0].t : 0, recent, top });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Users
router.get("/users", async (req, res) => res.json(await User.find().select("-password").sort({ createdAt: -1 })));
router.put("/users/:id", async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: "You cannot change your own role" });
    res.json(await User.findByIdAndUpdate(req.params.id, { isAdmin: !!req.body.isAdmin }, { new: true }).select("-password"));
  } catch (err) { res.status(400).json({ message: err.message }); }
});
router.delete("/users/:id", async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: "You cannot delete yourself" });
    await User.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Newsletter subscribers
router.get("/subscribers", async (req, res) => res.json(await Subscriber.find().sort({ createdAt: -1 })));
router.delete("/subscribers/:id", async (req, res) => { await Subscriber.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); });

// Reviews (moderation)
router.get("/reviews", async (req, res) => {
  const products = await Product.find({ "reviews.0": { $exists: true } }).select("name reviews");
  res.json(products.flatMap((p) => p.reviews.map((r) => ({ _id: r._id, productId: p._id, product: p.name, name: r.name, rating: r.rating, comment: r.comment, createdAt: r.createdAt })))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});
router.delete("/reviews/:productId/:reviewId", async (req, res) => {
  try {
    const p = await Product.findById(req.params.productId);
    if (!p) return res.status(404).json({ message: "Product not found" });
    p.reviews.pull({ _id: req.params.reviewId }); await p.save();
    res.json({ message: "Deleted" });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

module.exports = router;
