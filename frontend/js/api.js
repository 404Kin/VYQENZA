/* Shared helpers + header/footer/mini-cart used on every page */
// Same server on localhost:5000 or when deployed -> "/api". Only Live Server (other local ports) needs the full URL.
const API = (["localhost", "127.0.0.1"].includes(location.hostname) && location.port && location.port !== "5000") ? "http://localhost:5000/api" : "/api";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => "TK" + Number(n || 0).toFixed(2);
const stars = (r) => [1, 2, 3, 4, 5].map((i) => `<i class="${r >= i ? "fas fa-star" : r >= i - 0.5 ? "fas fa-star-half-alt" : "far fa-star"}"></i>`).join("");
const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// Uploaded photos are saved as "/api/uploads/<id>". When the page runs on another origin (Live Server) they need the backend address in front.
const ORIGIN = API.replace(/\/api$/, ""), UP = "/api/uploads/";

function toast(msg) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), 2400);
}

/* ---- auth ---- */
function guestId() {
  let g = localStorage.getItem("guestId");
  if (!g) { g = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12)); localStorage.setItem("guestId", g); }
  return g;
}
const getToken = () => localStorage.getItem("token");
const getUser = () => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } };
function logout() { localStorage.removeItem("token"); localStorage.removeItem("user"); location.href = "index.html"; }
function needLogin(msg) {
  toast(msg || "Please login first");
  setTimeout(() => (location.href = "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search)), 900);
}

async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (getToken()) headers.Authorization = "Bearer " + getToken();
  headers["x-guest-id"] = guestId();
  let res;
  try { res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body, (k, v) => (k === "imageUrl" && ORIGIN && typeof v === "string" ? v.split(ORIGIN + UP).join(UP) : v)) : undefined }); }
  catch { throw new Error("Cannot reach the server. Is the backend running?"); }
  let data = {};
  try { data = JSON.parse(await res.text(), (k, v) => (k === "imageUrl" && typeof v === "string" && v.startsWith(UP) ? ORIGIN + v : v)); } catch {}
  if (!res.ok) {
    if (res.status === 401 && getToken()) { localStorage.removeItem("token"); localStorage.removeItem("user"); }
    throw Object.assign(new Error(data.message || "Something went wrong"), { status: res.status });
  }
  return data;
}

/* ---- cart (kept in the browser until checkout; the order itself is saved in the database) ---- */
const cartKey = (id, c, s) => `${id}|${c || ""}|${s || ""}`;
function getCart() { try { return (JSON.parse(localStorage.getItem("cart")) || []).filter((i) => i.key); } catch { return []; } }
function saveCart(cart) { localStorage.setItem("cart", JSON.stringify(cart)); updateCartCount(); renderMiniCart(); }
function updateCartCount() { const el = $(".cart-count"); if (el) el.textContent = getCart().reduce((s, i) => s + i.quantity, 0); }
function addToCart(p, { color = "", size = "", qty = 1 } = {}) {
  const cart = getCart(), key = cartKey(p._id, color, size), ex = cart.find((i) => i.key === key);
  if ((ex ? ex.quantity : 0) + qty > p.stock) { toast(p.stock > 0 ? `Only ${p.stock} in stock` : "Sold out"); return false; }
  const c = (p.colors || []).find((x) => x.name === color);
  if (ex) ex.quantity += qty;
  else cart.push({ key, _id: p._id, name: p.name, price: p.price, imageUrl: (c && c.imageUrl) || p.imageUrl, color, size, quantity: qty, stock: p.stock });
  saveCart(cart); toast("Added to cart"); return true;
}
function cartLine(i, idx, big) {
  return `<div class="cart-item"><div class="cart-item-img"${big ? ' style="width:90px;height:90px"' : ""}><img src="${esc(i.imageUrl)}" alt=""></div>
    <div class="cart-item-details"><div class="cart-item-title">${esc(i.name)}</div>
    <div class="cart-item-meta">${[i.color, i.size].filter(Boolean).map(esc).join(" / ")}</div>
    <div class="cart-item-price">${money(i.price)} &times; ${i.quantity} = ${money(i.price * i.quantity)}</div>
    <div class="ctl"><button data-i="${idx}" data-d="-1">&minus;</button><span>${i.quantity}</span><button data-i="${idx}" data-d="1">+</button>
    <button class="cart-item-remove" data-i="${idx}" data-d="0">Remove</button></div></div></div>`;
}
function cartClick(e, after) {
  const b = e.target.closest("button[data-i]"); if (!b) return;
  const cart = getCart(), i = +b.dataset.i, d = +b.dataset.d;
  if (!d) cart.splice(i, 1);
  else { const n = cart[i].quantity + d; if (n > cart[i].stock) return toast(`Only ${cart[i].stock} in stock`); n < 1 ? cart.splice(i, 1) : (cart[i].quantity = n); }
  saveCart(cart); if (after) after();
}
function renderMiniCart() {
  const box = $("#cart-items"); if (!box) return;
  const cart = getCart();
  box.innerHTML = cart.length ? cart.map((i, x) => cartLine(i, x)).join("") : `<p style="text-align:center;color:#777;padding:20px 0">Cart is empty</p>`;
  $("#cart-total").textContent = money(cart.reduce((s, i) => s + i.price * i.quantity, 0));
}

