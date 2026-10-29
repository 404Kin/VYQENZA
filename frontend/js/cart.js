const list = $("#cart-page-items"), form = $("#checkout-form"), page = $("#cart-page");

// refresh prices/stock from the database so the cart is never out of date
async function syncCart() {
  const cart = getCart(); if (!cart.length) return;
  try {
    const prods = await api("/products");
    const fresh = cart.map((i) => { const p = prods.find((x) => x._id === i._id); return p && p.stock > 0 ? { ...i, price: p.price, stock: p.stock, quantity: Math.min(i.quantity, p.stock) } : null; }).filter(Boolean);
    if (fresh.length !== cart.length) toast("Some items are no longer available and were removed");
    saveCart(fresh);
  } catch {}
}

function render() {
  const cart = getCart();
  list.innerHTML = cart.length ? cart.map((i, x) => cartLine(i, x, true)).join("")
    : `<p class="msg-empty">Your cart is empty. <a href="index.html" style="color:#000;text-decoration:underline">Continue shopping</a></p>`;
  $("#page-total").textContent = money(cart.reduce((s, i) => s + i.price * i.quantity, 0));
  form.style.display = cart.length ? "" : "none";
  $(".cart-total", page).style.display = cart.length ? "" : "none";
}
list.addEventListener("click", (e) => cartClick(e, render));

const u = getUser();
if (u) form.name.value = u.name;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!getToken()) return needLogin("Please login to place your order");
  const btn = $("#place-order-btn"); btn.disabled = true;
  try {
    const order = await api("/orders", { method: "POST", body: {
      items: getCart().map((i) => ({ product: i._id, quantity: i.quantity, color: i.color, size: i.size })),
      shipping: { name: form.name.value, phone: form.phone.value, address: form.address.value, city: form.city.value },
    } });
    saveCart([]);
    page.innerHTML = `<div class="order-done"><i class="fas fa-check-circle"></i><h3>Thank you for your order!</h3>
      <p>Order <b>#${order._id.slice(-6).toUpperCase()}</b> &middot; ${money(order.totalPrice)} &middot; Cash on Delivery</p>
      <p>We will call you on ${esc(order.shipping.phone)} to confirm delivery.</p>
      <a class="hero-btn" href="orders.html" style="margin-top:20px">View my orders</a></div>`;
  } catch (err) {
    btn.disabled = false;
    err.status === 401 ? needLogin("Please login to place your order") : toast(err.message);
  }
});

syncCart().then(render);
