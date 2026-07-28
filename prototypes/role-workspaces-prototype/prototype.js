const roles = {
  student: {
    label: "Student",
    subtitle: "Reserve seats, prepare for Class Sessions, and follow learning progress.",
    metrics: [["3", "Upcoming"], ["5", "Class Credits"], ["42%", "Spanish A2 progress"]],
    nav: ["Home", "Discover", "My learning", "Class Credits", "Sponsorship"],
    journeys: [
      ["Find a Class Session", "Discover the next seven dates, filtered to Spanish A2.", "12 actionable sessions", "Discover"],
      ["Prepare for Thursday", "Review Lesson Materials and enter the classroom when access opens.", "Classroom opens in 1 day", "My learning"],
      ["Review attendance", "One recent outcome is ready; a review may be requested within seven days.", "1 outcome published", "My learning"],
      ["Track progress", "See active Lesson Unit completions without implying mastery.", "8 of 19 active units", "My learning"]
    ],
    queue: [
      ["Thu", "Conversation: making plans", "Thursday, 6:00 PM · María Santos · Booked"],
      ["!", "Attendance outcome published", "Monday session · Review window closes in 5 days"],
      ["+", "Five Class Credits available", "Subscription renewal: August 12"]
    ]
  },
  teacher: {
    label: "Teacher",
    subtitle: "Lead assigned Class Sessions and complete time-bounded follow-up work.",
    metrics: [["2", "Today"], ["7", "Attendance due"], ["3", "Feedback drafts"]],
    nav: ["Home", "My schedule", "Session work", "Availability", "Absence requests"],
    journeys: [
      ["Lead the next session", "Open the assigned session workspace and time-bounded Class Roster.", "Starts in 42 minutes", "My schedule"],
      ["Record attendance", "Submit Attended or No-show outcomes after the scheduled end.", "7 records due", "Session work"],
      ["Publish Learning Feedback", "Finish private drafts within the 48-hour submission window.", "3 drafts", "Session work"],
      ["Manage availability", "Change future recurring availability or add an Availability Exception.", "Next change: Aug 4", "Availability"]
    ],
    queue: [
      ["42m", "Spanish A2: making plans", "5 booked Students · Class Roster visible now"],
      ["7", "Attendance due", "Two completed Class Sessions · earliest deadline today"],
      ["3", "Learning Feedback drafts", "Private until explicitly published"]
    ]
  },
  manager: {
    label: "Organization Manager",
    subtitle: "Manage Sponsorships and view only Organization-authorized reporting.",
    metrics: [["24", "Sponsored Students"], ["3", "Invitations"], ["68%", "Recorded attendance"]],
    nav: ["Home", "Sponsored Students", "Invitations", "Cohorts", "Reports"],
    journeys: [
      ["Invite a Student", "Send the 14-day disclosure-backed Sponsorship Invitation.", "3 invitations pending", "Invitations"],
      ["Review participation", "Use time-bounded attendance reporting with Unrecorded counts disclosed.", "Q3 reporting window", "Reports"],
      ["Compare Cohorts", "Group activity by time-bounded Cohort membership without changing access.", "4 active Cohorts", "Cohorts"],
      ["End a Sponsorship", "End reporting and future benefit grants prospectively.", "No changes pending", "Sponsored Students"]
    ],
    queue: [
      ["3", "Sponsorship Invitations pending", "Two expire this week"],
      ["!", "July report has Unrecorded outcomes", "4 outcomes excluded from Attendance Rate"],
      ["Q3", "Cohort comparison ready", "Customer Support and Engineering"]
    ]
  },
  admin: {
    label: "Platform Administrator",
    subtitle: "Operate curriculum, sessions, people, credits, quality, and marketplace reporting.",
    metrics: [["8", "Urgent tasks"], ["4", "Sessions at risk"], ["2", "Reviews due"]],
    nav: ["Operations", "Class Sessions", "Curriculum", "People", "Credits", "Reports", "Quality"],
    journeys: [
      ["Resolve session coverage", "Substitute a qualified Teacher or cancel the Class Session.", "4 Absence Requests", "Operations"],
      ["Review attendance", "Decide a Student request while preserving the original outcome.", "2 requests due", "Quality"],
      ["Publish Class Sessions", "Schedule qualified Teachers against immutable session start times.", "6 drafts", "Class Sessions"],
      ["Manage a User", "Apply a relationship-aware role action with a concise User-visible reason.", "Search people", "People"]
    ],
    queue: [
      ["4", "Absence Requests need coverage", "Next affected session starts tomorrow"],
      ["2", "Attendance Review Requests", "Oldest request is 3 days old"],
      ["!", "Waitlist promotion retries", "2 temporary failures preserved queue position"]
    ]
  }
};

