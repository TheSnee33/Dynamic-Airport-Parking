// Reservation form → Firestore (collection: reservations).
// Until FIREBASE_CONFIG is set in config.js, the form tells people to call/email instead.
(function () {
  const form = document.getElementById("reserve-form");
  const msg = document.getElementById("form-msg");
  if (!form) return;

  const show = (cls, text) => { msg.className = "form-msg " + cls; msg.textContent = text; msg.scrollIntoView({ behavior: "smooth", block: "center" }); };

  // Keys question only matters if keys are required — hide the note when policy is "no".
  const S = window.SITE;
  const keysNote = document.getElementById("keys-note");
  if (keysNote && S.keysRequired === false) keysNote.style.display = "none";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!window.FIREBASE_CONFIG) {
      show("err", "Online booking isn't switched on yet. Please call or email us to reserve — details are on the Contact page.");
      return;
    }
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Sending…";
    try {
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js");
      const { getFirestore, collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
      const db = getFirestore(initializeApp(window.FIREBASE_CONFIG));
      const d = Object.fromEntries(new FormData(form).entries());
      await addDoc(collection(db, "reservations"), {
        name: d.name, phone: d.phone, email: d.email,
        vehicle: { year: d.year, make: d.make, model: d.model, color: d.color, plate: d.plate },
        dropOff: d.dropoff, pickup: d.pickup,
        flight: { airline: d.airline || "", outbound: d.outflight || "", returning: d.retflight || "" },
        leavingKeys: d.keys === "yes",
        textUpdatesOk: !!d.sms,
        notes: d.notes || "",
        status: "new",
        createdAt: serverTimestamp()
      });
      form.reset();
      show("ok", "Request received. We'll confirm your spot by text or email shortly.");
    } catch (err) {
      console.error(err);
      show("err", "Something went wrong sending your request. Please call or email us instead.");
    } finally {
      btn.disabled = false; btn.textContent = "Request my spot";
    }
  });
})();
