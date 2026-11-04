// One place for every business detail, Firebase key and payment key.
// Anything left null shows as a yellow "TBD" on the page so nothing unfinished goes live unnoticed.
window.SITE = {
  name: "Dynamic Airport Parking",
  parent: "Dynamic Collision Repair",
  parentUrl: "https://dynamiccollisionprovo.com",
  airport: "PVU",
  airportLong: "Provo Municipal Airport (PVU)",

  phone: "(801) 377-7252",                         // from dynamiccollisionprovo.com
  email: null,
  address: "1671 S State St, Provo, UT 84606",     // from dynamiccollisionprovo.com
  hours: "Mon–Fri, 8 AM–5 PM",                     // SHOP hours. Confirm drop-off hours for parking.

  pricePerDay: 8,
  pricePerWeek: null,
  airportLotPerDay: 12,

  capacity: null,                                  // number of cars
  security: { fenced: null, lit: null, camera: null },

  shuttle: { vehicle: null, hours: null, earlyLateFlights: null },

  keysRequired: null,                              // true / false
  servicesWhileAway: null,                         // note: shop site says no oil changes
  launchDate: null
};

// Firebase web-app config. Firebase console → Project settings → Your apps → Web.
// While null, the site works as a brochure and account pages explain what's missing.
window.FIREBASE_CONFIG = null;
/*
window.FIREBASE_CONFIG = {
  apiKey: "...", authDomain: "dynamicairportparking.firebaseapp.com",
  projectId: "dynamicairportparking", storageBucket: "dynamicairportparking.appspot.com",
  messagingSenderId: "...", appId: "..."
};
*/

// Payment keys — PUBLIC keys only. Secret keys go in Firebase secrets (see README), never in this file.
window.PAYMENTS = {
  stripePublishableKey: null,   // pk_live_... / pk_test_...  → card, Cash App Pay (turn on in Stripe dashboard)
  paypalClientId: null,         // PayPal REST app client id   → PayPal + Venmo buttons
  currency: "USD"
};
