// Single source of truth for every open question on the Launch Board.
// Fill a value in and it shows up everywhere on the site.
// Anything left as null renders as a highlighted "TBD" so nothing gets published by accident.
window.SITE = {
  name: "Dynamic Airport Parking",          // Launch Board: name for the service (confirm)
  parent: "Dynamic Collision Provo",
  parentUrl: "https://dynamiccollisionprovo.com",
  airport: "PVU (Provo Municipal Airport)",

  phone: null,            // e.g. "(801) 555-0123"
  email: null,
  address: null,          // shop / lot address
  hours: null,            // shop drop-off hours

  pricePerDay: 8,         // number
  pricePerWeek: null,     // number
  airportLotPerDay: 12,   // comparison figure from Brandon

  capacity: null,         // number of cars
  security: { fenced: null, lit: null, camera: null },  // true / false / null

  shuttle: { vehicle: null, hours: null, earlyLateFlights: null },

  booking: "form",        // "form" | "call" | "both"  (reservation form is built; call/text shows once phone is set)
  keysRequired: null,     // true / false
  servicesWhileAway: null,// e.g. "Detail, tire rotation" — site currently says no oil changes
  launchDate: null
};

// Firebase web-app config: Firebase console → Project settings → Your apps → Web app.
// Leave null until then; the reserve form falls back to call/email.
window.FIREBASE_CONFIG = null;
/* Example:
window.FIREBASE_CONFIG = {
  apiKey: "...", authDomain: "dynamicairportparking.firebaseapp.com",
  projectId: "dynamicairportparking", storageBucket: "dynamicairportparking.appspot.com",
  messagingSenderId: "...", appId: "..."
};
*/
