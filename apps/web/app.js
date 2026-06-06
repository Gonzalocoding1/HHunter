const result = document.querySelector("#capture-result");
const form = document.querySelector("#listing-form");
const latestList = document.querySelector("#latest-list");
const listingTable = document.querySelector("#listing-table");
const applicationList = document.querySelector("#application-list");
const portalsGrid = document.querySelector("#portal-list");
const screenTitle = document.querySelector("#screen-title");

const portals = ["ImmoScout24", "Immowelt", "Immonet", "meineStadt", "immobilie1", "Immomio"];
const screenTitles = {
  overview: "Übersicht",
  profiles: "Suchprofile",
  listings: "Inserate",
  applications: "Bewerbungen",
  portals: "Portal-Konten",
  setup: "Setup",
  settings: "Einstellungen",
  events: "App-Events"
};

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    openScreen(button.dataset.tab);
  });
});

renderPortals();
void loadListings();

function openScreen(screen) {
  document.querySelectorAll("[data-screen]").forEach((section) => {
    const isActive = section.dataset.screen === screen;
    section.classList.toggle("active", isActive);
    section.hidden = !isActive;
  });
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === screen);
  });
  screenTitle.textContent = screenTitles[screen] ?? "HomeHunter";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const sourceUrl = new FormData(form).get("sourceUrl");
  result.textContent = "Inserat wird erfasst...";

  try {
    const response = await fetch("/api/listings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceUrl })
    });

    if (!response.ok) {
      const error = await response.json();
      result.textContent = error.error ?? "Konnte Inserat nicht erfassen.";
      result.style.color = "hsl(var(--destructive))";
      return;
    }

    form.reset();
    result.style.color = "hsl(var(--primary))";
    result.textContent = "Inserat erfasst. Extraktion und Review können folgen.";
    await loadListings();
  } catch {
    result.style.color = "hsl(var(--destructive))";
    result.textContent = "API nicht erreichbar.";
  }
});

async function loadListings() {
  try {
    const response = await fetch("/api/listings");
    const listings = await response.json();
    result.textContent = "API verbunden.";
    result.style.color = "hsl(var(--primary))";

    const safeListings = Array.isArray(listings) ? listings : [];
    renderStats(safeListings);
    renderLatest(safeListings);
    renderTable(safeListings);
    renderApplications(safeListings);
  } catch {
    result.textContent = "API nicht erreichbar. Backend auf Port 3000 starten.";
    result.style.color = "hsl(var(--destructive))";
  }
}

function renderStats(listings) {
  const ready = listings.filter((listing) => listing.applicationStatus === "ready_to_send").length;
  const duplicates = listings.filter((listing) => listing.status === "duplicate").length;
  const average = listings.length
    ? Math.round(listings.reduce((sum, listing) => sum + Number(listing.score ?? 0), 0) / listings.length)
    : 0;

  document.querySelector("#stat-listings").textContent = String(listings.length);
  document.querySelector("#stat-ready").textContent = String(ready);
  document.querySelector("#stat-duplicates").textContent = String(duplicates);
  document.querySelector("#stat-score").textContent = `${average}%`;
}

function renderLatest(listings) {
  if (listings.length === 0) {
    latestList.innerHTML = `<div class="latest-row"><div><h3>Noch keine Inserate</h3><p>Füge oben eine URL ein.</p></div></div>`;
    return;
  }

  latestList.innerHTML = listings.slice(0, 5).map((listing) => `
    <div class="latest-row">
      <div>
        <h3>${escapeHtml(listing.title)}</h3>
        <p>${escapeHtml(listing.location ?? listing.sourceId ?? "Quelle unbekannt")}</p>
      </div>
      <div class="latest-score">
        <strong>${listing.score ?? 0}</strong>
        <span>${escapeHtml(listing.scoreLabel ?? "Nicht bewertet")}</span>
      </div>
    </div>
  `).join("");
}

