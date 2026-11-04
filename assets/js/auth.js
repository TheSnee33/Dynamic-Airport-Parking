// Customer accounts: Firebase Auth (email + password) plus a profile doc at customers/{uid}.
import { fb, currentUser } from "./firebase.js";

export async function register({ name, phone, email, password, smsOk }) {
  const { auth, db, A, F } = await fb();
  const cred = await A.createUserWithEmailAndPassword(auth, email, password);
  const user = cred.user;
  await A.updateProfile(user, { displayName: name });
  // Profile row — this is the "customer registered in the database" step.
  await F.setDoc(F.doc(db, "customers", user.uid), {
    name, phone, email: email.toLowerCase(), smsOk: !!smsOk,
    createdAt: F.serverTimestamp()
  });
  try { await A.sendEmailVerification(user); } catch (_) { /* non-fatal */ }
  return user;
}

export async function login(email, password) {
  const { auth, A } = await fb();
  return (await A.signInWithEmailAndPassword(auth, email, password)).user;
}

export async function logout() {
  const { auth, A } = await fb();
  await A.signOut(auth);
}

export async function resetPassword(email) {
  const { auth, A } = await fb();
  await A.sendPasswordResetEmail(auth, email);
}

export async function resendVerification() {
  const { auth, A } = await fb();
  if (auth.currentUser) await A.sendEmailVerification(auth.currentUser);
}

// Pages that need a login call this; it bounces to login.html?next=… when signed out.
export async function requireUser() {
  const u = await currentUser();
  if (!u) {
    const next = encodeURIComponent(location.pathname.split("/").pop() + location.search);
    location.replace("login.html?next=" + next);
    return null;
  }
  return u;
}

export function nextUrl(fallback = "account.html") {
  const n = new URLSearchParams(location.search).get("next");
  // Only same-site relative pages, never an absolute URL.
  return n && /^[a-z0-9\-_/]+\.html(\?.*)?$/i.test(n) ? n : fallback;
}
