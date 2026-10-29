const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

for (const k of ["MONGO_URI", "JWT_SECRET"]) if (!process.env[k]) { console.error(`Missing ${k} in environment`); process.exit(1); }

const app = express();
app.set("trust proxy", 1); // needed on Render/Railway etc. so rate limiting sees the real IP
app.use(cors());
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api", require("./routes/miscRoutes"));
app.use("/api", (req, res) => res.status(404).json({ message: "Not found" }));

// Serve the website from the same server (open http://localhost:5000, or your deployed URL)
app.use(express.static(path.join(__dirname, "..", "frontend")));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ DB Error:", err.message));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
