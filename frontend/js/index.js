const grid = $("#products"), note = $("#filter-note");
const params = new URLSearchParams(location.search);
let all = [], cat = params.get("cat") || "All", query = params.get("q") || "", wish = new Set();

async function init() {
  if (cat === "Saved" && !getToken()) return needLogin("Please login to see your saved items");
  try { all = await api("/products"); }
  catch (err) { grid.innerHTML = `<p class="msg-err">${esc(err.message)}</p>`; return; }
  if (getToken()) { try { wish = new Set((await api("/auth/me")).wishlist); } catch {} }
  render();
}

function visible() {
  const q = query.toLowerCase();
  return all.filter((p) =>
    (cat === "All" || (cat === "Sale" ? p.oldPrice > p.price : cat === "Saved" ? wish.has(p._id) : p.category === cat)) &&
    (!q || (p.name + " " + p.category).toLowerCase().includes(q)));
}

function render() {
  $$(".category").forEach((c) => c.classList.toggle("active", c.dataset.filter === cat));
  const list = visible();
  note.innerHTML = cat === "Sale" || cat === "Saved" || query
    ? `Showing ${list.length} item${list.length === 1 ? "" : "s"}${cat !== "All" ? ` in <b>${esc(cat)}</b>` : ""}${query ? ` for &ldquo;${esc(query)}&rdquo;` : ""} <a id="clear-f">Show all</a>` : "";
  if (!list.length) { grid.innerHTML = `<p class="msg-empty">No products found.</p>`; return; }
  grid.innerHTML = list.map((p) => {
    const loved = wish.has(p._id), multi = (p.colors || []).length > 1 || (p.sizes || []).length > 1;
    return `<div class="product" data-id="${p._id}">
      <div class="product-img"><img src="${esc(p.imageUrl)}" alt="${esc(p.name)}">${p.oldPrice > p.price ? `<span class="sale-tag">-${Math.round((1 - p.price / p.oldPrice) * 100)}%</span>` : ""}
        <div class="product-actions">
          <div class="action-btn love-btn" title="Save"><i class="${loved ? "fas" : "far"} fa-heart" style="${loved ? "color:#e63946" : ""}"></i></div>
          <div class="action-btn expand-btn" title="Zoom"><i class="fas fa-expand"></i></div>
        </div></div>
      <div class="product-type">${esc(p.category)}</div>
      <div class="product-title">${esc(p.name)}</div>
      <div class="product-rating">${stars(p.avgRating)} <span>(${p.numReviews})</span></div>
      <div class="product-price">${money(p.price)}${p.oldPrice > p.price ? ` <s>${money(p.oldPrice)}</s>` : ""}</div>
      <div class="swatch-row">${(p.colors || []).map((c) => `<span class="dot" title="${esc(c.name)}" style="background:${esc(c.hex)}"></span>`).join("")}</div>
      <button class="add-to-cart" ${p.stock < 1 ? "disabled" : ""}>${p.stock < 1 ? "Sold out" : multi ? "Select Options" : "Add to Cart"}</button></div>`;
  }).join("");
}

grid.addEventListener("click", async (e) => {
  const el = e.target.closest(".product"); if (!el) return;
  const p = all.find((x) => x._id === el.dataset.id);
  if (e.target.closest(".expand-btn")) return showImageModal(p.imageUrl, p.name);
  if (e.target.closest(".love-btn")) {
    if (!getToken()) return needLogin("Please login to save items");
    try {
      const r = await api(`/products/${p._id}/love`, { method: "POST" });
      wish = new Set(r.wishlist); p.loves = r.loves; toast(r.loved ? "Saved to your wishlist" : "Removed from wishlist"); render();
    } catch (err) { toast(err.message); }
    return;
  }
  if (e.target.closest(".add-to-cart")) {
    const multi = (p.colors || []).length > 1 || (p.sizes || []).length > 1;
    if (!multi) return addToCart(p, { color: (p.colors[0] || {}).name || "", size: p.sizes[0] || "" });
  }
  fetch(`${API}/products/${p._id}/click`, { method: "PUT", keepalive: true }).catch(() => {});
  location.href = `product.html?id=${p._id}`;
});

$$(".category").forEach((c) => c.addEventListener("click", () => { cat = c.dataset.filter; render(); }));
note.addEventListener("click", (e) => { if (e.target.id === "clear-f") { cat = "All"; query = ""; const i = $("#search-input"); if (i) i.value = ""; history.replaceState(null, "", "index.html"); render(); } });
window.onSearch = (v) => { query = v; render(); if (v) $("#products-section").scrollIntoView({ behavior: "smooth" }); };

function showImageModal(src, name) {
  let m = $("#image-modal");
  if (!m) {
    m = document.createElement("div"); m.id = "image-modal";
    m.innerHTML = `<div><img id="modal-img" alt=""><p id="modal-title"></p></div>`;
    m.onclick = () => (m.style.display = "none"); document.body.appendChild(m);
  }
  $("#modal-img").src = src; $("#modal-title").textContent = name; m.style.display = "flex";
}

$("#newsletter-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("#nl-msg");
  try { const r = await api("/newsletter", { method: "POST", body: { email: e.target.email.value } }); msg.style.color = "#2a7d4f"; msg.textContent = r.message; e.target.reset(); }
  catch (err) { msg.style.color = "#e63946"; msg.textContent = err.message; }
});

init();
