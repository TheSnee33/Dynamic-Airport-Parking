# Dynamic Airport Parking

Park at the shop, shuttle to PVU, service cars while customers are away. A service of Dynamic Collision Provo.

Static site (HTML/CSS/JS) on Firebase Hosting, with reservation requests saved to Firestore.

## Structure

| Page | Purpose |
|---|---|
| `index.html` | Home: pitch, 3 steps, price comparison vs airport lot |
| `how-it-works.html` | Reserve, drop-off, shuttle, pickup, services while away |
| `pricing.html` | Daily / weekly rates, what's included |
| `reserve.html` | Reservation form, writes to Firestore `reservations` |
| `faq.html` | Common questions |
| `contact.html` | Phone, email, address, hours |
| `terms.html` | Draft policy structure (needs insurance and licensing review) |
| `404.html` | Not found |

## One file holds every open question

`assets/js/config.js` mirrors the Launch Board. Fill in a value (price, capacity, shuttle details, phone, key policy...) and it appears everywhere. Anything still `null` renders as a yellow **TBD** so nothing unfinished goes live unnoticed.

## Firebase setup

1. Firebase console → project `dynamicairportparking` → Build → create a Firestore database.
2. Project settings → Your apps → add a Web app, copy the config into `FIREBASE_CONFIG` in `assets/js/config.js`.
3. Deploy:
   ```
   npm i -g firebase-tools
   firebase login
   firebase deploy
   ```
   `firestore.rules` only lets the public create a well-formed reservation. Nobody can read or change them from the web. View requests in the Firebase console.

Until `FIREBASE_CONFIG` is set, the reserve form tells visitors to call or email.

## Not built yet

- Text/email confirmation to customers (Cloud Function or extension, once the booking flow is settled)
- Admin view for Brandon (Firebase Auth + a small dashboard)
- Real photos, logo, and Google Business listing
- Final terms copy
