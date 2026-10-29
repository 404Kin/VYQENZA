/* Floating support chat (messenger style). Saved in the database; instant bot answers, humans reply from the admin dashboard. */
(() => {
  const root = document.createElement("div");
  root.id = "chat";
  root.innerHTML = `
    <button id="chat-fab" aria-label="Chat with us"><i class="fas fa-comment-dots"></i><span id="chat-badge"></span></button>
    <div id="chat-box">
      <div class="chat-head"><div class="chat-av">V</div><div><b>VYQENZA Support</b><small>Ask anything. We reply here.</small></div><button id="chat-x" aria-label="Close">&times;</button></div>
      <div id="chat-msgs"></div>
      <div id="chat-quick"><button>Where is my order?</button><button>Delivery time</button><button>Return policy</button><button>Talk to a person</button></div>
      <form id="chat-form"><input id="chat-input" placeholder="Type a message..." maxlength="1000" autocomplete="off"><button aria-label="Send"><i class="fas fa-arrow-up"></i></button></form>
    </div>`;
  document.body.appendChild(root);
  const box = $("#chat-box"), msgs = $("#chat-msgs"), badge = $("#chat-badge");
  let open = false, count = -1, timer;
  const welcome = { from: "bot", text: "Hi! How can we help you today? Ask about orders, delivery, returns or sizes." };

  function draw(list) {
    const all = [welcome, ...list];
    msgs.innerHTML = all.map((m) => `<div class="cm ${m.from === "user" ? "me" : "them"}">${m.from === "admin" ? "<small>Support team</small>" : ""}${esc(m.text)}${m.at ? `<time>${new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>` : ""}</div>`).join("");
    msgs.scrollTop = msgs.scrollHeight;
    $("#chat-quick").style.display = list.length ? "none" : "flex";
  }
  async function poll() {
    try {
      const r = await api("/chat/me" + (open ? "?open=1" : ""));
      if (r.messages.length !== count) { count = r.messages.length; draw(r.messages); }
      badge.textContent = !open && r.unread ? r.unread : ""; badge.style.display = !open && r.unread ? "flex" : "none";
    } catch {}
    timer = setTimeout(poll, open ? 4000 : 20000);
  }
  async function send(text) {
    text = text.trim(); if (!text) return;
    const name = (getUser() || {}).name || "";
    msgs.insertAdjacentHTML("beforeend", `<div class="cm me">${esc(text)}</div>`); msgs.scrollTop = msgs.scrollHeight;
    try { const r = await api("/chat/me", { method: "POST", body: { text, name } }); count = r.messages.length; draw(r.messages); }
    catch (err) { toast(err.message); }
  }
  window.openChat = () => { open = true; box.classList.add("open"); root.classList.add("opened"); clearTimeout(timer); poll(); setTimeout(() => $("#chat-input").focus(), 100); };
  const close = () => { open = false; box.classList.remove("open"); root.classList.remove("opened"); };
  $("#chat-fab").onclick = () => (open ? close() : window.openChat());
  $("#chat-x").onclick = close;
  $("#chat-form").onsubmit = (e) => { e.preventDefault(); const i = $("#chat-input"); send(i.value); i.value = ""; };
  $("#chat-quick").onclick = (e) => { if (e.target.tagName === "BUTTON") send(e.target.textContent); };
  poll();
})();
