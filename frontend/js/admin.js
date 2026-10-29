const view = $("#adm-view"), modalEl = $("#adm-modal"), dlg = $("#adm-dialog-body");
const TABS = [["overview", "chart-pie", "Overview"], ["products", "box", "Products"], ["orders", "receipt", "Orders"], ["users", "users", "Users"], ["chats", "comments", "Chats"], ["reviews", "star", "Reviews"], ["subscribers", "envelope", "Subscribers"]];
const STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];
let chatTimer, me, rid = 0;
// every API call belongs to the tab that started it; if you switch tabs meanwhile, the old call is dropped instead of drawing over the new tab
const STALE = Symbol("stale");
const A = (path, opts) => { const my = rid; return api(path, opts).then((r) => { if (my !== rid) throw STALE; return r; }); };

const head = (title, tools = "") => `<div class="adm-head"><h1>${title}</h1><div class="tools">${tools}</div></div>`;
const openModal = (html) => { dlg.innerHTML = html; modalEl.classList.add("open"); };
const closeModal = () => modalEl.classList.remove("open");
$("#adm-x").onclick = closeModal;
modalEl.addEventListener("click", (e) => { if (e.target === modalEl) closeModal(); });
document.addEventListener("keydown", (e) => e.key === "Escape" && closeModal());
const run = async (fn) => { try { return await fn(); } catch (err) { if (err === STALE) return; if (err.status === 401) return location.replace("login.html?next=admin.html"); toast(err.message); } };

async function boot() {
  if (!getToken()) return location.replace("login.html?next=admin.html");
  try { me = await A("/auth/me"); }
  catch (err) { return err.status === 401 ? location.replace("login.html?next=admin.html") : (view.innerHTML = `<p class="empty">${esc(err.message)}</p>`); }
  if (!me.isAdmin) { view.innerHTML = `<div class="adm-card"><h3>Admins only</h3><p>Your account is not an admin. <a href="index.html" style="text-decoration:underline">Back to store</a></p></div>`; return; }
  $("#adm-nav").innerHTML = TABS.map(([k, i, n]) => `<a href="#${k}" data-k="${k}"><i class="fas fa-${i}"></i>${n}${k === "chats" ? '<span class="nbadge" id="nb" style="display:none"></span>' : ""}</a>`).join("");
  $("#adm-logout").onclick = (e) => { e.preventDefault(); logout(); };
  window.addEventListener("hashchange", route); route(); badge(); setInterval(badge, 15000);
}
async function badge() { try { const s = await A("/admin/stats"), b = $("#nb"); if (b) { b.textContent = s.unreadChats; b.style.display = s.unreadChats ? "inline" : "none"; } } catch {} }
function route() {
  const k = TABS.some((t) => t[0] === location.hash.slice(1)) ? location.hash.slice(1) : "overview";
  $$("#adm-nav a").forEach((a) => a.classList.toggle("on", a.dataset.k === k));
  rid++; clearInterval(chatTimer); view.innerHTML = `<p class="empty">Loading...</p>`;
  run(() => views[k]());
}

const views = { overview, products, orders, users, chats, reviews, subscribers };

