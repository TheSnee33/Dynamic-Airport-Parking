import { enabled, fb } from "./firebase.js";
import { requireUser, logout, resendVerification } from "./auth.js";
import { openPay } from "./pay.js";
import { esc, say, notConfigured, fmtDate } from "./ui.js";
import { usd } from "./quote.js";

const $ = (id) => document.getElementById(id);
const msg = $("msg");

if (!enabled()) {
  notConfigured($("unconfigured"));
} else {
  init().catch((e) => { console.error(e); say(msg, "err", "Couldn't load your account. Please refresh."); });
}

async function init() {
  const user = await requireUser();
  if (!user) return;
  const { db, F } = await fb();
  $("app").style.display = "";

  // ── profile ──
  const cref = F.doc(db, "customers", user.uid);
  const snap = await F.getDoc(cref);
  const c = snap.exists() ? snap.data() : { name: user.displayName || "", phone: "", smsOk: false };
  $("hello").textContent = c.name ? `Hi, ${c.name.split(" ")[0]}` : "My account";
  $("p-name").value = c.name || ""; $("p-phone").value = c.phone || ""; $("p-email").value = user.email || "";
  $("p-sms").checked = !!c.smsOk;
  const vf = $("verify");
  if (user.emailVerified) vf.innerHTML = "✓ Email verified";
  else { vf.innerHTML = `Email not verified yet. <button type="button" class="link-btn" id="resend">Resend Link</button>`;
    $("resend").onclick = async () => { try { await resendVerification(); say(msg, "ok", "Verification email sent."); } catch { say(msg, "err", "Couldn't send that right now."); } }; }

  $("profile").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const edits = { name: $("p-name").value.trim(), phone: $("p-phone").value.trim(), smsOk: $("p-sms").checked };
      if (snap.exists()) await F.updateDoc(cref, edits);
      else await F.setDoc(cref, { ...edits, email: (user.email || "").toLowerCase(), createdAt: F.serverTimestamp() });
      say(msg, "ok", "Profile saved.");
    } catch (err) { console.error(err); say(msg, "err", "Couldn't save your profile."); }
  });

  $("signout").onclick = async () => { await logout(); location.href = "index.html"; };

  // ── vehicles ──
  const vcol = F.collection(db, "customers", user.uid, "vehicles");
  async function loadVehicles() {
    const s = await F.getDocs(vcol);
    const box = $("vehicles");
    if (s.empty) { box.innerHTML = `<div class="muted">No saved vehicles yet.</div>`; return; }
    box.innerHTML = s.docs.map((d) => { const v = d.data();
      return `<div class="veh"><div><b>${esc(v.year)} ${esc(v.make)} ${esc(v.model)}</b><div class="muted" style="font-size:.85rem">${esc(v.color || "")} ${v.color ? "·" : ""} ${esc(v.plate)}</div></div><button class="link-btn" data-del="${d.id}">Remove</button></div>`; }).join("");
    box.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => { await F.deleteDoc(F.doc(vcol, b.dataset.del)); loadVehicles(); });
  }
  $("veh-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await F.addDoc(vcol, { year: $("v-year").value.trim(), make: $("v-make").value.trim(), model: $("v-model").value.trim(), color: $("v-color").value.trim(), plate: $("v-plate").value.trim().toUpperCase() });
      e.target.reset(); loadVehicles();
    } catch (err) { console.error(err); say(msg, "err", "Couldn't add that vehicle."); }
  });
  loadVehicles();

  // ── reservations ──
  const rcol = F.collection(db, "reservations");
  async function loadReservations() {
    const s = await F.getDocs(F.query(rcol, F.where("uid", "==", user.uid)));
    const rows = s.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    const box = $("reservations");
    if (!rows.length) { box.innerHTML = `<div class="empty">No bookings yet.<br><a class="btn small" style="margin-top:14px" href="reserve.html">Book Your First Stay</a></div>`; return; }
    box.innerHTML = rows.map((r) => {
      const paid = r.paymentStatus === "paid";
      const cancelled = r.status === "cancelled" || r.status === "cancel_requested";
      const sBadge = { requested: ["warn", "Awaiting confirmation"], confirmed: ["ok", "Confirmed"], cancel_requested: ["bad", "Cancel requested"], cancelled: ["bad", "Cancelled"], completed: ["", "Completed"] }[r.status] || ["", r.status];
      const v = r.vehicle || {};
      return `<div class="res">
        <div class="res-top"><h4>${esc(v.year)} ${esc(v.make)} ${esc(v.model)}</h4>
          <div><span class="badge ${sBadge[0]}">${esc(sBadge[1])}</span> <span class="badge ${paid ? "ok" : "warn"}">${paid ? "Paid" : "Unpaid"}</span></div></div>
        <div class="meta">Drop-off ${esc(fmtDate(r.dropOff))}<br>Return ${esc(fmtDate(r.pickup))} · ${esc(r.days)} day${r.days === 1 ? "" : "s"}${r.quotedTotal != null ? " · est. " + usd(r.quotedTotal) : ""}</div>
        <div class="actions">
          ${!paid && !cancelled ? `<button class="btn small" data-pay="${r.id}" data-label="${esc((v.year || "") + " " + (v.make || "") + " " + (v.model || ""))}">Pay Now</button>` : ""}
          ${!cancelled && r.status !== "completed" ? `<button class="btn small ghost" data-cancel="${r.id}">Request Cancellation</button>` : ""}
        </div></div>`;
    }).join("");
    box.querySelectorAll("[data-pay]").forEach((b) => b.onclick = () => openPay({ reservationId: b.dataset.pay, label: b.dataset.label, onPaid: loadReservations }));
    box.querySelectorAll("[data-cancel]").forEach((b) => b.onclick = async () => {
      if (!confirm("Request cancellation of this booking? We'll follow up with you.")) return;
      try { await F.updateDoc(F.doc(rcol, b.dataset.cancel), { status: "cancel_requested" }); loadReservations(); }
      catch (err) { console.error(err); say(msg, "err", "Couldn't send that request. Please call us."); }
    });
    return rows;
  }
  const rows = await loadReservations();

  const params = new URLSearchParams(location.search);
  if (params.get("paid")) say(msg, "ok", "Thanks! Your payment is being confirmed.");
  const pay = params.get("pay");
  if (pay && rows?.some((r) => r.id === pay)) {
    const r = rows.find((x) => x.id === pay), v = r.vehicle || {};
    openPay({ reservationId: pay, label: `${v.year || ""} ${v.make || ""} ${v.model || ""}`.trim(), onPaid: loadReservations });
  }
}
