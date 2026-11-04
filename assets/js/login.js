import { enabled, currentUser } from "./firebase.js";
import { login, resetPassword, nextUrl } from "./auth.js";
import { say, clear, notConfigured, friendlyAuthError } from "./ui.js";

const $ = (id) => document.getElementById(id);
const msg = $("msg");
if (location.search) $("to-register").href = "register.html" + location.search;

if (!enabled()) {
  notConfigured($("unconfigured"));
  $("card").style.display = "none";
} else {
  currentUser().then((u) => { if (u) location.replace(nextUrl()); }).catch(() => {});

  $("form").addEventListener("submit", async (e) => {
    e.preventDefault(); clear(msg);
    const email = $("email").value.trim(), pw = $("pw").value;
    if (!email || !pw) return say(msg, "err", "Enter your email and password.");
    const btn = $("go"); btn.disabled = true; btn.textContent = "Logging in…";
    try {
      await login(email, pw);
      location.href = nextUrl();
    } catch (err) {
      console.error(err);
      say(msg, "err", friendlyAuthError(err));
      btn.disabled = false; btn.textContent = "Log in";
    }
  });

  $("forgot").addEventListener("click", async () => {
    clear(msg);
    const email = $("email").value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return say(msg, "err", "Type your email above first, then tap “Forgot your password?”");
    try {
      await resetPassword(email);
    } catch (err) { console.error(err); }
    // Same answer whether or not the email exists, so this can't be used to probe for accounts.
    say(msg, "ok", "If that email has an account, a reset link is on its way.");
  });
}
