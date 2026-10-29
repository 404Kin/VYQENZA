// Run once:  npm run seed
// - Adds colours/sizes to products that don't have them yet (your existing products are kept)
// - Adds sample products only if the products collection is empty
// - Creates an admin account (ADMIN_EMAIL / ADMIN_PASSWORD from .env, or the defaults below)
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Product = require("./models/Product");
const User = require("./models/User");

const COLORS = [
  [{ name: "Black", hex: "#111111" }, { name: "Olive", hex: "#55603a" }, { name: "Navy", hex: "#1f2a44" }],
  [{ name: "Cream", hex: "#ece4d3" }, { name: "Camel", hex: "#b98a55" }, { name: "Charcoal", hex: "#333333" }],
  [{ name: "Indigo", hex: "#2b3d5c" }, { name: "Grey", hex: "#9a9a9a" }, { name: "Burgundy", hex: "#6d1f2b" }],
];
const defaults = (category, i) => ({
  colors: COLORS[i % COLORS.length],
  sizes: category === "Accessories" ? ["One Size"] : ["S", "M", "L", "XL"],
});

const SAMPLE = [
  ["Classic Denim Jacket", "A relaxed-fit denim jacket that layers over anything.", 4500, 0, "Men"],
  ["Leather Biker Jacket", "Slim-cut jacket with a clean, minimal finish.", 8900, 10900, "Men"],
  ["Structured Winter Coat", "Long coat with warm lining and a sharp shoulder.", 9500, 11900, "Women"],
  ["Evening Blazer", "Tailored blazer for dinners and special occasions.", 7200, 0, "Women"],
  ["Everyday Cotton Tee", "Soft cotton t-shirt with a regular fit.", 1200, 0, "Men"],
  ["Ribbed Knit Top", "Stretch knit top, easy to dress up or down.", 1800, 2400, "Women"],
  ["Canvas Tote Bag", "Roomy canvas tote with an inner pocket.", 1500, 0, "Accessories"],
  ["Wool Scarf", "Soft wool scarf for cold evenings.", 1100, 1500, "Accessories"],
].map(([name, description, price, oldPrice, category], i) => ({
  name, description, price, oldPrice, category, stock: 25,
  imageUrl: "https://i.pinimg.com/1200x/f3/11/ce/f311ceb616672fc5aa7d3c05a5ffa5af.jpg", // replace with real photos
  ...defaults(category, i),
}));

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  if ((await Product.countDocuments()) === 0) {
    await Product.insertMany(SAMPLE);
    console.log(`Added ${SAMPLE.length} sample products`);
  }
  let n = 0;
  for (const [i, p] of (await Product.find()).entries()) {
    if (p.colors.length && p.sizes.length) continue;
    const d = defaults(p.category, i);
    if (!p.colors.length) p.colors = d.colors;
    if (!p.sizes.length) p.sizes = d.sizes;
    await p.save(); n++;
  }
  if (n) console.log(`Added default colours/sizes to ${n} existing products`);

  const email = (process.env.ADMIN_EMAIL || "admin@vyqenza.com").toLowerCase();
  if (!(await User.findOne({ email }))) {
    const pw = process.env.ADMIN_PASSWORD || "admin123";
    await User.create({ name: "Admin", email, password: await bcrypt.hash(pw, 10), isAdmin: true });
    console.log(`Admin created: ${email} / ${pw}  (change this password!)`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