/* ---------------- Overview ---------------- */
async function overview() {
  const s = await A("/admin/stats");
  const st = (l, v, w) => `<div class="stat${w ? " warn" : ""}"><small>${l}</small><b>${v}</b></div>`;
  view.innerHTML = head("Overview") + `<div class="stats">${st("Revenue", money(s.revenue))}${st("Orders", s.orders)}${st("Pending orders", s.pending, s.pending)}${st("Products", s.products)}${st("Low stock (5 or less)", s.lowStock, s.lowStock)}${st("Customers", s.users)}${st("Subscribers", s.subscribers)}${st("Unread chats", s.unreadChats, s.unreadChats)}</div>
  <div class="adm-card"><h3>Recent orders</h3><div class="tw"><table><tr><th>Order</th><th>Customer</th><th>Total</th><th>Date</th><th>Status</th></tr>
  ${s.recent.map((o) => `<tr><td>#${o._id.slice(-6).toUpperCase()}</td><td>${esc((o.shipping || {}).name)}</td><td>${money(o.totalPrice)}</td><td>${fmtDate(o.createdAt)}</td><td><span class="pill">${esc(o.status)}</span></td></tr>`).join("") || `<tr><td colspan="5" class="empty">No orders yet</td></tr>`}</table></div></div>
  <div class="adm-card"><h3>Most viewed products</h3><div class="tw"><table><tr><th></th><th>Product</th><th>Views (clicks)</th><th>Saved</th></tr>
  ${s.top.map((p) => `<tr><td><img class="th" src="${esc(p.imageUrl)}" alt=""></td><td>${esc(p.name)}</td><td>${p.clicks}</td><td>${p.loves}</td></tr>`).join("")}</table></div></div>`;
}

/* ---------------- Products ---------------- */
async function products() {
  let list = await A("/products");
  view.innerHTML = head("Products", `<input id="pq" placeholder="Search products..."><button class="b-dark" id="padd">+ Add product</button>`) + `<div class="adm-card"><div class="tw"><table id="ptbl"></table></div></div>`;
  const draw = () => {
    const q = $("#pq").value.toLowerCase(), rows = list.filter((p) => p.name.toLowerCase().includes(q));
    $("#ptbl").innerHTML = `<tr><th></th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Rating</th><th>Views / Saved</th><th></th></tr>` + (rows.map((p) => `<tr>
      <td><img class="th" src="${esc(p.imageUrl)}" alt=""></td><td><b>${esc(p.name)}</b><div class="sub">${(p.colors || []).map((c) => esc(c.name)).join(", ") || "no colours"} &middot; ${(p.sizes || []).join(", ") || "no sizes"}</div></td>
      <td>${esc(p.category)}</td><td>${money(p.price)}${p.oldPrice > p.price ? ` <s>${money(p.oldPrice)}</s>` : ""}</td><td class="${p.stock <= 5 ? "low" : ""}">${p.stock}</td>
      <td>${p.avgRating || "-"} (${p.numReviews})</td><td>${p.clicks} / ${p.loves}</td>
      <td class="acts"><button class="b-line b-sm" data-e="${p._id}">Edit</button><button class="b-del b-sm" data-d="${p._id}">Delete</button></td></tr>`).join("") || `<tr><td colspan="8" class="empty">No products</td></tr>`);
  };
  draw();
  $("#pq").oninput = draw;
  $("#padd").onclick = () => productForm(null, async () => { list = await A("/products"); draw(); });
  $("#ptbl").onclick = (e) => {
    const eb = e.target.closest("[data-e]"), db = e.target.closest("[data-d]");
    if (eb) productForm(list.find((p) => p._id === eb.dataset.e), async () => { list = await A("/products"); draw(); });
    if (db && confirm("Delete this product permanently?")) run(async () => { await A("/products/" + db.dataset.d, { method: "DELETE" }); list = list.filter((p) => p._id !== db.dataset.d); draw(); toast("Product deleted"); });
  };
}

const colorRow = (c = {}) => `<div class="crow"><input type="color" value="${esc(c.hex || "#111111")}"><input placeholder="Colour name (e.g. Black)" value="${esc(c.name || "")}"><input placeholder="Photo URL for this colour (optional)" value="${esc(c.imageUrl || "")}"><button type="button" class="b-del b-sm" data-rm>&times;</button></div>`;
function productForm(p, done) {
  const v = p || { category: "Men", colors: [{ name: "Black", hex: "#111111" }], sizes: ["S", "M", "L", "XL"], stock: 10 };
  openModal(`<h2 style="font-weight:400;margin-bottom:18px">${p ? "Edit product" : "Add product"}</h2>
  <form id="pform"><div class="fgrid">
    <div class="span2"><label>Name</label><input name="name" value="${esc(v.name || "")}" required></div>
    <div><label>Category</label><select name="category">${["Men", "Women", "Accessories"].map((c) => `<option${c === v.category ? " selected" : ""}>${c}</option>`).join("")}</select></div>
    <div><label>Stock</label><input name="stock" type="number" min="0" value="${v.stock ?? ""}" required></div>
    <div><label>Price (TK)</label><input name="price" type="number" min="0" step="0.01" value="${v.price ?? ""}" required></div>
    <div><label>Old price (optional, makes it a Sale item)</label><input name="oldPrice" type="number" min="0" step="0.01" value="${v.oldPrice || ""}"></div>
    <div class="span2"><label>Main image URL</label><input name="imageUrl" value="${esc(v.imageUrl || "")}" required><img class="imgprev" id="iprev" src="${esc(v.imageUrl || "")}" alt="" onerror="this.style.visibility='hidden'" onload="this.style.visibility='visible'"></div>
    <div class="span2"><label>Description</label><textarea name="description" rows="6" required>${esc(v.description || "")}</textarea></div>
  </div>
  <div class="f1"><label>Sizes (comma separated)</label><input name="sizes" value="${esc((v.sizes || []).join(", "))}" placeholder="S, M, L, XL"><div class="chips" style="margin-top:6px"><button type="button" data-sz="S, M, L, XL">S - XL</button><button type="button" data-sz="One Size">One Size</button><button type="button" data-sz="38, 39, 40, 41, 42, 43">Shoes 38-43</button></div></div>
  <div class="f1"><label>Colours</label><div id="crows">${(v.colors || []).map(colorRow).join("")}</div><button type="button" class="b-line b-sm" id="cadd">+ Add colour</button></div>
  <div style="margin-top:22px;display:flex;gap:10px;justify-content:flex-end"><button type="button" class="b-line" id="pcancel">Cancel</button><button class="b-dark">${p ? "Save changes" : "Add product"}</button></div></form>`);
  const f = $("#pform");
  f.imageUrl.oninput = () => ($("#iprev").src = f.imageUrl.value);
  $("#cadd").onclick = () => $("#crows").insertAdjacentHTML("beforeend", colorRow());
  $("#pcancel").onclick = closeModal;
  f.onclick = (e) => { const r = e.target.closest("[data-rm]"), z = e.target.closest("[data-sz]"); if (r) r.parentElement.remove(); if (z) f.sizes.value = z.dataset.sz; };
  f.onsubmit = (e) => {
    e.preventDefault();
    const colors = $$(".crow", f).map((r) => { const i = $$("input", r); return { hex: i[0].value, name: i[1].value.trim(), imageUrl: i[2].value.trim() }; }).filter((c) => c.name);
    if (new Set(colors.map((c) => c.name.toLowerCase())).size !== colors.length) return toast("Colour names must be different");
    const body = { name: f.name.value.trim(), category: f.category.value, stock: +f.stock.value, price: +f.price.value, oldPrice: +f.oldPrice.value || 0, imageUrl: f.imageUrl.value.trim(), description: f.description.value.trim(), sizes: f.sizes.value.split(",").map((s) => s.trim()).filter(Boolean), colors };
    run(async () => { await A(p ? "/products/" + p._id : "/products", { method: p ? "PUT" : "POST", body }); closeModal(); toast(p ? "Product updated" : "Product added"); await done(); });
  };
}

/* ---------------- Orders ---------------- */
async function orders() {
  const all = await A("/orders");
  view.innerHTML = head("Orders", `<select id="ofilter"><option value="">All statuses</option>${STATUSES.map((s) => `<option>${s}</option>`).join("")}</select>`) + `<div id="olist"></div>`;
  const draw = () => {
    const f = $("#ofilter").value, rows = all.filter((o) => !f || o.status === f);
    $("#olist").innerHTML = rows.map((o) => { const s = o.shipping || {}; return `<div class="ocard"><div class="ohead">
      <div><b>#${o._id.slice(-6).toUpperCase()}</b> <span class="sub">${fmtDate(o.createdAt)}</span><div style="margin-top:6px"><b>${esc(s.name)}</b> &middot; ${esc(s.phone)}<br><span class="sub">${esc(s.address)}, ${esc(s.city)}${o.user ? " &middot; " + esc(o.user.email) : ""}</span></div></div>
      <div style="text-align:right"><b style="font-size:18px">${money(o.totalPrice)}</b><br><select data-o="${o._id}" ${o.status === "Cancelled" ? "disabled" : ""} style="margin-top:6px">${STATUSES.map((x) => `<option${x === o.status ? " selected" : ""}>${x}</option>`).join("")}</select></div></div>
      <div class="oitems">${(o.orderItems || []).map((i) => `<div><img src="${esc(i.imageUrl || "")}" alt=""><span>${esc(i.name)} &middot; ${[i.color, i.size].filter(Boolean).map(esc).join(" / ")} &times; ${i.quantity} &middot; ${money(i.price)}</span></div>`).join("")}</div></div>`; }).join("") || `<p class="empty">No orders found</p>`;
  };
  draw(); $("#ofilter").onchange = draw;
  $("#olist").onchange = (e) => {
    const sel = e.target.closest("[data-o]"); if (!sel) return;
    const o = all.find((x) => x._id === sel.dataset.o);
    if (sel.value === "Cancelled" && !confirm("Cancel this order? Stock will be returned.")) return (sel.value = o.status);
    run(async () => { try { const u = await A(`/orders/${o._id}/status`, { method: "PUT", body: { status: sel.value } }); o.status = u.status; toast("Order marked " + u.status); } catch (err) { sel.value = o.status; throw err; } draw(); });
  };
}

/* ---------------- Users ---------------- */
async function users() {
  const list = await A("/admin/users");
  view.innerHTML = head(`Users <small style="color:#888;font-size:15px">(${list.length})</small>`) + `<div class="adm-card"><div class="tw"><table id="utbl"></table></div></div>`;
  const draw = () => ($("#utbl").innerHTML = `<tr><th>Name</th><th>Email</th><th>Joined</th><th>Role</th><th></th></tr>` + list.map((u) => `<tr><td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td><td>${fmtDate(u.createdAt)}</td>
    <td><span class="pill ${u.isAdmin ? "dark" : ""}">${u.isAdmin ? "Admin" : "Customer"}</span></td>
    <td class="acts">${u._id === me.id ? '<span class="sub">You</span>' : `<button class="b-line b-sm" data-r="${u._id}">${u.isAdmin ? "Remove admin" : "Make admin"}</button><button class="b-del b-sm" data-x="${u._id}">Delete</button>`}</td></tr>`).join(""));
  draw();
  $("#utbl").onclick = (e) => {
    const r = e.target.closest("[data-r]"), x = e.target.closest("[data-x]");
    if (r) { const u = list.find((y) => y._id === r.dataset.r); if (confirm(`${u.isAdmin ? "Remove admin access from" : "Give admin access to"} ${u.name}?`)) run(async () => { const n = await A("/admin/users/" + u._id, { method: "PUT", body: { isAdmin: !u.isAdmin } }); u.isAdmin = n.isAdmin; draw(); toast("Role updated"); }); }
    if (x) { const u = list.find((y) => y._id === x.dataset.x); if (confirm(`Delete ${u.name}'s account? Their past orders stay in the database.`)) run(async () => { await A("/admin/users/" + u._id, { method: "DELETE" }); list.splice(list.indexOf(u), 1); draw(); toast("User deleted"); }); }
  };
}

/* ---------------- Chats (messenger style) ---------------- */
async function chats() {
  view.innerHTML = head("Customer chats") + `<div class="adm-chat"><div id="c-list"></div><div id="c-pane"><p class="empty" style="margin:auto">Select a conversation</p></div></div>`;
  let cur = null, shown = 0;
  const list = async () => {
    const l = await A("/chat/admin/list");
    $("#c-list").innerHTML = l.map((c) => `<div class="citem${c._id === cur ? " on" : ""}" data-id="${c._id}"><b>${esc(c.name)}${c.unread ? `<span class="nbadge">${c.unread}</span>` : ""}</b><span>${esc(c.last)}</span></div>`).join("") || `<p class="empty">No conversations yet</p>`;
  };
  const pane = async (id, force) => {
    const c = await A("/chat/admin/" + id);
    if (!force && c.messages.length === shown) return; shown = c.messages.length;
    if (!$("#c-form")) { $("#c-pane").innerHTML = `<div class="c-top"><div><b id="c-name"></b><div class="sub" id="c-mail"></div></div><button class="b-del b-sm" id="c-del">Delete chat</button></div><div class="c-msgs" id="c-msgs"></div><form class="c-form" id="c-form"><input id="c-in" placeholder="Type a reply..." autocomplete="off"><button class="b-dark">Send</button></form>`; }
    $("#c-name").textContent = c.name; $("#c-mail").textContent = c.email || "Guest visitor";
    $("#c-msgs").innerHTML = c.messages.map((m) => `<div class="cb ${m.from}">${esc(m.text)}<time>${m.from === "bot" ? "Auto reply &middot; " : ""}${new Date(m.at).toLocaleString()}</time></div>`).join("");
    $("#c-msgs").scrollTop = 1e9;
  };
  $("#c-list").onclick = (e) => { const i = e.target.closest("[data-id]"); if (i) { cur = i.dataset.id; $("#c-pane").innerHTML = ""; run(async () => { await pane(cur, true); await list(); badge(); }); } };
  $("#c-pane").onsubmit = (e) => { e.preventDefault(); const t = $("#c-in").value.trim(); if (!t) return; $("#c-in").value = ""; run(async () => { await A(`/chat/admin/${cur}/reply`, { method: "POST", body: { text: t } }); await pane(cur, true); list(); }); };
  $("#c-pane").onclick = (e) => { if (e.target.id === "c-del" && confirm("Delete this conversation?")) run(async () => { await A("/chat/admin/" + cur, { method: "DELETE" }); cur = null; $("#c-pane").innerHTML = `<p class="empty" style="margin:auto">Select a conversation</p>`; list(); }); };
  await list();
  chatTimer = setInterval(() => run(async () => { await list(); if (cur) await pane(cur); badge(); }), 5000);
}

/* ---------------- Reviews / Subscribers ---------------- */
async function reviews() {
  const l = await A("/admin/reviews");
  view.innerHTML = head("Reviews") + `<div class="adm-card"><div class="tw"><table id="rtbl"></table></div></div>`;
  const draw = () => ($("#rtbl").innerHTML = `<tr><th>Product</th><th>Customer</th><th>Rating</th><th>Review</th><th>Date</th><th></th></tr>` + (l.map((r) => `<tr><td>${esc(r.product)}</td><td>${esc(r.name)}</td><td style="color:#f1c40f;white-space:nowrap">${stars(r.rating)}</td><td>${esc(r.comment)}</td><td>${fmtDate(r.createdAt)}</td><td><button class="b-del b-sm" data-id="${r._id}" data-p="${r.productId}">Delete</button></td></tr>`).join("") || `<tr><td colspan="6" class="empty">No reviews yet</td></tr>`));
  draw();
  $("#rtbl").onclick = (e) => { const b = e.target.closest("[data-id]"); if (b && confirm("Delete this review?")) run(async () => { await A(`/admin/reviews/${b.dataset.p}/${b.dataset.id}`, { method: "DELETE" }); l.splice(l.findIndex((r) => r._id === b.dataset.id), 1); draw(); toast("Review deleted"); }); };
}
async function subscribers() {
  const l = await A("/admin/subscribers");
  view.innerHTML = head(`Subscribers <small style="color:#888;font-size:15px">(${l.length})</small>`, `<button class="b-line" id="scopy">Copy all emails</button>`) + `<div class="adm-card"><div class="tw"><table id="stbl"></table></div></div>`;
  const draw = () => ($("#stbl").innerHTML = `<tr><th>Email</th><th>Subscribed</th><th></th></tr>` + (l.map((s) => `<tr><td>${esc(s.email)}</td><td>${fmtDate(s.createdAt)}</td><td><button class="b-del b-sm" data-id="${s._id}">Remove</button></td></tr>`).join("") || `<tr><td colspan="3" class="empty">No subscribers yet</td></tr>`));
  draw();
  $("#scopy").onclick = () => navigator.clipboard.writeText(l.map((s) => s.email).join(", ")).then(() => toast("Emails copied"), () => toast("Could not copy"));
  $("#stbl").onclick = (e) => { const b = e.target.closest("[data-id]"); if (b && confirm("Remove this subscriber?")) run(async () => { await A("/admin/subscribers/" + b.dataset.id, { method: "DELETE" }); l.splice(l.findIndex((s) => s._id === b.dataset.id), 1); draw(); });};
}

boot();
