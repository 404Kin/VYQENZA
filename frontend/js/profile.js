const body = $("#tab-body");
let me = null;

async function init() {
  if (!getToken()) return needLogin("Please login to see your profile");
  try { me = await api("/auth/me"); }
  catch (err) { return err.status === 401 ? needLogin("Please login again") : (body.innerHTML = `<p class="msg-err">${esc(err.message)}</p>`); }
  localStorage.setItem("user", JSON.stringify({ id: me.id, name: me.name, email: me.email, isAdmin: me.isAdmin }));
  $("#p-avatar").textContent = me.name.charAt(0).toUpperCase();
  $("#p-name").textContent = me.name; $("#p-email").textContent = me.email;
  $("#p-since").textContent = "Member since " + fmtDate(me.createdAt);
  if (me.isAdmin) $("#p-admin").style.display = "inline-block";
  $("#p-logout").onclick = logout;
  show();
}

async function show() {
  const t = ["orders", "saved", "account"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "orders";
  $$(".tabs a").forEach((a) => a.classList.toggle("on", a.dataset.t === t));
  body.innerHTML = `<p class="msg-empty">Loading...</p>`;
  try { await ({ orders, saved, account })[t](); } catch (err) { body.innerHTML = `<p class="msg-err">${esc(err.message)}</p>`; }
}
window.addEventListener("hashchange", () => me && show());

async function orders() {
  const list = await api("/orders/myorders");
  body.innerHTML = list.length ? list.map((o) => `<div class="order-card">
    <div class="order-head"><div><b>Order #${String(o._id).slice(-6).toUpperCase()}</b><div class="note">${fmtDate(o.createdAt)}${o.shipping && o.shipping.city ? " &middot; " + esc(o.shipping.city) : ""}</div></div><span class="badge ${esc(o.status)}">${esc(o.status)}</span></div>
    ${(o.orderItems || []).map((i) => `<div class="cart-item"><div class="cart-item-img"><img src="${esc(i.imageUrl || "")}" alt=""></div><div class="cart-item-details">
      <div class="cart-item-title">${esc(i.name)}</div><div class="cart-item-meta">${[i.color, i.size].filter(Boolean).map(esc).join(" / ")}</div>
      <div class="cart-item-price">${money(i.price)} &times; ${i.quantity}</div></div></div>`).join("")}
    <div class="order-head"><b>Total: ${money(o.totalPrice)}</b>${o.status === "Pending" ? `<button class="cart-item-remove" data-cancel="${o._id}">Cancel order</button>` : ""}</div></div>`).join("")
    : `<p class="msg-empty">You have no orders yet. <a href="index.html" style="color:#000;text-decoration:underline">Start shopping</a></p>`;
}

async function saved() {
  const ids = new Set((await api("/auth/me")).wishlist), list = (await api("/products")).filter((p) => ids.has(p._id));
  body.innerHTML = list.length ? `<div class="saved-grid">${list.map((p) => `<a class="saved-item" href="product.html?id=${p._id}"><img src="${esc(p.imageUrl)}" alt=""><b>${esc(p.name)}</b><span>${money(p.price)}</span></a>`).join("")}</div>`
    : `<p class="msg-empty">Nothing saved yet. Tap the heart on a product to save it.</p>`;
}

function account() {
  body.innerHTML = `<form class="stack-form" id="f-name"><h3>Your details</h3><input name="name" value="${esc(me.name)}" required><input value="${esc(me.email)}" disabled><button class="btn-dark">Save name</button></form>
    <form class="stack-form" id="f-pass" style="margin-top:35px"><h3>Change password</h3><input type="password" name="current" placeholder="Current password" required><input type="password" name="password" placeholder="New password (min 6 characters)" required><button class="btn-dark">Update password</button></form>`;
}

body.addEventListener("submit", async (e) => {
  e.preventDefault(); const f = e.target;
  try {
    if (f.id === "f-name") { const u = await api("/auth/me", { method: "PUT", body: { name: f.name.value } }); me.name = u.name; localStorage.setItem("user", JSON.stringify(u)); $("#p-name").textContent = u.name; $("#p-avatar").textContent = u.name[0].toUpperCase(); toast("Name updated"); }
    else { const r = await api("/auth/password", { method: "PUT", body: { current: f.current.value, password: f.password.value } }); toast(r.message); f.reset(); }
  } catch (err) { toast(err.message); }
});
body.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-cancel]"); if (!b || !confirm("Cancel this order?")) return;
  try { await api(`/orders/${b.dataset.cancel}/cancel`, { method: "PUT" }); toast("Order cancelled"); show(); } catch (err) { toast(err.message); }
});
init();
