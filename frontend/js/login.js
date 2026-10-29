let isLogin = true;
const $t = $("#auth-title"), $b = $("#auth-submit");
const next = (() => { const n = new URLSearchParams(location.search).get("next") || ""; return /^[\w-]+\.html(\?[\w=&%.-]*)?$/.test(n) ? n : "index.html"; })();

$("#switch-btn").addEventListener("click", () => {
  isLogin = !isLogin;
  $t.textContent = $b.textContent = isLogin ? "Login" : "Register";
  $("#register-fields").style.display = isLogin ? "none" : "block";
  $("#switch-text").textContent = isLogin ? "Don't have an account?" : "Already have an account?";
  $("#switch-btn").textContent = isLogin ? "Register" : "Login";
});

async function submit() {
  const email = $("#email").value.trim(), password = $("#password").value, name = $("#name").value.trim();
  if (!email || !password) return toast("Please fill email and password");
  if (!isLogin && !name) return toast("Please enter your name");
  $b.disabled = true;
  try {
    const data = await api(isLogin ? "/auth/login" : "/auth/register", { method: "POST", body: isLogin ? { email, password } : { name, email, password } });
    localStorage.setItem("token", data.token); localStorage.setItem("user", JSON.stringify(data.user));
    toast(isLogin ? "Welcome back!" : "Account created!");
    const hasNext = new URLSearchParams(location.search).get("next");
    setTimeout(() => (location.href = data.user.isAdmin && !hasNext ? "admin.html" : next), 600);
  } catch (err) { toast(err.message); $b.disabled = false; }
}
$b.addEventListener("click", submit);
$$(".auth-container input").forEach((i) => i.addEventListener("keydown", (e) => e.key === "Enter" && submit()));
