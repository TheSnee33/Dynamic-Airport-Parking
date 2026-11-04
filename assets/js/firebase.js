// Lazy Firebase loader. Nothing downloads until a page actually needs it.
const VERSION = "10.14.1";
const BASE = `https://www.gstatic.com/firebasejs/${VERSION}/`;

export const enabled = () => !!window.FIREBASE_CONFIG;

let pending;
export function fb() {
  if (!enabled()) return Promise.reject(new Error("firebase-not-configured"));
  pending ||= (async () => {
    const [app, A, F, Fn] = await Promise.all([
      import(BASE + "firebase-app.js"),
      import(BASE + "firebase-auth.js"),
      import(BASE + "firebase-firestore.js"),
      import(BASE + "firebase-functions.js")
    ]);
    const a = app.initializeApp(window.FIREBASE_CONFIG);
    return { app: a, auth: A.getAuth(a), db: F.getFirestore(a), fns: Fn.getFunctions(a), A, F, Fn };
  })();
  return pending;
}

// Resolves with the signed-in user (or null) once Firebase has restored the session.
export async function currentUser() {
  const { auth, A } = await fb();
  return new Promise((resolve) => {
    const off = A.onAuthStateChanged(auth, (u) => { off(); resolve(u); });
  });
}
