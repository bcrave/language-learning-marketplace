// Three variants of screen journeys and cross-role navigation, switchable via ?variant=.
const roles = {
  student: {
    label: "Student",
    home: "/student",
    scope: "Your Bookings, Class Credits, and learning history",
    journeys: [
      { key: "discover", label: "Find a Class Session", path: "/student/discover", detail: "/student/discover/sessions/spanish-a2-making-plans", meta: "12 actionable sessions", action: "Open sample journey" },
      { key: "upcoming", label: "Prepare for an upcoming session", path: "/student/upcoming", detail: "/student/upcoming/bookings/thursday-6pm", meta: "Next session Thursday", action: "Review Booking" },
      { key: "progress", label: "Follow learning progress", path: "/student/progress", detail: "/student/progress/spanish-a2", meta: "8 of 19 active units", action: "View Course Progress" },
      { key: "credits", label: "Manage Class Credits", path: "/student/credits", detail: "/student/credits/activity", meta: "5 available", action: "View credit activity" }
    ]
  },
  teacher: {
    label: "Teacher",
    home: "/teacher",
    scope: "Assigned Class Sessions and time-bounded Student relationships",
    journeys: [
      { key: "lead", label: "Lead the next session", path: "/teacher/schedule", detail: "/teacher/sessions/spanish-a2-1800", meta: "Starts in 42 minutes", action: "Open session workspace" },
      { key: "attendance", label: "Record attendance", path: "/teacher/session-work/attendance", detail: "/teacher/session-work/attendance/spanish-a2-1700", meta: "7 outcomes due", action: "Open attendance" },
      { key: "feedback", label: "Publish Learning Feedback", path: "/teacher/session-work/feedback", detail: "/teacher/session-work/feedback/booking-ana", meta: "3 private drafts", action: "Open feedback draft" },
      { key: "availability", label: "Manage availability", path: "/teacher/availability", detail: "/teacher/availability/weekly", meta: "Next change Aug 4", action: "Edit availability" }
    ]
  },
  manager: {
    label: "Organization Manager",
    home: "/organization-manager",
    scope: "Northstar Labs Sponsorships and authorized reports",
    journeys: [
      { key: "invite", label: "Invite a Student", path: "/organization-manager/invitations", detail: "/organization-manager/invitations/new", meta: "3 pending", action: "Create invitation" },
      { key: "participation", label: "Review participation", path: "/organization-manager/reports", detail: "/organization-manager/reports/attendance", meta: "Q3 · 4 Unrecorded", action: "Open attendance report" },
      { key: "cohorts", label: "Compare Cohorts", path: "/organization-manager/cohorts", detail: "/organization-manager/cohorts/q3-comparison", meta: "4 active Cohorts", action: "Open comparison" },
      { key: "sponsorship", label: "Manage Sponsorships", path: "/organization-manager/sponsorships", detail: "/organization-manager/sponsorships/ana-r", meta: "24 active", action: "Open Sponsorship" }
    ]
  },
  admin: {
    label: "Platform Administrator",
    home: "/platform-administrator",
    scope: "Marketplace-wide operational authority",
    journeys: [
      { key: "coverage", label: "Resolve session coverage", path: "/platform-administrator/operations/coverage", detail: "/platform-administrator/operations/coverage/absence-104", meta: "4 Absence Requests", action: "Resolve next request" },
      { key: "review", label: "Review attendance", path: "/platform-administrator/quality/attendance-reviews", detail: "/platform-administrator/quality/attendance-reviews/request-42", meta: "2 requests due", action: "Open review" },
      { key: "publish", label: "Publish Class Sessions", path: "/platform-administrator/class-sessions", detail: "/platform-administrator/class-sessions/drafts/august", meta: "6 drafts", action: "Open drafts" },
      { key: "people", label: "Manage a User", path: "/platform-administrator/people", detail: "/platform-administrator/people/user-ana-r", meta: "Search or review", action: "Open sample User" }
    ]
  }
};

const variants = { A: "Context rail", B: "Focused trail", C: "Route canvas" };
const state = {
  variant: new URLSearchParams(location.search).get("variant") || "A",
  role: "student",
  route: "/student",
  remembered: {},
  pendingDeepLink: null,
  announcement: "",
  mobileMenu: false
};

