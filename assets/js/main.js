// Shared header/footer, nav toggle, and {data-site} filling from config.js
(function () {
  const S = window.SITE;
  const page = document.body.dataset.page || "";

  const links = [
    ["index.html", "Home", "home"],
    ["how-it-works.html", "How it works", "how"],
    ["pricing.html", "Pricing", "pricing"],
    ["faq.html", "FAQ", "faq"],
    ["contact.html", "Contact", "contact"]
  ];

  const header = `
  <header class="site-header"><div class="wrap">
    <a class="brand" href="index.html"><span class="mark">P</span>${S.name}</a>
    <button class="nav-toggle" aria-label="Menu" aria-expanded="false">☰</button>
    <nav class="nav" id="nav">
      ${links.map(([h, t, k]) => `<a href="${h}"${k === page ? ' aria-current="page"' : ""}>${t}</a>`).join("")}
      <a class="btn" href="reserve.html">Reserve a spot</a>
    </nav>
  </div></header>`;

  const footer = `
  <footer class="site-footer"><div class="wrap">
    <div class="cols">
      <div><h4>${S.name}</h4><p>Park at the shop, shuttle to ${S.airport}, and we can keep your car in good hands while you're away.</p></div>
      <div><h4>Explore</h4><ul>${links.map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join("")}<li><a href="reserve.html">Reserve</a></li></ul></div>
      <div><h4>Contact</h4><ul>
        <li data-fill="phone-link"></li><li data-fill="email-link"></li><li data-fill="address"></li>
      </ul></div>
      <div><h4>A service of</h4><p><a href="${S.parentUrl}">${S.parent}</a></p><p><a href="terms.html">Terms &amp; policies</a></p></div>
    </div>
    <div class="fine">© ${new Date().getFullYear()} ${S.name}. All rights reserved.</div>
  </div></footer>`;

  document.body.insertAdjacentHTML("afterbegin", header);
  document.body.insertAdjacentHTML("beforeend", footer);

  const toggle = document.querySelector(".nav-toggle");
  toggle.addEventListener("click", () => {
    const open = document.getElementById("nav").classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
  });

  const tbd = (label) => `<span class="tbd" title="Set in assets/js/config.js">TBD${label ? ": " + label : ""}</span>`;
  const money = (n) => (n == null ? tbd("price") : "$" + n);

  const fills = {
    name: () => S.name,
    airport: () => S.airport,
    "price-day": () => money(S.pricePerDay),
    "price-week": () => money(S.pricePerWeek),
    "airport-lot": () => "$" + S.airportLotPerDay,
    phone: () => S.phone || tbd("phone"),
    "phone-link": () => (S.phone ? `<a href="tel:${S.phone.replace(/\D/g, "")}">${S.phone}</a>` : tbd("phone")),
    "email-link": () => (S.email ? `<a href="mailto:${S.email}">${S.email}</a>` : tbd("email")),
    address: () => S.address || tbd("address"),
    hours: () => S.hours || tbd("hours"),
    capacity: () => (S.capacity ? S.capacity + " vehicles" : tbd("capacity")),
    "shuttle-vehicle": () => S.shuttle.vehicle || tbd("shuttle vehicle"),
    "shuttle-hours": () => S.shuttle.hours || tbd("shuttle hours"),
    "early-late": () => S.shuttle.earlyLateFlights || tbd("early/late flight policy"),
    services: () => S.servicesWhileAway || tbd("services while you're away"),
    keys: () =>
      S.keysRequired === null ? tbd("key policy")
      : S.keysRequired ? "Yes — we ask you to leave your keys so we can move your car and complete any approved work."
      : "No — you keep your keys.",
    security: () => {
      const s = S.security;
      const items = [["fenced", "Fenced"], ["lit", "Lit at night"], ["camera", "On camera"]];
      return items.map(([k, t]) => (s[k] === true ? "✓ " + t : s[k] === false ? "✗ " + t : tbd(t))).join(" &nbsp; ");
    }
  };
  document.querySelectorAll("[data-fill]").forEach((el) => {
    const f = fills[el.dataset.fill];
    if (f) el.innerHTML = f();
  });
})();
