const id = new URLSearchParams(location.search).get("id");
const box = $("#product-detail");
let p, color = 0, size = "", qty = 1, loved = false;

async function load() {
  try { p = await api("/products/" + id); }
  catch (err) { box.innerHTML = `<p class="msg-err" style="grid-column:1/-1">${esc(err.status === 404 ? "Product not found" : err.message)} &middot; <a href="index.html">Back to shop</a></p>`; return; }
  document.title = p.name + " | VYQENZA";
  if ((p.sizes || []).length === 1) size = p.sizes[0];
  if (getToken()) { try { loved = (await api("/auth/me")).wishlist.includes(p._id); } catch {} }
  render(); renderReviews();
}

function render() {
  const c = (p.colors || [])[color], img = (c && c.imageUrl) || p.imageUrl;
  const stock = p.stock < 1 ? "Sold out" : p.stock <= 5 ? `Only ${p.stock} left` : "In stock";
  box.innerHTML = `
    <div class="product-detail-img"><img src="${esc(img)}" alt="${esc(p.name)}"></div>
    <div class="product-detail-info">
      <div class="product-type">${esc(p.category)}</div>
      <h1>${esc(p.name)}</h1>
      <div class="product-rating" style="font-size:14px;margin-bottom:12px">${stars(p.avgRating)} <span>${p.avgRating || "No ratings"} &middot; ${p.numReviews} review${p.numReviews === 1 ? "" : "s"}</span></div>
      <div class="price">${money(p.price)}${p.oldPrice > p.price ? ` <s>${money(p.oldPrice)}</s>` : ""}</div>
      <p class="desc">${esc(p.description)}</p>
      ${(p.colors || []).length ? `<div class="opt-label">Color: <b>${esc(c.name)}</b></div>
        <div class="swatches">${p.colors.map((x, i) => `<span class="sw${i === color ? " on" : ""}" data-c="${i}" title="${esc(x.name)}" style="background:${esc(x.hex)}"></span>`).join("")}</div>` : ""}
      ${(p.sizes || []).length ? `<div class="opt-label">Size${size ? `: <b>${esc(size)}</b>` : ""}</div>
        <div class="sizes">${p.sizes.map((s) => `<button class="sz${s === size ? " on" : ""}" data-s="${esc(s)}">${esc(s)}</button>`).join("")}</div>` : ""}
      <div class="stock">${stock}</div>
      <div class="buy-row">
        <div class="qty"><button data-q="-1">&minus;</button><span>${qty}</span><button data-q="1">+</button></div>
        <button class="add-to-cart" id="add-btn" ${p.stock < 1 ? "disabled" : ""}>${p.stock < 1 ? "Sold out" : "Add to Cart"}</button>
        <div class="action-btn" id="love" title="Save"><i class="${loved ? "fas" : "far"} fa-heart" style="${loved ? "color:#e63946" : ""}"></i></div>
      </div>
    </div>`;
}

box.addEventListener("click", async (e) => {
  const t = e.target;
  let m;
  if ((m = t.closest(".sw"))) { color = +m.dataset.c; render(); }
  else if ((m = t.closest(".sz"))) { size = m.dataset.s; render(); }
  else if ((m = t.closest("[data-q]"))) { qty = Math.min(Math.max(1, qty + +m.dataset.q), Math.max(1, p.stock)); render(); }
  else if (t.closest("#add-btn")) {
    if ((p.sizes || []).length && !size) return toast("Please select a size");
    addToCart(p, { color: ((p.colors || [])[color] || {}).name || "", size, qty });
  } else if (t.closest("#love")) {
    if (!getToken()) return needLogin("Please login to save items");
    try { const r = await api(`/products/${p._id}/love`, { method: "POST" }); loved = r.loved; toast(loved ? "Saved to your wishlist" : "Removed from wishlist"); render(); }
    catch (err) { toast(err.message); }
  }
});

/* ---- reviews ---- */
function renderReviews() {
  $("#reviews-section").style.display = "block";
  const rs = [...p.reviews].reverse(), n = rs.length;
  $("#review-summary").innerHTML = n ? `<div class="rev-sum"><div class="rev-big">${p.avgRating}</div><div>${stars(p.avgRating)}<div style="font-size:12px;color:#777">${n} review${n === 1 ? "" : "s"}</div></div>
    <div class="rev-bars">${[5, 4, 3, 2, 1].map((s) => { const c = rs.filter((r) => r.rating === s).length; return `<div><span>${s}&#9733;</span><i><b style="width:${(c / n) * 100}%"></b></i><span>${c}</span></div>`; }).join("")}</div></div>` : "";
  $("#reviews-list").innerHTML = n ? rs.map((r) => `<div class="review-card"><div class="review-header"><span class="review-name">${esc(r.name)}</span><span class="review-stars">${stars(r.rating)}</span></div>
    <div class="review-comment">${esc(r.comment)}</div><div style="font-size:12px;color:#999;margin-top:4px">${fmtDate(r.createdAt)}</div></div>`).join("") : `<p class="msg-empty" style="padding:20px 0">No reviews yet. Be the first to review this product!</p>`;
  const u = getUser(), mine = u && p.reviews.some((r) => r.user === u.id);
  $("#review-form-box").innerHTML = !u ? `<p class="note"><a href="login.html?next=${encodeURIComponent("product.html?id=" + id)}" style="color:#000;text-decoration:underline">Login</a> to write a review.</p>`
    : mine ? `<p class="note">Thanks, you have already reviewed this product.</p>`
    : `<form class="review-form" id="review-form"><h3>Write a Review</h3>
        <div class="pick" id="pick">${[1, 2, 3, 4, 5].map((n) => `<i class="far fa-star" data-s="${n}"></i>`).join("")}</div>
        <textarea id="review-comment" placeholder="Share your experience with this product..." required></textarea>
        <button id="submit-review-btn">Submit Review</button></form>`;
}
let rating = 0;
$("#review-form-box").addEventListener("click", (e) => {
  const s = e.target.closest("#pick i"); if (!s) return;
  rating = +s.dataset.s; $$("#pick i").forEach((x) => (x.className = (+x.dataset.s <= rating ? "fas" : "far") + " fa-star"));
});
$("#review-form-box").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!rating) return toast("Please choose a star rating");
  try { p = await api(`/products/${p._id}/review`, { method: "POST", body: { rating, comment: $("#review-comment").value } }); toast("Thanks for your review!"); render(); renderReviews(); }
  catch (err) { err.status === 401 ? needLogin("Please login to review") : toast(err.message); }
});

load();