const variants = {
  A: "Role rail + action cockpit",
  B: "Queue-first role home",
  C: "Journey map + detail pane"
};

const state = {
  variant: new URLSearchParams(location.search).get("variant") || "A",
  role: "student",
  selection: 0,
  nav: {},
  roleChanged: false
};

function rolePicker(compact = false) {
  return `<div class="role-control">
    <label for="role-picker">Acting as</label>
    <select id="role-picker" aria-label="Choose acting role">
      ${Object.entries(roles).map(([key, role]) => `<option value="${key}" ${state.role === key ? "selected" : ""}>${role.label}</option>`).join("")}
    </select>
    ${compact ? "" : `<div class="label">Changing this changes your authority and workspace.</div>`}
  </div>`;
}

function roleChangeNote() {
  return state.roleChanged ? `<p class="role-change-note" role="status">You are now acting as <strong>${roles[state.role].label}</strong>. Your previous role workspace is remembered separately.</p>` : "";
}

function metrics(role) {
  return `<div class="metric-grid">${role.metrics.map(([value, label]) => `<div class="card"><div class="metric">${value}</div><div class="label">${label}</div></div>`).join("")}</div>`;
}

function queue(role) {
  return role.queue.map(([icon, title, meta], index) => `<div class="queue-row">
    <span class="queue-icon">${icon}</span>
    <div><div class="queue-title">${title}</div><div class="queue-meta">${meta}</div></div>
    <button class="text-button" data-select="${index}">Open</button>
  </div>`).join("");
}

function detail(role, index = state.selection) {
  const item = role.journeys[index % role.journeys.length];
  return `<div class="action-view">
    <p class="eyebrow">${item[3]}</p>
    <h2>${item[0]}</h2>
    <p>${item[1]}</p>
    <p class="pill urgent">${item[2]}</p>
    <h3>What stays visible</h3>
    <ul>
      <li>Current acting role and relationship scope</li>
      <li>Deadline or access window when time matters</li>
      <li>The intended domain action, not generic editing</li>
    </ul>
    <button class="button primary">Continue to ${item[3]}</button>
  </div>`;
}

function variantA(role) {
  const currentNav = state.nav[state.role] || role.nav[0];
  return `<div class="a-shell">
    <aside class="a-rail">
      <div class="brand">Lingua Market</div>
      ${rolePicker()}
      <nav class="nav-list" aria-label="${role.label} workspace">
        ${role.nav.map(item => `<button class="nav-item ${item === currentNav ? "active" : ""}" data-nav="${item}">${item}</button>`).join("")}
      </nav>
      <p class="rail-foot">Role-specific navigation stays visible. Utility items—notifications, locale, time zone, and profile—stay User-wide.</p>
    </aside>
    <main class="a-main">
      <header class="a-top"><div><p class="eyebrow">${role.label} workspace</p><h1>${currentNav}</h1><p class="muted">${role.subtitle}</p></div><div class="cluster"><button class="button">Notifications · 3</button><button class="button">Profile</button></div></header>
      ${roleChangeNote()}
      <div class="a-grid"><div class="stack">${metrics(role)}<section class="card"><div class="spread"><h2>Next actions</h2><span class="pill">Priority order</span></div>${queue(role)}</section></div><aside class="card">${detail(role)}</aside></div>
    </main>
  </div>`;
}

