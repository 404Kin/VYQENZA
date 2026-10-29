const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

const bad = (res, code, message) => res.status(code).json({ message });
const isId = (id) => /^[a-f\d]{24}$/i.test(id);

// All products (reviews are left out of the list to keep it light; avgRating/numReviews are computed from them)
router.get("/", async (req, res) => {
  try { res.json(await Product.find().sort({ createdAt: -1 })); }
  catch (err) { bad(res, 500, err.message); }
});

router.get("/:id", async (req, res) => {
  try {
    if (!isId(req.params.id)) return bad(res, 404, "Product not found");
    const p = await Product.findById(req.params.id);
    p ? res.json(p) : bad(res, 404, "Product not found");
  } catch (err) { bad(res, 500, err.message); }
});

// Admin: add / edit / delete product
router.post("/", auth.admin, async (req, res) => {
  try { res.json(await Product.create(req.body)); } catch (err) { bad(res, 400, err.message); }
});
router.put("/:id", auth.admin, async (req, res) => {
  try { res.json(await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })); }
  catch (err) { bad(res, 400, err.message); }
});
router.delete("/:id", auth.admin, async (req, res) => {
  try { await Product.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); }
  catch (err) { bad(res, 400, err.message); }
});

// Click tracking
router.put("/:id/click", async (req, res) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } }, { new: true });
    res.json({ clicks: p ? p.clicks : 0 });
  } catch (err) { bad(res, 500, err.message); }
});

// Wishlist toggle (saved on the user + counted in product.loves)
router.post("/:id/love", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const product = await Product.findById(req.params.id);
    if (!user || !product) return bad(res, 404, "Not found");
    const has = user.wishlist.some((id) => id.equals(product._id));
    if (has) user.wishlist.pull(product._id); else user.wishlist.push(product._id);
    await user.save();
    product.loves = Math.max(0, product.loves + (has ? -1 : 1));
    await product.save();
    res.json({ loved: !has, loves: product.loves, wishlist: user.wishlist });
  } catch (err) { bad(res, 500, err.message); }
});

// Review (login required, one review per user per product)
router.post("/:id/review", auth, async (req, res) => {
  try {
    const { comment } = req.body;
    const rating = Number(req.body.rating);
    if (!comment || !comment.trim()) return bad(res, 400, "Please write a comment");
    if (!(rating >= 1 && rating <= 5)) return bad(res, 400, "Rating must be 1 to 5");
    const [product, user] = await Promise.all([Product.findById(req.params.id), User.findById(req.user.id)]);
    if (!product || !user) return bad(res, 404, "Not found");
    if (product.reviews.some((r) => r.user && r.user.equals(user._id)))
      return bad(res, 400, "You have already reviewed this product");
    product.reviews.push({ user: user._id, name: user.name, comment: comment.trim(), rating });
    await product.save();
    res.status(201).json(product);
  } catch (err) { bad(res, 500, err.message); }
});

module.exports = router;
