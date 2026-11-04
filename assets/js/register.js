import { enabled } from "./firebase.js";
import { register, nextUrl } from "./auth.js";
import { say, clear, notConfigured, friendlyAuthError } from "./ui.js";

const $ = (id) => document.getElementById(id);
const msg = $("msg");

// Keep the ?next= target when hopping between login and register.
const q = location.search;
if (q) $("to-login").href = "login.html" + q;

if (!enabled()) {
  notConfigured($("unconfigured"));
  $("card").style.display = "none";
} else {
  $("form").addEventListener("submit", async (e) => {
    e.preventDefault(); clear(msg);
    const name = $("name").value.trim(), phone = $("phone").value.trim(), email = $("email").value.trim();
    const pw = $("pw").value;
    if (name.length < 2) return say(msg, "err", "Please enter your full name.");
    if (phone.replace(/\D/g, "").length < 10) return say(msg, "err", "Please enter a phone number with area code.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return say(msg, "err", "That email address doesn't look right.");
    if (pw.length < 8) return say(msg, "err", "Password must be at least 8 characters.");
    if (pw !== $("pw2").value) return say(msg, "err", "The two passwords don't match.");
    if (!$("terms").checked) return say(msg, "err", "Please agree to the terms to continue.");

    const btn = $("go"); btn.disabled = true; btn.textContent = "Creating…";
    try {
      await register({ name, phone, email, password: pw, smsOk: $("sms").checked });
      location.href = nextUrl();
    } catch (err) {
      console.error(err);
      say(msg, "err", friendlyAuthError(err));
      btn.disabled = false; btn.textContent = "Create account";
    }
  });
}
