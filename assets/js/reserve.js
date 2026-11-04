import { enabled, fb, currentUser } from "./firebase.js";
import { quote, usd, pricingFromSite } from "./quote.js";
import { openPay } from "./pay.js";
import { say, clear, notConfigured } from "./ui.js";

const $ = (id) => document.getElementById(id);
const msg = $("msg");

if (!enabled()) {
  notConfigured($("unconfigured"));
} else {
  init().catch((e) => { console.error(e); say(msg, "err", "Something went wrong loading this page."); $("formwrap").style.display = ""; });
}

async function init() {
  const user = await currentUser();
  if (!user) {
    const next = "?next=" + encodeURIComponent("reserve.html");
    $("gate-login").href = "login.html" + next; $("gate-register").href = "register.html" + next;
    $("gate").style.display = ""; return;
  }
  const { db, F } = await fb();
  $("formwrap").style.display = "";
  if (window.SITE.keysRequired === true) { $("keys").value = "yes"; $("keys-wrap").style.display = "none"; }
  if (window.SITE.keysRequired === false) { $("keys").value = "no"; $("keys-wrap").style.display = "none"; }

  // profile + saved vehicles
  const prof = (await F.getDoc(F.doc(db, "customers", user.uid))).data() || {};
  const vcol = F.collection(db, "customers", user.uid, "vehicles");
  const vs = (await F.getDocs(vcol)).docs.map((d) => ({ id: d.id, ...d.data() }));
  const pick = $("veh-pick");
  if (vs.length) {
    $("veh-pick-wrap").style.display = "";
    pick.innerHTML = vs.map((v) => `<option value="${v.id}">${v.year} ${v.make} ${v.model} · ${v.plate}</option>`).join("") + `<option value="new">+ A different vehicle</option>`;
    const sync = () => { $("veh-new").style.display = pick.value === "new" ? "" : "none"; };
    pick.onchange = sync; sync();
  }

  // pricing: admin-editable doc, falls back to config.js
  let pricing = pricingFromSite();
  try { const s = await F.getDoc(F.doc(db, "settings", "pricing")); if (s.exists()) pricing = { perDay: s.data().perDay ?? pricing.perDay, perWeek: s.data().perWeek ?? pricing.perWeek }; } catch (_) {}

  const upd = () => {
    const q = quote($("dropoff").value, $("pickup").value, pricing);
    $("quote-days").textContent = q.days ? `${q.days} day${q.days === 1 ? "" : "s"} · shuttle included` : "Choose your dates";
    $("quote-total").textContent = usd(q.total);
  };
  $("dropoff").addEventListener("input", upd); $("pickup").addEventListener("input", upd);
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  $("dropoff").min = now; $("pickup").min = now;

  let created;
  $("form").addEventListener("submit", async (e) => {
    e.preventDefault(); clear(msg);
    const q = quote($("dropoff").value, $("pickup").value, pricing);
    if (!$("dropoff").value || !$("pickup").value) return say(msg, "err", "Pick your drop-off and return times.");
    if (!q.days) return say(msg, "err", "Your return time has to be after your drop-off.");

    let vehicle;
    if (vs.length && pick.value !== "new") {
      const v = vs.find((x) => x.id === pick.value);
      vehicle = { year: v.year, make: v.make, model: v.model, color: v.color || "", plate: v.plate };
    } else {
      vehicle = { year: $("year").value.trim(), make: $("make").value.trim(), model: $("model").value.trim(), color: $("color").value.trim(), plate: $("plate").value.trim().toUpperCase() };
      if (!vehicle.year || !vehicle.make || !vehicle.model || !vehicle.plate) return say(msg, "err", "Add your vehicle's year, make, model and plate.");
    }

    const btn = $("go"); btn.disabled = true; btn.textContent = "Sending…";
    try {
      const ref = await F.addDoc(F.collection(db, "reservations"), {
        uid: user.uid,
        customerName: prof.name || user.displayName || "",
        customerPhone: prof.phone || "",
        customerEmail: user.email || "",
        vehicle,
        dropOff: F.Timestamp.fromDate(new Date($("dropoff").value)),
        pickup: F.Timestamp.fromDate(new Date($("pickup").value)),
        days: q.days,
        quotedTotal: q.total,
        flight: { airline: $("airline").value.trim(), outbound: $("outflight").value.trim(), returning: $("retflight").value.trim() },
        leavingKeys: $("keys").value === "yes",
        notes: $("notes").value.trim(),
        status: "requested",
        paymentStatus: "unpaid",
        createdAt: F.serverTimestamp()
      });
      if ((!vs.length || pick.value === "new") && $("save-veh").checked) {
        try { await F.addDoc(vcol, vehicle); } catch (_) {}
      }
      created = { id: ref.id, label: `${vehicle.year} ${vehicle.make} ${vehicle.model}` };
      $("formwrap").style.display = "none"; $("done").style.display = "";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      say(msg, "err", "We couldn't send your request. Please try again or call us.");
      btn.disabled = false; btn.textContent = "Request my booking";
    }
  });

  $("pay-now").addEventListener("click", () => created && openPay({ reservationId: created.id, label: created.label }));
}
