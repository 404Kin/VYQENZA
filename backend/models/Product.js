const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: { type: String, required: true },
  comment: { type: String, required: true, maxlength: 1000 },
  rating: { type: Number, min: 1, max: 5, default: 5 },
  createdAt: { type: Date, default: Date.now },
});

// A colour option. imageUrl is optional: if set, the product photo changes when the colour is chosen.
const colorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  hex: { type: String, default: "#111111" },
  imageUrl: { type: String, default: "" },
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  oldPrice: { type: Number, default: 0 },          // > price  => shown in Sale
  stock: { type: Number, required: true },
  imageUrl: { type: String, required: true },
  category: { type: String, required: true, default: "Men" },
  colors: { type: [colorSchema], default: [] },
  sizes: { type: [String], default: [] },
  clicks: { type: Number, default: 0 },
  loves: { type: Number, default: 0 },
  reviews: [reviewSchema],
}, { timestamps: true, toJSON: { virtuals: true } });

productSchema.virtual("avgRating").get(function () {
  if (!this.reviews || !this.reviews.length) return 0;
  return Math.round((this.reviews.reduce((s, r) => s + r.rating, 0) / this.reviews.length) * 10) / 10;
});
productSchema.virtual("numReviews").get(function () { return this.reviews ? this.reviews.length : 0; });

module.exports = mongoose.model("Product", productSchema);
