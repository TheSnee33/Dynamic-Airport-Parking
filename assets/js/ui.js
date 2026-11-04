export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function say(el, kind, text) {
  if (!el) return;
  el.className = "msg show " + kind;
  el.textContent = text;
}
export function clear(el) { if (el) { el.className = "msg"; el.textContent = ""; } }

export function fmtDate(v) {
  if (!v) return "";
  const d = v?.toDate ? v.toDate() : new Date(v);
  if (isNaN(d)) return "";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// Shown on account pages while FIREBASE_CONFIG is still null.
export function notConfigured(container) {
  container.innerHTML = `<div class="notice warn"><strong>Accounts aren't switched on yet.</strong>
    Add the Firebase web-app config to <code>assets/js/config.js</code> (see the README), then this page goes live.</div>`;
}

export function friendlyAuthError(e) {
  const c = (e && e.code) || "";
  const map = {
    "auth/email-already-in-use": "That email already has an account. Try logging in instead.",
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/weak-password": "Pick a stronger password (at least 8 characters).",
    "auth/user-not-found": "Email or password didn't match.",
    "auth/wrong-password": "Email or password didn't match.",
    "auth/invalid-credential": "Email or password didn't match.",
    "auth/too-many-requests": "Too many tries. Wait a few minutes or reset your password.",
    "auth/network-request-failed": "Network problem. Check your connection and try again.",
    "permission-denied": "That wasn't allowed. Please log in again."
  };
  return map[c] || "Something went wrong. Please try again.";
}
