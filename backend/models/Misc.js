const mongoose = require("mongoose");

const Subscriber = mongoose.model("Subscriber", new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
}, { timestamps: true }));

// One support conversation per customer (key = "u:<userId>" or "g:<guestId>")
const Chat = mongoose.model("Chat", new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: { type: String, default: "Guest" },
  email: { type: String, default: "" },
  messages: [{
    from: { type: String, enum: ["user", "bot", "admin"], required: true },
    text: { type: String, required: true },
    at: { type: Date, default: Date.now },
  }],
  unreadAdmin: { type: Number, default: 0 },
  unreadUser: { type: Number, default: 0 },
}, { timestamps: true }));

// Uploaded product photos live in MongoDB (Render/Railway disks are wiped on restart)
const Image = mongoose.model("Image", new mongoose.Schema({
  data: { type: Buffer, required: true },
  contentType: { type: String, required: true },
}, { timestamps: true }));

module.exports = { Subscriber, Chat, Image };
