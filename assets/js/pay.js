// Floating payment window. Card details never touch our code:
//  • Card / Cash App Pay → Stripe Payment Element (Stripe-hosted iframe)
//  • PayPal / Venmo      → PayPal Smart Buttons (PayPal-hosted)
// The amount is always computed on the server (Cloud Functions), not in the browser.
import { fb } from "./firebase.js";
import { usd } from "./quote.js";

const P = () => window.PAYMENTS || {};
let backdrop, state;

function loadScript(src) {
  return new Promise((res, rej) => {
    if ([...document.scripts].some((s) => s.src === src)) return res();
    const s = document.createElement("script");
    s.src = src; s.async = true; s.onload = res; s.onerror = () => rej(new Error("Could not load " + src));
    document.head.appendChild(s);
  });
}

function build() {
  if (backdrop) return;
  backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="pay-title">
    <div class="modal-head">
      <div><h3 id="pay-title">Pay for your stay</h3><div class="muted" id="pay-sub"></div></div>
      <button class="modal-x" type="button" aria-label="Close">✕</button>
    </div>
    <div class="modal-body">
      <div class="amount-box"><span class="muted" id="pay-days"></span><b id="pay-amount">…</b></div>
      <div id="pay-msg" class="msg" role="status"></div>
      <div id="pay-main">
        <div class="tabs" role="tablist">
          <button class="tab" role="tab" data-tab="card" aria-selected="true">Card · Cash App</button>
          <button class="tab" role="tab" data-tab="paypal" aria-selected="false">PayPal · Venmo</button>
        </div>
        <div class="pay-pane show" data-pane="card">
          <div id="stripe-el"></div>
          <button class="btn block" id="stripe-pay" type="button" style="margin-top:16px" disabled>Pay</button>
        </div>
        <div class="pay-pane" data-pane="paypal"><div id="paypal-el"></div></div>
        <div class="secure">🔒 Payments are handled by Stripe and PayPal. We never see or store your card number.</div>
      </div>
      <div id="pay-done" style="display:none;text-align:center;padding:14px 0">
        <div style="font-size:3rem">✅</div><h3>Payment received</h3>
        <p class="muted" id="pay-done-text">Thanks! We'll confirm your stay by text or email.</p>
        <button class="btn" type="button" id="pay-close2">Done</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(backdrop);
  backdrop.addEventListener("mousedown", (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector(".modal-x").addEventListener("click", close);
  backdrop.querySelector("#pay-close2").addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && backdrop.classList.contains("open")) close(); });
  backdrop.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => switchTab(t.dataset.tab)));
}

const $ = (sel) => backdrop.querySelector(sel);
function msg(kind, text) { const m = $("#pay-msg"); m.className = "msg show " + kind; m.textContent = text; }
function clearMsg() { const m = $("#pay-msg"); m.className = "msg"; m.textContent = ""; }

function close() {
  backdrop.classList.remove("open");
  document.body.style.overflow = "";
  state?.opener?.focus?.();
  const paid = state?.paid; const cb = state?.onPaid;
  state = null;
  if (paid && cb) cb();
}

function switchTab(name) {
  backdrop.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === name)));
  backdrop.querySelectorAll(".pay-pane").forEach((p) => p.classList.toggle("show", p.dataset.pane === name));
  if (name === "paypal") mountPayPal(); else mountStripe();
}

function done(text) {
  state.paid = true;
  $("#pay-main").style.display = "none";
  clearMsg();
  if (text) $("#pay-done-text").textContent = text;
  $("#pay-done").style.display = "block";
}

async function call(name, data) {
  const { fns, Fn } = await fb();
  return (await Fn.httpsCallable(fns, name)(data)).data;
}

