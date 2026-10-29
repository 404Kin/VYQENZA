const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const auth = require("../middleware/authMiddleware");

// Place order. Prices are taken from the database (never from the browser).
router.post("/", auth, async (req, res) => {
  const reserved = []; // for rollback if something fails midway
  try {
    const { items, shipping } = req.body;
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ message: "Your cart is empty" });
    const s = shipping || {};
    if (!s.name || !s.phone || !s.address || !s.city)
      return res.status(400).json({ message: "Please fill in name, phone, address and city" });

    const orderItems = [];
    let total = 0;
    for (const it of items) {
      const qty = parseInt(it.quantity, 10);
      const p = await Product.findById(it.product);
      if (!p || !(qty > 0)) return res.status(400).json({ message: "Invalid item in cart" });
      if (p.colors.length && !p.colors.some((c) => c.name === it.color))
        return res.status(400).json({ message: `Please choose a colour for ${p.name}` });
      if (p.sizes.length && !p.sizes.includes(it.size))
        return res.status(400).json({ message: `Please choose a size for ${p.name}` });
      // atomic stock decrement
      const ok = await Product.findOneAndUpdate({ _id: p._id, stock: { $gte: qty } }, { $inc: { stock: -qty } });
      if (!ok) throw Object.assign(new Error(`Only limited stock left for ${p.name}`), { code: 400 });
      reserved.push({ id: p._id, qty });
      const color = p.colors.find((c) => c.name === it.color);
      orderItems.push({ product: p._id, name: p.name, imageUrl: (color && color.imageUrl) || p.imageUrl, price: p.price, quantity: qty, color: it.color || "", size: it.size || "" });
      total += p.price * qty;
    }
    const order = await Order.create({
      user: req.user.id, orderItems, shipping: { name: s.name, phone: s.phone, address: s.address, city: s.city },
      totalPrice: total,
    });
    res.json(order);
  } catch (err) {
    for (const r of reserved) await Product.findByIdAndUpdate(r.id, { $inc: { stock: r.qty } });
    res.status(err.code === 400 ? 400 : 500).json({ message: err.message });
  }
});

router.get("/myorders", auth, async (req, res) => {
  res.json(await Order.find({ user: req.user.id }).sort({ createdAt: -1 }));
});

// Customer can cancel while the order is still Pending (stock is returned)
router.put("/:id/cancel", auth, async (req, res) => {
  try {
    const o = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!o) return res.status(404).json({ message: "Order not found" });
    if (o.status !== "Pending") return res.status(400).json({ message: "Only pending orders can be cancelled" });
    o.status = "Cancelled"; await o.save();
    for (const it of o.orderItems) await Product.findByIdAndUpdate(it.product, { $inc: { stock: it.quantity } });
    res.json(o);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Admin: all orders / change status
router.get("/", auth.admin, async (req, res) => res.json(await Order.find().sort({ createdAt: -1 }).populate("user", "name email")));
router.put("/:id/status", auth.admin, async (req, res) => {
  try {
    const o = await Order.findById(req.params.id);
    if (!o) return res.status(404).json({ message: "Order not found" });
    const st = req.body.status;
    if (!Order.schema.path("status").enumValues.includes(st)) return res.status(400).json({ message: "Invalid status" });
    if (o.status === "Cancelled" && st !== "Cancelled") return res.status(400).json({ message: "Cancelled orders cannot be reopened" });
    if (st === "Cancelled" && o.status !== "Cancelled")
      for (const it of o.orderItems) await Product.findByIdAndUpdate(it.product, { $inc: { stock: it.quantity } });
    o.status = st; await o.save();
    res.json(o);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

module.exports = router;