function esc(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function roleKeyForRoute(path) {
  return Object.keys(roles).find(key => path === roles[key].home || path.startsWith(`${roles[key].home}/`));
}

function routeInfo(roleKey = state.role, path = state.route) {
  const role = roles[roleKey];
  const journey = role.journeys.find(item => path === item.path || path === item.detail) || role.journeys[0];
  const depth = path === role.home ? "home" : path === journey.path ? "journey" : "detail";
  return { role, journey, depth };
}

function roleControl() {
  return `<label class="role-control"><span>Acting as</span><select id="role-picker" aria-label="Choose acting role">${Object.entries(roles).map(([key, role]) => `<option value="${key}" ${key === state.role ? "selected" : ""}>${role.label}</option>`).join("")}</select></label>`;
}

function routeBadge() {
  return `<div class="route-badge" aria-label="Current prototype route"><span>Route</span><code>${esc(state.route)}</code></div>`;
}

function journeyCards(role, compact = false) {
  return `<div class="journey-grid ${compact ? "compact" : ""}">${role.journeys.map((item, index) => `<button class="journey-card" data-route="${item.path}"><span class="journey-index">Journey 0${index + 1}</span><strong>${item.label}</strong><small>${item.meta}</small><span class="card-arrow">→</span></button>`).join("")}</div>`;
}

function detailContent(info) {
  const isDetail = info.depth === "detail";
  return `<section class="content-panel"><div class="content-kicker">${info.role.label} · ${info.journey.label}</div><h1>${isDetail ? info.journey.action : info.journey.label}</h1><p class="lede">Relationship scope: <strong>${info.role.scope}</strong></p><div class="scope-note"><strong>What remains visible</strong><span>Acting role, relationship scope, current journey, and time-sensitive access or deadline.</span></div><div class="fake-content"><div></div><div></div><div></div></div>${isDetail ? `<div class="button-row"><button class="primary">Continue task</button><button data-route="${info.journey.path}">Back to journey</button></div>` : `<button class="primary" data-route="${info.journey.detail}">${info.journey.action}</button>`}</section>`;
}

function header(extra = "") {
  return `<header class="app-header"><button class="mobile-menu" id="mobile-menu" aria-label="Toggle journey navigation">☰</button><a class="brand" href="#" data-route="${roles[state.role].home}">Lingua Market</a>${extra}<div class="header-actions">${roleControl()}<button class="utility">User settings</button></div></header>`;
}

function variantA(info) {
  return `<div class="shell variant-a">${header()}<div class="workspace"><aside class="context-rail ${state.mobileMenu ? "open" : ""}"><p class="rail-label">${info.role.label} journeys</p>${info.role.journeys.map(item => `<button class="rail-link ${state.route.startsWith(item.path) ? "active" : ""}" data-route="${item.path}"><span>${item.label}</span><small>${item.meta}</small></button>`).join("")}<button class="rail-home" data-route="${info.role.home}">All journeys</button></aside><main class="route-stage">${routeBadge()}${info.depth === "home" ? `<div class="stage-heading"><p class="eyebrow">${info.role.label} workspace</p><h1>Where are you headed?</h1><p>${info.role.scope}</p></div>${journeyCards(info.role)}` : `<nav class="crumbs" aria-label="Breadcrumb"><button data-route="${info.role.home}">${info.role.label}</button><span>/</span><button data-route="${info.journey.path}">${info.journey.label}</button>${info.depth === "detail" ? `<span>/</span><span>Current task</span>` : ""}</nav>${detailContent(info)}`}</main></div><nav class="mobile-bottom" aria-label="Mobile role navigation"><button data-route="${info.role.home}">Journeys</button><button data-route="${info.role.journeys[0].path}">Next</button><button id="mobile-role">Role</button></nav></div>`;
}

function variantB(info) {
  const steps = info.depth === "home" ? ["Journeys"] : info.depth === "journey" ? ["Journeys", info.journey.label] : ["Journeys", info.journey.label, "Current task"];
  return `<div class="shell variant-b">${header(`<nav class="header-trail" aria-label="Current journey">${steps.map((step, index) => `<span class="${index === steps.length - 1 ? "current" : ""}">${index ? "→ " : ""}${step}</span>`).join("")}</nav>`)}<main class="focus-stage">${routeBadge()}${info.depth === "home" ? `<div class="focus-home"><p class="eyebrow">${info.role.label} workspace</p><h1>Choose one journey</h1><p>${info.role.scope}</p>${journeyCards(info.role)}</div>` : `<button class="back-link" data-route="${info.depth === "detail" ? info.journey.path : info.role.home}">← ${info.depth === "detail" ? info.journey.label : "All journeys"}</button>${detailContent(info)}<aside class="next-context"><strong>Next in this journey</strong><span>${info.depth === "detail" ? "Complete or return without losing your place." : info.journey.action}</span></aside>`}</main></div>`;
}

function variantC(info) {
  const open = info.depth !== "home";
  return `<div class="shell variant-c">${header()}<main class="canvas"><div class="canvas-map ${open ? "receded" : ""}"><div class="canvas-heading">${routeBadge()}<p class="eyebrow">${info.role.label} workspace</p><h1>Journey map</h1><p>${info.role.scope}</p></div>${journeyCards(info.role, true)}</div>${open ? `<div class="canvas-scrim" data-route="${info.role.home}"></div><section class="route-sheet"><div class="sheet-top"><button data-route="${info.role.home}" aria-label="Close route canvas">← Journey map</button><span class="role-chip">${info.role.label}</span></div><nav class="sheet-tabs"><button class="active" data-route="${info.journey.path}">Overview</button><button data-route="${info.journey.detail}">Current task</button></nav>${detailContent(info)}</section>` : ""}</main></div>`;
}

function guardDialog() {
  if (!state.pendingDeepLink) return "";
  const ownerKey = roleKeyForRoute(state.pendingDeepLink);
  const owner = roles[ownerKey];
  return `<div class="dialog-backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="guard-title"><p class="eyebrow">Role-incompatible link</p><h2 id="guard-title">This route belongs to the ${owner.label} workspace</h2><code>${esc(state.pendingDeepLink)}</code><p>You are acting as <strong>${roles[state.role].label}</strong>. Opening it requires an explicit acting-role change; your current place will be remembered.</p><div class="dialog-actions"><button class="primary" id="confirm-role-link">Act as ${owner.label} and open</button><button id="cancel-role-link">Stay as ${roles[state.role].label}</button></div></section></div>`;
}

function prototypeTools() {
  return `<div class="prototype-tools"><button id="deep-link">Try incompatible deep link</button><span class="divider"></span><button data-cycle="-1" aria-label="Previous variant">←</button><strong>${state.variant} — ${variants[state.variant]}</strong><button data-cycle="1" aria-label="Next variant">→</button></div>`;
}

function render() {
  const info = routeInfo();
  const view = state.variant === "B" ? variantB(info) : state.variant === "C" ? variantC(info) : variantA(info);
  document.querySelector("#app").innerHTML = `<div class="prototype-banner">Throwaway route prototype · synthetic data · no actions are saved</div>${state.announcement ? `<div class="announcement" role="status">${state.announcement}</div>` : ""}${view}${guardDialog()}${prototypeTools()}`;
  bind();
}

function navigate(path) {
  const ownerKey = roleKeyForRoute(path);
  if (ownerKey && ownerKey !== state.role) {
    state.pendingDeepLink = path;
    render();
    return;
  }
  state.route = path;
  state.remembered[state.role] = path;
  state.mobileMenu = false;
  state.announcement = `Opened ${path}`;
  render();
}

function changeRole(nextRole, requestedPath) {
  state.remembered[state.role] = state.route;
  state.role = nextRole;
  state.route = requestedPath || state.remembered[nextRole] || roles[nextRole].home;
  state.pendingDeepLink = null;
  state.mobileMenu = false;
  state.announcement = `Now acting as ${roles[nextRole].label}. ${state.remembered[nextRole] ? "Restored that role's prior place." : "Opened that role's journey map."}`;
  render();
}

function setVariant(next) {
  state.variant = next;
  const url = new URL(location.href);
  url.searchParams.set("variant", next);
  history.replaceState({}, "", url);
  render();
}

function cycle(direction) {
  const keys = Object.keys(variants);
  const index = keys.indexOf(state.variant);
  setVariant(keys[(index + direction + keys.length) % keys.length]);
}

function bind() {
  document.querySelectorAll("[data-route]").forEach(button => button.addEventListener("click", event => { event.preventDefault(); navigate(button.dataset.route); }));
  document.querySelectorAll("[data-cycle]").forEach(button => button.addEventListener("click", () => cycle(Number(button.dataset.cycle))));
  document.querySelector("#role-picker")?.addEventListener("change", event => changeRole(event.target.value));
  document.querySelector("#mobile-menu")?.addEventListener("click", () => { state.mobileMenu = !state.mobileMenu; render(); });
  document.querySelector("#mobile-role")?.addEventListener("click", () => document.querySelector("#role-picker")?.focus());
  document.querySelector("#deep-link")?.addEventListener("click", () => navigate(state.role === "teacher" ? roles.student.journeys[0].detail : roles.teacher.journeys[0].detail));
  document.querySelector("#cancel-role-link")?.addEventListener("click", () => { state.pendingDeepLink = null; state.announcement = "Stayed in the current acting-role workspace."; render(); });
  document.querySelector("#confirm-role-link")?.addEventListener("click", () => changeRole(roleKeyForRoute(state.pendingDeepLink), state.pendingDeepLink));
}

document.addEventListener("keydown", event => {
  if (event.target.matches("input, textarea, select, [contenteditable='true']")) return;
  if (event.key === "ArrowLeft") cycle(-1);
  if (event.key === "ArrowRight") cycle(1);
  if (event.key === "Escape" && state.pendingDeepLink) { state.pendingDeepLink = null; render(); }
});

if (!variants[state.variant]) state.variant = "A";
render();