// ── Stripe: card + Cash App Pay (+ whatever else is enabled in the Stripe dashboard) ─────────
async function mountStripe() {
  const el = $("#stripe-el"), btn = $("#stripe-pay");
  if (state.stripeReady) return;
  if (!P().stripePublishableKey) {
    el.innerHTML = `<div class="notice warn">Card and Cash App payments connect once the Stripe publishable key is added to <code>config.js</code>.</div>`;
    btn.style.display = "none";
    return;
  }
  el.innerHTML = `<div class="spinner"></div>`;
  try {
    await loadScript("https://js.stripe.com/v3/");
    const { clientSecret } = await call("createPaymentIntent", { reservationId: state.reservationId });
    const stripe = window.Stripe(P().stripePublishableKey);
    const elements = stripe.elements({
      clientSecret,
      appearance: { theme: "night", variables: { colorPrimary: "#dc2626", colorBackground: "#0d1117", colorText: "#e6edf3", borderRadius: "10px", fontFamily: "Inter, system-ui, sans-serif" } }
    });
    el.innerHTML = "";
    elements.create("payment", { layout: "tabs" }).mount(el);
    state.stripeReady = true;
    btn.disabled = false; btn.textContent = "Pay " + state.amountLabel;
    btn.onclick = async () => {
      btn.disabled = true; clearMsg(); btn.textContent = "Processing…";
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements, redirect: "if_required",
        confirmParams: { return_url: new URL("account.html?paid=1", location.href).href }
      });
      if (error) { msg("err", error.message || "That payment didn't go through."); btn.disabled = false; btn.textContent = "Pay " + state.amountLabel; return; }
      if (paymentIntent?.status === "succeeded") done();
      else done("Your payment is processing. We'll email you when it clears.");
    };
  } catch (e) {
    console.error(e);
    el.innerHTML = "";
    msg("err", "Couldn't start card payment. Please try again or use PayPal / Venmo.");
  }
}

// ── PayPal + Venmo ────────────────────────────────────────────────────────────────────────────
async function mountPayPal() {
  const el = $("#paypal-el");
  if (state.paypalReady) return;
  if (!P().paypalClientId) {
    el.innerHTML = `<div class="notice warn">PayPal and Venmo connect once the PayPal client ID is added to <code>config.js</code>.</div>`;
    return;
  }
  el.innerHTML = `<div class="spinner"></div>`;
  try {
    const cur = encodeURIComponent(P().currency || "USD");
    await loadScript(`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(P().paypalClientId)}&currency=${cur}&enable-funding=venmo&components=buttons`);
    el.innerHTML = "";
    window.paypal.Buttons({
      style: { layout: "vertical", color: "gold", shape: "pill", label: "pay" },
      createOrder: async () => (await call("createPayPalOrder", { reservationId: state.reservationId })).orderId,
      onApprove: async (data) => {
        try {
          await call("capturePayPalOrder", { orderId: data.orderID, reservationId: state.reservationId });
          done();
        } catch (e) { console.error(e); msg("err", "We couldn't finish that payment. You haven't been charged twice. Please contact us."); }
      },
      onError: (e) => { console.error(e); msg("err", "PayPal ran into a problem. Please try again."); }
    }).render(el);
    state.paypalReady = true;
  } catch (e) {
    console.error(e);
    el.innerHTML = "";
    msg("err", "Couldn't load PayPal. Please try card payment instead.");
  }
}

// ── public ────────────────────────────────────────────────────────────────────────────────────
export async function openPay({ reservationId, label = "", onPaid } = {}) {
  build();
  state = { reservationId, onPaid, opener: document.activeElement, paid: false, stripeReady: false, paypalReady: false, amountLabel: "" };
  $("#pay-main").style.display = ""; $("#pay-done").style.display = "none";
  $("#pay-sub").textContent = label; $("#pay-amount").textContent = "…"; $("#pay-days").textContent = "Total due";
  clearMsg();
  backdrop.classList.add("open");
  document.body.style.overflow = "hidden";
  backdrop.querySelector(".modal-x").focus();
  try {
    const q = await call("getPaymentQuote", { reservationId });
    if (q.alreadyPaid) { done("This stay is already paid. Thank you!"); return; }
    state.amountLabel = usd(q.amountCents / 100);
    $("#pay-amount").textContent = state.amountLabel;
    $("#pay-days").textContent = `${q.days} day${q.days === 1 ? "" : "s"} of parking · shuttle included`;
    switchTab("card");
  } catch (e) {
    console.error(e);
    $("#pay-main").style.display = "none";
    msg("err", "Couldn't load your total. Please close this window and try again.");
  }
}