function renderTable(listings) {
  if (listings.length === 0) {
    listingTable.innerHTML = `<tr><td colspan="6">Noch keine Inserate vorhanden.</td></tr>`;
    return;
  }

  listingTable.innerHTML = listings.map((listing) => `
    <tr>
      <td class="title-cell">
        <a href="${escapeAttr(listing.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(listing.title)} ↗</a>
        <span class="meta">${escapeHtml(listing.location ?? listing.sourceId ?? "Quelle unbekannt")}</span>
        ${renderEquipment(listing.equipment)}
      </td>
      <td><strong>${formatPrice(listing.priceEur)}</strong><span class="meta">Kaltmiete/NK offen</span></td>
      <td><strong>${listing.livingAreaSqm ?? "?"} m²</strong><span class="meta">${listing.rooms ?? "?"} Zimmer</span></td>
      <td><strong>${listing.score ?? 0}</strong><span class="meta">${escapeHtml(listing.scoreLabel ?? "Nicht bewertet")}</span></td>
      <td>${statusBadge(listing.status)}<span class="meta">${escapeHtml(listing.applicationStatus ?? "new")}</span></td>
      <td>${renderContact(listing)}</td>
    </tr>
  `).join("");
}

function renderApplications(listings) {
  if (listings.length === 0) {
    applicationList.innerHTML = `<article class="card application-card"><h2>Keine Bewerbungen vorbereitet</h2><p class="muted-note">Erfasse und extrahiere zuerst ein Inserat.</p></article>`;
    return;
  }

  applicationList.innerHTML = listings.slice(0, 6).map((listing) => `
    <article class="card application-card">
      <div class="application-head">
        <div>
          <h2>${escapeHtml(listing.title)}</h2>
          <div class="application-meta">
            <span>${formatPrice(listing.priceEur)}</span>
            <span>${listing.livingAreaSqm ?? "?"} m²</span>
            <span>${listing.rooms ?? "?"} Zimmer</span>
            <span>Score ${listing.score ?? 0}</span>
            <a href="${escapeAttr(listing.sourceUrl)}" target="_blank" rel="noreferrer">Inserat ↗</a>
          </div>
        </div>
        ${statusBadge(listing.applicationStatus ?? "new")}
      </div>
      <div class="application-body">
        <textarea>${escapeHtml(listing.applicationDraft ?? "Noch kein Anschreiben generiert. Review bleibt manuell.")}</textarea>
        <div class="action-row">
          <button class="btn secondary">Speichern</button>
          <button class="btn primary" ${listing.applicationStatus === "ready_to_send" ? "disabled" : ""}>Freigeben</button>
          <button class="btn secondary">Bewerbung vorbereiten</button>
          <button class="btn secondary" disabled>Als versendet markieren</button>
          <button class="btn ghost">Ignorieren</button>
        </div>
        <div class="status-block">Keine echte Sendefunktion aktiv. Approval markiert nur ready_to_send.</div>
      </div>
    </article>
  `).join("");
}

function renderPortals() {
  portalsGrid.innerHTML = portals.map((portal) => `
    <article class="card portal-card">
      <div class="portal-head">
        <h2>${portal}</h2>
        <span class="badge muted">Nicht verbunden</span>
      </div>
      <label>Benutzername<input /></label>
      <label>Passwort<input type="password" /></label>
      <button class="btn primary" type="button">Zugang speichern</button>
    </article>
  `).join("");
}

function renderEquipment(equipment) {
  if (!Array.isArray(equipment) || equipment.length === 0) return "";
  return `<div class="badge-row">${equipment.slice(0, 4).map((item) => `<span class="badge muted">${escapeHtml(item)}</span>`).join("")}</div>`;
}

function renderContact(listing) {
  if (listing.contactEmail) return `<a href="mailto:${escapeAttr(listing.contactEmail)}">${escapeHtml(listing.contactEmail)}</a>`;
  if (listing.applicationUrl) return `<a href="${escapeAttr(listing.applicationUrl)}" target="_blank" rel="noreferrer">Formular ↗</a>`;
  return `<span class="meta">${escapeHtml(listing.contactMethod ?? "form")}</span>`;
}

function statusBadge(status) {
  const variant = status === "duplicate" ? "warn" : status === "ready_to_send" || status === "new" ? "success" : "muted";
  return `<span class="badge ${variant}">${escapeHtml(status)}</span>`;
}

function formatPrice(value) {
  if (value === undefined || value === null) return "? €";
  return `${new Intl.NumberFormat("de-DE").format(value)} €`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