/* ---- header / footer ---- */
function buildLayout() {
  if (document.body.dataset.admin) return; // admin dashboard has its own layout
  const u = getUser();
  document.body.insertAdjacentHTML("afterbegin", `
  <header><div class="container"><div class="header-content">
    <a href="index.html" class="logo">VYQENZA</a>
    <div class="search-container" id="search-container"><input type="text" id="search-input" placeholder="Search products..." autocomplete="off"><i class="fas fa-times" id="close-search"></i></div>
    <nav><ul>
      <li><a href="index.html#products-section">Shop</a></li>
      <li><a href="index.html?cat=Sale#products-section">Sale</a></li>
      ${u ? '<li><a href="profile.html#orders">My Orders</a></li>' : ""}
      <li><a href="#" data-chat>Contact</a></li>
      ${u && u.isAdmin ? '<li><a href="admin.html">Admin</a></li>' : ""}
    </ul></nav>
    <div class="header-icons">
      <i class="fas fa-search" id="search-icon" title="Search"></i>
      <i class="far fa-heart" id="wish-icon" title="Saved items"></i>
      <i class="fas fa-user" id="user-icon" title="${u ? esc(u.name) : "Login"}"></i>
      ${u ? '<i class="fas fa-sign-out-alt" id="logout-icon" title="Logout"></i>' : ""}
      <div class="cart-icon"><i class="fas fa-shopping-bag" id="cart-icon"></i><span class="cart-count">0</span></div>
    </div></div></div></header>
  <div class="cart-modal" id="cart-modal"><div class="cart-header"><h3>Your Cart</h3><button class="close-cart" id="close-cart">&times;</button></div>
    <div class="cart-items" id="cart-items"></div>
    <div class="cart-total"><span>Total:</span><span id="cart-total">TK0.00</span></div>
    <button class="checkout-btn" onclick="location.href='cart.html'">Checkout</button></div>`);
  document.body.insertAdjacentHTML("beforeend", `
  <footer><div class="container"><div class="footer-links">
    <a href="info.html#about">About Us</a><a href="#" data-chat>Contact</a><a href="info.html#shipping">Shipping &amp; Returns</a></div>
    <p class="copyright">&copy; ${new Date().getFullYear()} VYQENZA. All rights reserved.</p></div></footer>`);

  const modal = $("#cart-modal"), search = $("#search-container"), input = $("#search-input"), nav = $("nav");
  $("#cart-icon").onclick = () => { modal.style.display = "block"; renderMiniCart(); };
  $("#close-cart").onclick = () => (modal.style.display = "none");
  $("#cart-items").onclick = (e) => cartClick(e);
  document.addEventListener("click", (e) => { const p = e.composedPath(); if (modal.style.display === "block" && !p.includes(modal) && !p.includes($("#cart-icon"))) modal.style.display = "none"; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") modal.style.display = "none"; });
  $("#user-icon").onclick = () => (location.href = u ? "profile.html" : "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search));
  $("#wish-icon").onclick = () => (location.href = "index.html?cat=Saved#products-section");
  if (u) $("#logout-icon").onclick = logout;
  const closeSearch = () => { search.classList.remove("active"); nav.style.display = ""; input.value = ""; window.onSearch && window.onSearch(""); };
  $("#search-icon").onclick = () => { if (search.classList.contains("active")) return closeSearch(); search.classList.add("active"); nav.style.display = "none"; input.focus(); };
  $("#close-search").onclick = closeSearch;
  input.addEventListener("input", () => window.onSearch && window.onSearch(input.value.trim()));
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !window.onSearch) location.href = "index.html?q=" + encodeURIComponent(input.value.trim()) + "#products-section"; });
  document.addEventListener("click", (e) => { if (e.target.closest("[data-chat]")) { e.preventDefault(); window.openChat && window.openChat(); } });
  if (!document.body.dataset.nochat) { const s = document.createElement("script"); s.src = "js/chat.js"; document.body.appendChild(s); }
  updateCartCount();
}
document.addEventListener("DOMContentLoaded", buildLayout);
