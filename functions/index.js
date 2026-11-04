// Payments backend. The browser never decides how much to charge: every amount is computed here
// from the reservation's dates and the prices in settings/pricing.
//
// Secrets (set once with `firebase functions:secrets:set NAME`):
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET
// Optional env: PAYPAL_ENV=live (default is sandbox)
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const PAYPAL_CLIENT_ID = defineSecret("PAYPAL_CLIENT_ID");
const PAYPAL_CLIENT_SECRET = defineSecret("PAYPAL_CLIENT_SECRET");

const DEFAULT_PRICING = { perDay: 8, perWeek: null };

// ── shared helpers ───────────────────────────────────────────────────────────────────────────
async function getPricing() {
  const s = await db.doc("settings/pricing").get();
  const d = s.exists ? s.data() : {};
  return { perDay: d.perDay ?? DEFAULT_PRICING.perDay, perWeek: d.perWeek ?? DEFAULT_PRICING.perWeek };
}

// Same rules as assets/js/quote.js. Returns dollars.
function computeTotal(dropOff, pickup, pricing) {
  const ms = pickup.toMillis() - dropOff.toMillis();
  if (!(ms > 0)) throw new HttpsError("failed-precondition", "Invalid booking dates.");
  const days = Math.max(1, Math.ceil(ms / 86400000));
  let total;
  if (pricing.perWeek != null) {
    const weeks = Math.floor(days / 7), rest = days % 7;
    total = weeks * pricing.perWeek + Math.min(rest * pricing.perDay, pricing.perWeek);
  } else {
    total = days * pricing.perDay;
  }
  return { days, cents: Math.round(total * 100) };
}

async function loadOwnedReservation(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Please log in.");
  const id = request.data && request.data.reservationId;
  if (typeof id !== "string" || !id) throw new HttpsError("invalid-argument", "Missing reservation.");
  const ref = db.doc(`reservations/${id}`);
  const snap = await ref.get();
  if (!snap.exists || snap.data().uid !== request.auth.uid) throw new HttpsError("not-found", "Booking not found.");
  const r = snap.data();
  if (["cancelled", "cancel_requested"].includes(r.status)) throw new HttpsError("failed-precondition", "This booking is cancelled.");
  return { ref, id, r };
}

async function markPaid({ reservationId, uid, provider, providerId, cents, method }) {
  const payRef = db.doc(`payments/${provider}_${providerId}`);   // idempotent: webhook + client can both report
  await db.runTransaction(async (tx) => {
    const exists = (await tx.get(payRef)).exists;
    if (exists) return;
    tx.set(payRef, { uid, reservationId, provider, providerId, amountCents: cents, method: method || null, status: "succeeded", createdAt: admin.firestore.FieldValue.serverTimestamp() });
    tx.update(db.doc(`reservations/${reservationId}`), { paymentStatus: "paid", paidAt: admin.firestore.FieldValue.serverTimestamp(), paidAmountCents: cents });
  });
}

// ── quote shown in the payment window ─────────────────────────────────────────────────────────
exports.getPaymentQuote = onCall(async (request) => {
  const { r } = await loadOwnedReservation(request);
  if (r.paymentStatus === "paid") return { alreadyPaid: true, amountCents: r.paidAmountCents || 0, days: r.days };
  const { days, cents } = computeTotal(r.dropOff, r.pickup, await getPricing());
  return { amountCents: cents, days, currency: "usd" };
});

// ── Stripe: card, Cash App Pay, and any other method switched on in the Stripe dashboard ───────
exports.createPaymentIntent = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  const { id, r } = await loadOwnedReservation(request);
  if (r.paymentStatus === "paid") throw new HttpsError("failed-precondition", "Already paid.");
  const { cents } = computeTotal(r.dropOff, r.pickup, await getPricing());
  const stripe = require("stripe")(STRIPE_SECRET_KEY.value());
  const pi = await stripe.paymentIntents.create({
    amount: cents,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    receipt_email: r.customerEmail || undefined,
    description: `Dynamic Airport Parking — ${r.vehicle?.year || ""} ${r.vehicle?.make || ""} ${r.vehicle?.model || ""}`.trim(),
    metadata: { reservationId: id, uid: request.auth.uid }
  }, { idempotencyKey: `pi_${id}_${cents}_${r.paymentAttempt || 0}` });
  return { clientSecret: pi.client_secret };
});

// Stripe tells us when money actually lands. Point the webhook at this function's URL and subscribe to
// payment_intent.succeeded.
exports.stripeWebhook = onRequest({ secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] }, async (req, res) => {
  const stripe = require("stripe")(STRIPE_SECRET_KEY.value());
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, req.headers["stripe-signature"], STRIPE_WEBHOOK_SECRET.value());
  } catch (e) {
    console.warn("Bad Stripe signature", e.message);
    return res.status(400).send("bad signature");
  }
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    const { reservationId, uid } = pi.metadata || {};
    if (reservationId && uid) {
      const method = pi.payment_method_types && pi.payment_method_types[0];
      await markPaid({ reservationId, uid, provider: "stripe", providerId: pi.id, cents: pi.amount_received, method });
    }
  }
  res.json({ received: true });
});

// ── PayPal + Venmo ────────────────────────────────────────────────────────────────────────────
const paypalBase = () => (process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");

async function paypalToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID.value()}:${PAYPAL_CLIENT_SECRET.value()}`).toString("base64");
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
  if (!res.ok) throw new HttpsError("internal", "PayPal sign-in failed.");
  return (await res.json()).access_token;
}

exports.createPayPalOrder = onCall({ secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET] }, async (request) => {
  const { id, r } = await loadOwnedReservation(request);
  if (r.paymentStatus === "paid") throw new HttpsError("failed-precondition", "Already paid.");
  const { cents } = computeTotal(r.dropOff, r.pickup, await getPricing());
  const token = await paypalToken();
  const res = await fetch(`${paypalBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ custom_id: id, description: "Dynamic Airport Parking", amount: { currency_code: "USD", value: (cents / 100).toFixed(2) } }]
    })
  });
  const order = await res.json();
  if (!res.ok) { console.error(order); throw new HttpsError("internal", "Couldn't start PayPal checkout."); }
  return { orderId: order.id };
});

exports.capturePayPalOrder = onCall({ secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET] }, async (request) => {
  const { id, r } = await loadOwnedReservation(request);
  const orderId = request.data && request.data.orderId;
  if (typeof orderId !== "string") throw new HttpsError("invalid-argument", "Missing order.");
  const { cents } = computeTotal(r.dropOff, r.pickup, await getPricing());
  const token = await paypalToken();
  const res = await fetch(`${paypalBase()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
  const cap = await res.json();
  if (!res.ok || cap.status !== "COMPLETED") { console.error(cap); throw new HttpsError("failed-precondition", "Payment didn't complete."); }
  const unit = cap.purchase_units && cap.purchase_units[0];
  const capture = unit && unit.payments && unit.payments.captures && unit.payments.captures[0];
  // Trust nothing from the browser: the captured order must be for THIS booking and the right amount.
  if (!capture || unit.custom_id !== id || Math.round(parseFloat(capture.amount.value) * 100) !== cents) {
    console.error("PayPal mismatch", { id, cents, unit });
    throw new HttpsError("failed-precondition", "Payment didn't match this booking. Please contact us.");
  }
  const source = cap.payment_source ? Object.keys(cap.payment_source)[0] : "paypal";   // 'paypal' or 'venmo' or 'card'
  await markPaid({ reservationId: id, uid: request.auth.uid, provider: "paypal", providerId: capture.id, cents, method: source });
  return { ok: true };
});
