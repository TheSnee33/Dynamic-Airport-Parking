// Staff board: lists every reservation and lets approved staff update status + internal notes.
// Access is enforced by Firestore rules (verified email on the config/staff allowlist), not by this page.
import { enabled, fb } from "./firebase.js";
import { requireUser } from "./auth.js";
import { esc, say, notConfigured, fmtDate } from "./ui.js";
import { usd } from "./quote.js";

const $ = (id) => document.getElementById(id);
const msg = $("msg");
const STATUSES = [
  ["requested", "Awaiting confirmation"], ["confirmed", "Confirmed"], ["checked_in", "Car checked in"],
  ["picked_up", "Customer back, car released"], ["completed", "Completed"],
  ["cancel_requested", "Cancel requested"], ["cancelled", "Cancelled"]
];
const BADGE = { requested: "warn", confirmed: "ok", checked_in: "ok", picked_up: "", completed: "", cancel_requested: "bad", cancelled: "bad" };
let rows = [], filter = "active";

if (!enabled()) notConfigured($("unconfigured"));
else init().catch((e) => { console.error(e); say(msg, "err", "Couldn't load the board. Please refresh."); });

async function init() {
  const user = await requireUser();
  if (!user) return;
  const { db, F } = await fb();
  const col = F.collection(db, "reservations");
  const denied = (why) => { $("app").style.display = "none"; const d = $("denied"); d.style.display = ""; d.innerHTML = why; };

  async function load() {
    try {
      const s = await F.getDocs(F.query(col, F.orderBy("createdAt", "desc")));
      rows = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      $("app").style.display = ""; $("denied").style.display = "none";
      render();
    } catch (e) {
      if (e && e.code === "permission-denied") {
        denied(user.emailVerified
          ? `<strong>This account isn't on the staff list.</strong> You're signed in as ${esc(user.email)}. Ask Rick or Brandon to add that email.`
          : `<strong>Verify your email first.</strong> We sent a link to ${esc(user.email)} when you registered. Open it, then reload this page.`);
      } else { console.error(e); say(msg, "err", "Couldn't load reservations."); }
    }
  }

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  function visible() {
    const t0 = startOfDay(new Date()), t1 = new Date(t0.getTime() + 864e5);
    const when = (v) => (v?.toDate ? v.toDate() : new Date(v));
    return rows.filter((r) => {
      if (filter === "all") return true;
      if (filter === "review") return r.status === "requested" || r.status === "cancel_requested";
      if (filter === "today") { const a = when(r.dropOff), b = when(r.pickup); return (a >= t0 && a < t1) || (b >= t0 && b < t1); }
      return !["completed", "cancelled"].includes(r.status);
    }).sort((a, b) => filter === "all" ? 0 : when(a.dropOff) - when(b.dropOff));
  }

  function render() {
    const list = visible();
    $("count").textContent = `${list.length} shown · ${rows.length} total`;
    if (!list.length) { $("list").innerHTML = `<div class="empty">Nothing here.</div>`; return; }
    $("list").innerHTML = list.map((r) => {
      const v = r.vehicle || {}, paid = r.paymentStatus === "paid";
      const phone = String(r.customerPhone || "");
      return `<div class="res" data-id="${r.id}">
        <div class="res-top"><h4>${esc(v.year)} ${esc(v.make)} ${esc(v.model)} <span class="muted" style="font-weight:500">${esc(v.color || "")} ${v.plate ? "· " + esc(v.plate) : ""}</span></h4>
          <div><span class="badge ${BADGE[r.status] ?? ""}">${esc((STATUSES.find((s) => s[0] === r.status) || [0, r.status])[1])}</span> <span class="badge ${paid ? "ok" : "warn"}">${paid ? "Paid" : "Unpaid"}</span></div></div>
        <div class="meta"><b>${esc(r.customerName)}</b> · <a href="tel:${esc(phone.replace(/[^\d+]/g, ""))}">${esc(phone)}</a> · ${esc(r.customerEmail)}<br>
          Drop-off ${esc(fmtDate(r.dropOff))} → Return ${esc(fmtDate(r.pickup))} · ${esc(r.days)} day${r.days === 1 ? "" : "s"}${r.quotedTotal != null ? " · " + usd(r.quotedTotal) : ""}<br>
          ${r.flight ? "Flight: " + esc(r.flight) + " · " : ""}Keys: ${r.leavingKeys ? "<b>leaving keys</b>" : "keeping keys"}${r.notes ? `<br>Customer note: ${esc(r.notes)}` : ""}</div>
        <div class="staff-edit">
          <select data-status>${STATUSES.map(([k, t]) => `<option value="${k}"${k === r.status ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>
          <input data-note placeholder="Internal note (customers can't see this)" value="${esc(r.staffNote || "")}" maxlength="500">
          <button type="button" class="btn small" data-save>Save</button>
        </div></div>`;
    }).join("");
    $("list").querySelectorAll("[data-save]").forEach((b) => b.onclick = async () => {
      const el = b.closest(".res");
      b.disabled = true;
      try {
        await F.updateDoc(F.doc(col, el.dataset.id), {
          status: el.querySelector("[data-status]").value,
          staffNote: el.querySelector("[data-note]").value.trim(),
          updatedAt: F.serverTimestamp(), updatedBy: user.email
        });
        say(msg, "ok", "Saved."); await load();
      } catch (e) { console.error(e); say(msg, "err", "Couldn't save that change."); b.disabled = false; }
    });
  }

  $("filters").querySelectorAll("[data-f]").forEach((b) => b.onclick = () => {
    filter = b.dataset.f;
    $("filters").querySelectorAll("[data-f]").forEach((x) => x.classList.toggle("ghost", x !== b));
    render();
  });
  $("refresh").onclick = load;
  await load();
}