function variantB(role) {
  const currentNav = state.nav[state.role] || role.nav[0];
  return `<div class="b-shell">
    <header class="b-top"><div class="spread"><div class="cluster"><strong>Lingua Market</strong><span class="pill">${role.label} home</span></div><div class="cluster">${rolePicker(true)}<button class="button">Notifications · 3</button></div></div></header>
    <main class="b-main">
      <div class="b-hero"><div><p class="eyebrow">Welcome back, Alex</p><h1>What needs your attention?</h1><p>${role.subtitle}</p></div><label class="command"><span aria-hidden="true">⌘</span><input placeholder="Go to a task or workspace…" aria-label="Go to a task or workspace" /></label></div>
      ${roleChangeNote()}
      <div class="role-home-strip" aria-label="Primary destinations">${role.nav.slice(0,4).map(item => `<button data-nav="${item}" class="${item === currentNav ? "active" : ""}"><span class="label">Go to</span><br>${item}</button>`).join("")}</div>
      <div class="b-tabs" role="tablist"><button class="b-tab active">Action queue <span class="pill urgent">${role.queue.length}</span></button><button class="b-tab">Schedule</button><button class="b-tab">Recent activity</button><button class="b-tab">All ${role.label} tools</button></div>
      <div class="b-columns"><section><div class="queue-list">${queue(role)}</div></section><aside class="stack">${metrics(role)}<div class="card">${detail(role)}</div></aside></div>
    </main>
  </div>`;
}

function variantC(role) {
  const selected = state.selection % role.journeys.length;
  const item = role.journeys[selected];
  return `<div class="c-shell">
    <header class="c-top"><div class="spread"><div><div class="brand">Lingua Market</div><div class="muted">Choose a journey, then work in context.</div></div><div class="cluster">${rolePicker(true)}<button class="button">User settings</button></div></div></header>
    <main class="c-main"><p class="eyebrow">${role.label} workspace</p><h1>Where are you headed?</h1><p>${role.subtitle}</p>${roleChangeNote()}
      <div class="c-layout"><section class="journey-map">${role.journeys.map((journey, index) => `<button class="journey ${selected === index ? "active" : ""}" data-select="${index}"><div class="journey-number">Journey 0${index+1} · ${journey[3]}</div><h2>${journey[0]}</h2><p class="muted">${journey[1]}</p><span class="pill ${index < 2 ? "urgent" : ""}">${journey[2]}</span></button>`).join("")}</section>
      <aside class="detail-pane"><p class="eyebrow" style="color:#9fcae9">Current journey</p><h2>${item[0]}</h2><p class="muted">${item[1]}</p><div class="state-strip">${role.metrics.map(([value,label]) => `<div class="state-cell"><strong>${value}</strong><div class="label" style="color:#c2cfdb">${label}</div></div>`).join("")}</div><button class="button primary">Enter ${item[3]}</button><button class="button ghost" style="color:white">View related activity</button><p class="label" style="color:#c2cfdb;margin-top:1rem">Role context remains pinned while the journey narrows the workspace.</p></aside></div>
    </main>
  </div>`;
}

function switcher() {
  return `<div class="prototype-switcher" aria-label="Prototype variant switcher">
    <button data-cycle="-1" aria-label="Previous prototype variant">←</button>
    <strong>${state.variant} — ${variants[state.variant]}</strong>
    <button data-cycle="1" aria-label="Next prototype variant">→</button>
  </div>`;
}

function render() {
  const role = roles[state.role];
  const content = state.variant === "B" ? variantB(role) : state.variant === "C" ? variantC(role) : variantA(role);
  document.querySelector("#app").innerHTML = `<div class="prototype-banner">Throwaway structural prototype · synthetic data · no actions are saved</div>${content}${switcher()}`;
  bind();
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
  document.querySelector("#role-picker")?.addEventListener("change", event => {
    state.role = event.target.value;
    state.selection = 0;
    state.roleChanged = true;
    render();
  });
  document.querySelectorAll("[data-cycle]").forEach(button => button.addEventListener("click", () => cycle(Number(button.dataset.cycle))));
  document.querySelectorAll("[data-select]").forEach(button => button.addEventListener("click", () => { state.selection = Number(button.dataset.select); render(); }));
  document.querySelectorAll("[data-nav]").forEach(button => button.addEventListener("click", () => { state.nav[state.role] = button.dataset.nav; render(); }));
}

document.addEventListener("keydown", event => {
  const target = event.target;
  if (target.matches("input, textarea, select, [contenteditable='true']")) return;
  if (event.key === "ArrowLeft") cycle(-1);
  if (event.key === "ArrowRight") cycle(1);
});

if (!variants[state.variant]) state.variant = "A";
render();
