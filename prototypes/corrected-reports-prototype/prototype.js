// PROTOTYPE ONLY — three report-layout variants sharing one policy-constrained sample state.

const variants = {
  A: { name: "Exception-first ledger", render: renderLedger },
  B: { name: "Guided report story", render: renderStory },
  C: { name: "Analyst workbench", render: renderWorkbench },
};

const state = {
  variant: new URLSearchParams(location.search).get("variant") || "A",
  actingRole: "Organization Manager",
  scope: "Northstar Learning · Active Sponsorships",
  period: "2026-04-01 → 2026-07-01",
  boundary: "inclusive start / exclusive end",
  displayTimeZone: "America/Denver",
  dataAsOf: "2026-07-29T17:42:10-06:00",
  selectedStudent: "STU-7F2A",
  historyOpen: false,
  schemaOpen: false,
  schema: "ordinary",
  exportDemoState: "Completed",
};

const rows = [
  { ref: "STU-7F2A", name: "Maya R.", attendance: "Attended", rate: "83%", progress: "6 / 10", gain: "+2", corrected: true, count: 2, changed: "2026-07-28T14:11:02-06:00" },
  { ref: "STU-19C4", name: "Jon B.", attendance: "No-show", rate: "71%", progress: "4 / 10", gain: "+1", corrected: false, count: 0, changed: "" },
  { ref: "STU-A831", name: "Elena V.", attendance: "Attended", rate: "92%", progress: "8 / 10", gain: "+3", corrected: false, count: 0, changed: "" },
  { ref: "STU-335D", name: "Luis T.", attendance: "Attended", rate: "79%", progress: "5 / 10", gain: "+2", corrected: true, count: 1, changed: "2026-06-18T09:05:44-06:00" },
];

const adminRows = [
  { ref: "ORG-91C", name: "Northstar Learning", attendance: "82%", sponsorships: 24, progress: "31 units", exports: 7, corrected: true, count: 2, changed: "2026-07-28T14:11:02-06:00" },
  { ref: "ORG-44B", name: "Juniper Health", attendance: "76%", sponsorships: 18, progress: "19 units", exports: 3, corrected: false, count: 0, changed: "" },
  { ref: "ORG-C20", name: "Silverline Works", attendance: "89%", sponsorships: 31, progress: "42 units", exports: 5, corrected: false, count: 0, changed: "" },
  { ref: "ORG-7DA", name: "Civic Labs", attendance: "79%", sponsorships: 12, progress: "14 units", exports: 2, corrected: true, count: 1, changed: "2026-06-18T09:05:44-06:00" },
];

const ordinaryColumns = [
  ["schema_version", "string", "Contract version, e.g. org_progress.v1"],
  ["data_as_of", "timestamp", "Consistent snapshot instant"],
  ["requester_time_zone", "iana_tz", "Date-filter interpretation context"],
  ["period_start", "date", "Inclusive requester-local date"],
  ["period_end_exclusive", "date", "Exclusive requester-local date"],
  ["organization_ref", "opaque_id", "Authorized Organization reference"],
  ["organization_name", "string", "Authorized display name"],
  ["student_ref", "opaque_id", "Stable non-contact reference"],
  ["student_display_name", "string", "Authorized display name"],
  ["course_ref", "opaque_id", "Course reference"],
  ["target_language_code", "code", "Canonical unlocalized code"],
  ["curriculum_level_code", "code", "Canonical unlocalized code"],
  ["snapshot_kind", "code", "start | current | end"],
  ["snapshot_at", "timestamp", "Boundary or current snapshot time"],
  ["completed_unit_count", "integer", "Current effective numerator"],
  ["active_unit_count", "integer", "Frozen boundary denominator"],
  ["progress_percentage", "decimal", "Locale-independent decimal"],
  ["completed_during_sponsorship", "integer", "Period-attributed gain"],
  ["is_corrected", "boolean", "Whether any included fact was revised"],
  ["correction_count", "integer", "Number of revisions"],
  ["latest_correction_at", "timestamp?", "Latest revision time; blank if none"],
];

const historyColumns = [
  ["schema_version", "string", "Contract version, e.g. correction_history.v1"],
  ["data_as_of", "timestamp", "Consistent snapshot instant"],
  ["requester_time_zone", "iana_tz", "Date-filter interpretation context"],
  ["organization_ref", "opaque_id", "Authorized Organization reference"],
  ["subject_ref", "opaque_id", "Revised Attendance or snapshot reference"],
  ["subject_type", "code", "attendance | course_progress_snapshot"],
  ["student_ref", "opaque_id", "Stable non-contact reference"],
  ["field_code", "code", "Revised machine field"],
  ["revision_sequence", "integer", "One-based order for this subject field"],
  ["prior_value", "string?", "Canonical prior value"],
  ["current_value", "string", "Canonical effective value"],
  ["changed_at", "timestamp", "Revision commit instant"],
];

function shell(content) {
  const admin = isAdmin();
  const journeyTitle = admin ? "Platform operations" : "Northstar Learning";
  const journeys = admin
    ? ["Operations overview", "People & access", "Marketplace reports", "Audit Log"]
    : ["Sponsored students", "Reports & exports", "Cohorts", "Invitations"];
  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand">Lingua Common</div>
        <div class="role-pill"><span>Acting as</span><button id="roleButton">${state.actingRole} ▾</button></div>
        <div class="avatar">BR</div>
      </header>
      <div class="workspace">
        <nav class="journey-rail" aria-label="${state.actingRole} journeys">
          <div class="eyebrow">Journey map</div><h2>${journeyTitle}</h2>
          ${journeys.map((journey, index) => `<button class="journey-link ${index === 2 - (admin ? 0 : 1) ? "active" : ""}">${journey}</button>`).join("")}
          <div class="scope-card">Relationship scope<strong>${state.scope}</strong></div>
        </nav>
        <main class="stage">${content}</main>
      </div>
    </div>
    ${renderSchema()}
    <details class="state-inspector"><summary>Prototype state</summary><pre>${escapeHtml(JSON.stringify(state, null, 2))}</pre></details>
    <div class="switcher" aria-label="Prototype variant switcher">
      <button id="previousVariant" aria-label="Previous variant">←</button>
      <div class="switch-label">${state.variant} — ${variants[state.variant].name}</div>
      <button id="nextVariant" aria-label="Next variant">→</button>
    </div>`;
}

function commonHead(kicker) {
  const admin = isAdmin();
  const title = admin ? "Marketplace reporting" : "Sponsorship progress";
  const description = admin
    ? "Current effective operational results across the marketplace. Corrections remain visible while investigative actors and reasons stay in the filtered Audit Log."
    : "Current effective results for Northstar Learning. Valid corrections update period facts without changing the frozen Sponsorship boundary.";
  return `
    <div class="crumb">${admin ? "Platform operations / Marketplace reports" : "Reports & exports / Sponsorship progress"}</div>
    <div class="page-head">
      <div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${description}</p></div>
      <div class="actions"><button class="btn" data-schema>View CSV schemas</button><button class="btn primary" data-export>Create export</button></div>
    </div>
    <div class="filter-strip">
      <label class="field">From<input value="2026-04-01" readonly /></label>
      <label class="field">To (exclusive)<input value="2026-07-01" readonly /></label>
      <label class="field">${admin ? "Organization" : "Cohort"}<select><option>${admin ? "All organizations" : "All cohorts"}</option><option>${admin ? "Northstar Learning" : "Customer success"}</option></select></label>
      <div class="timezone">Dates use ${state.displayTimeZone}</div>
    </div>`;
}

function renderLedger() {
  if (isAdmin()) return renderAdminLedger();
  const tableRows = rows.map(r => `<tr class="${r.corrected ? "corrected-row" : ""}">
    <td><div class="name">${r.name}</div><div class="sub">${r.ref}</div></td>
    <td>${r.attendance}</td><td class="numeric">${r.rate}</td><td><b>${r.progress}</b><div class="sub">${r.gain} during Sponsorship</div></td>
    <td>${r.corrected ? `<span class="corrected">Corrected ×${r.count}</span><div class="sub">${r.changed}</div>` : `<span class="good">No revisions</span>`}</td>
    <td><button class="btn small" data-history="${r.ref}">${r.corrected ? "View history" : "Details"}</button></td></tr>`).join("");
  return commonHead("Variant A · exceptions before detail") + `
    <section class="metric-grid">
      <div class="metric"><span class="eyebrow">Sponsored students</span><b>24</b><span class="delta">21 with recorded outcomes</span></div>
      <div class="metric"><span class="eyebrow">Attendance rate</span><b>82%</b><span class="delta">44 of 54 recorded outcomes</span></div>
      <div class="metric"><span class="eyebrow">Units completed</span><b>31</b><span class="delta">during Sponsorship</span></div>
      <div class="metric"><span class="eyebrow">Unrecorded</span><b>3</b><span class="delta">excluded from rate</span></div>
    </section>
    <div class="exception-band"><span class="corrected">2 corrected rows</span><div><strong>Current values include valid revisions.</strong><div class="tiny muted">Prior and current values remain available in correction history.</div></div><button class="btn small" data-history="STU-7F2A">Review corrections</button></div>
    <section class="panel"><div class="panel-head"><h2>Student progress ledger</h2><span class="tiny muted">Data as of ${state.dataAsOf}</span></div>
      <div style="overflow:auto"><table><thead><tr><th>Student</th><th>Latest outcome</th><th>Attendance</th><th>Course progress</th><th>Revision status</th><th></th></tr></thead><tbody>${tableRows}</tbody></table></div>
    </section>${renderExportTray()}`;
}

function renderAdminLedger() {
  const tableRows = adminRows.map(r => `<tr class="${r.corrected ? "corrected-row" : ""}">
    <td><div class="name">${r.name}</div><div class="sub">${r.ref}</div></td><td>${r.sponsorships}</td><td>${r.attendance}</td><td>${r.progress}</td><td>${r.exports}</td>
    <td>${r.corrected ? `<span class="corrected">Corrected ×${r.count}</span><div class="sub">${r.changed}</div>` : `<span class="good">No revisions</span>`}</td><td><button class="btn small" data-history="${r.ref}">${r.corrected ? "View history" : "Details"}</button></td></tr>`).join("");
  return commonHead("Variant A · exceptions before detail") + `
    <section class="metric-grid"><div class="metric"><span class="eyebrow">Active Sponsorships</span><b>85</b><span class="delta">across 4 Organizations</span></div><div class="metric"><span class="eyebrow">Recorded attendance</span><b>81%</b><span class="delta">174 recorded outcomes</span></div><div class="metric"><span class="eyebrow">Corrected facts</span><b>3</b><span class="delta">2 Organizations affected</span></div><div class="metric"><span class="eyebrow">Exports completed</span><b>17</b><span class="delta">0 currently running</span></div></section>
    <div class="exception-band"><span class="corrected">3 corrected facts</span><div><strong>Ordinary reports show effective values.</strong><div class="tiny muted">Investigative actor and rationale require the separately authorized Audit Log.</div></div><button class="btn small" data-history="ORG-91C">Review corrections</button></div>
    <section class="panel"><div class="panel-head"><h2>Organization reporting ledger</h2><span class="tiny muted">Data as of ${state.dataAsOf}</span></div><div style="overflow:auto"><table><thead><tr><th>Organization</th><th>Sponsorships</th><th>Attendance</th><th>Progress gained</th><th>Exports</th><th>Revision status</th><th></th></tr></thead><tbody>${tableRows}</tbody></table></div></section>${renderExportTray()}`;
}

function renderStory() {
  if (isAdmin()) return commonHead("Variant B · explain the period") + `
    <div class="story-grid"><section class="panel story"><div class="eyebrow">Marketplace · Apr–Jun 2026</div><h2>Operations stayed stable while participation grew</h2><div class="big-rate">81%</div><div class="muted">attendance rate · 141 of 174 recorded outcomes</div><div class="bar"><i style="width:81%"></i></div><div class="story-callout"><span class="corrected">Current effective</span><p><b>Three corrected facts affect marketplace reporting.</b> Effective values and revision markers appear here; investigative context remains in the Audit Log.</p><button class="btn small" data-history="ORG-91C">See affected reports</button></div><h3>Organization signals</h3><div class="story-students">${adminRows.map((r, i) => `<div class="student-line"><div><div class="name">${r.name} ${r.corrected ? `<span class="corrected">corrected</span>` : ""}</div><div class="sub">${r.sponsorships} active Sponsorships · ${r.progress}</div></div><div class="mini-bar"><i style="width:${[82,76,89,79][i]}%"></i></div><button class="btn small" data-history="${r.ref}">Open</button></div>`).join("")}</div></section><aside class="panel timeline"><div class="eyebrow">Operational reading</div><h3>Evidence boundary</h3><div class="event"><b>Report scope fixed</b><span>Apr 1–Jul 1 · requester time zone</span></div><div class="event correct"><b>Facts corrected</b><span>Atomic downstream recomputation</span></div><div class="event"><b>Current truth presented</b><span>${state.dataAsOf}</span></div><div class="event"><b>Investigation separated</b><span>Actors and reasons in Audit Log</span></div><div class="contract"><b>Administrative boundary</b><br />Operational reports still exclude authentication identifiers, private feedback, Session Ratings, and free text unless a separately authorized report explicitly covers them.</div></aside></div>${renderExportTray()}`;
  return commonHead("Variant B · explain the period") + `
    <div class="story-grid">
      <section class="panel story">
        <div class="eyebrow">Northstar Learning · Apr–Jun 2026</div><h2>Participation stayed strong while progress broadened</h2>
        <div class="big-rate">82%</div><div class="muted">attendance rate · 44 of 54 recorded outcomes</div><div class="bar"><i></i></div>
        <div class="story-callout"><span class="corrected">Current effective</span><p><b>Two Attendance corrections changed this report.</b> One added a completion to the frozen Sponsorship period. The denominator remains 10 active Lesson Units.</p><button class="btn small" data-history="STU-7F2A">See what changed</button></div>
        <h3>Progress during Sponsorship</h3><div class="story-students">
          ${rows.map((r, i) => `<div class="student-line"><div><div class="name">${r.name} ${r.corrected ? `<span class="corrected">corrected</span>` : ""}</div><div class="sub">${r.progress} · ${r.gain} in this period</div></div><div class="mini-bar"><i style="width:${[60,40,80,50][i]}%"></i></div><button class="btn small" data-history="${r.ref}">Open</button></div>`).join("")}
        </div>
      </section>
      <aside class="panel timeline"><div class="eyebrow">How to read this</div><h3>Reporting timeline</h3>
        <div class="event"><b>Sponsorship accepted</b><span>Apr 1 · baseline 3 / 10</span></div>
        <div class="event"><b>Period activity</b><span>Apr 1–Jul 1 · frozen scope</span></div>
        <div class="event correct"><b>Attendance corrected</b><span>Jul 28 · completion recalculated</span></div>
        <div class="event"><b>Current report</b><span>Jul 29 · effective truth 6 / 10</span></div>
        <div class="contract"><b>Privacy boundary</b><br />Unit identities completed before Sponsorship, correction actors, reasons, private feedback, and total credit balance are not included.</div>
      </aside>
    </div>${renderExportTray()}`;
}

function renderWorkbench() {
  if (isAdmin()) return renderAdminWorkbench();
  return commonHead("Variant C · inspect and compose") + `
    <section class="workbench">
      <aside class="wb-sidebar"><div class="eyebrow">Fields</div><h3>Build report view</h3>
        ${["Student display name", "Attendance outcome", "Attendance rate", "Course progress", "Correction markers"].map((x, i) => `<label class="field-check"><input type="checkbox" ${i < 4 ? "checked" : ""}> ${x}</label>`).join("")}
        <div class="query-box">scope: Northstar Learning<br>period: [2026-04-01, 2026-07-01)<br>timezone: America/Denver<br>truth: current_effective</div>
        <button class="btn" data-schema>Inspect schema</button>
      </aside>
      <div class="wb-table-wrap"><table class="wb-table"><thead><tr><th>Student ref</th><th>Display name</th><th>Outcome</th><th>Attendance</th><th>Completed</th><th>Active</th><th>Corrected</th></tr></thead><tbody>
        ${rows.map(r => `<tr data-select="${r.ref}" class="${r.ref === state.selectedStudent ? "selected" : ""}"><td><code>${r.ref}</code></td><td>${r.name}</td><td>${r.attendance}</td><td>${r.rate}</td><td>${r.progress.split(" / ")[0]}</td><td>10</td><td>${r.corrected ? `true · ${r.count}` : "false"}</td></tr>`).join("")}
      </tbody></table></div>
      <aside class="wb-inspector"><div class="eyebrow">Selected row</div><h3>Maya R. · STU-7F2A</h3><dl class="detail-list"><dt>Snapshot kind</dt><dd>current</dd><dt>Current progress</dt><dd>6 / 10</dd><dt>Period gain</dt><dd>+2</dd><dt>Correction count</dt><dd>2</dd><dt>Latest correction</dt><dd>Jul 28</dd></dl><hr><p class="tiny muted">The current value is queryable here. Prior/current pairs live in the separately authorized correction-history view.</p><button class="btn small" data-history="STU-7F2A">Open revision rows</button></aside>
    </section>${renderExportTray()}`;
}

function renderAdminWorkbench() {
  return commonHead("Variant C · inspect and compose") + `
    <section class="workbench"><aside class="wb-sidebar"><div class="eyebrow">Fields</div><h3>Build operational view</h3>${["Organization name", "Active Sponsorships", "Attendance rate", "Progress gained", "Correction markers"].map((x, i) => `<label class="field-check"><input type="checkbox" ${i < 4 ? "checked" : ""}> ${x}</label>`).join("")}<div class="query-box">scope: marketplace<br>period: [2026-04-01, 2026-07-01)<br>timezone: America/Denver<br>truth: current_effective</div><button class="btn" data-schema>Inspect schema</button></aside><div class="wb-table-wrap"><table class="wb-table"><thead><tr><th>Organization ref</th><th>Display name</th><th>Sponsorships</th><th>Attendance</th><th>Progress gained</th><th>Corrected</th></tr></thead><tbody>${adminRows.map(r => `<tr data-select="${r.ref}" class="${r.ref === state.selectedStudent ? "selected" : ""}"><td><code>${r.ref}</code></td><td>${r.name}</td><td>${r.sponsorships}</td><td>${r.attendance}</td><td>${r.progress}</td><td>${r.corrected ? `true · ${r.count}` : "false"}</td></tr>`).join("")}</tbody></table></div><aside class="wb-inspector"><div class="eyebrow">Selected row</div><h3>Northstar Learning · ORG-91C</h3><dl class="detail-list"><dt>Active Sponsorships</dt><dd>24</dd><dt>Attendance rate</dt><dd>82%</dd><dt>Units gained</dt><dd>31</dd><dt>Correction count</dt><dd>2</dd><dt>Latest correction</dt><dd>Jul 28</dd></dl><hr><p class="tiny muted">Correction history gives prior/current values. Actor and reason belong to the filtered Audit Log.</p><button class="btn small" data-history="ORG-91C">Open revision rows</button></aside></section>${renderExportTray()}`;
}

function renderExportTray() {
  const states = ["Queued", "Running", "Completed", "Failed", "Expired"];
  return `<section class="panel export-tray"><div class="panel-head"><div><h3>Export jobs</h3><div class="tiny muted">One Queued or Running job at a time · completed files expire after 24 hours</div></div><button class="btn small" data-export>Demo next state</button></div>
    <div class="job-list">${states.map((s, i) => `<div class="job"><span class="status ${s.toLowerCase()}">${s}</span><b>${["Waiting for worker", "Attempt 2 of 3", "24,118 rows · Download", "No file created", "Generate a fresh export"][i]}</b><span>${["Authorization checked at start", "Snapshot captured · never mixed", "data_as_of fixed at generation", "Requester notified after terminal failure", "Authorization no longer grants download"][i]}</span></div>`).join("")}</div></section>`;
}

function renderSchema() {
  const columns = state.schema === "ordinary" ? ordinaryColumns : historyColumns;
  const sample = state.schema === "ordinary"
    ? "schema_version,data_as_of,requester_time_zone,organization_ref,student_ref,completed_unit_count,active_unit_count,progress_percentage,is_corrected,correction_count,latest_correction_at\norg_progress.v1,2026-07-29T17:42:10-06:00,America/Denver,ORG-91C,STU-7F2A,6,10,60.0,true,2,2026-07-28T14:11:02-06:00"
    : "schema_version,data_as_of,organization_ref,subject_ref,subject_type,field_code,revision_sequence,prior_value,current_value,changed_at\ncorrection_history.v1,2026-07-29T17:42:10-06:00,ORG-91C,ATT-18A,attendance,outcome,2,no_show,attended,2026-07-28T14:11:02-06:00";
  return `<div class="schema-overlay ${state.schemaOpen ? "open" : ""}" id="schemaOverlay"><section class="schema-dialog" role="dialog" aria-modal="true" aria-label="CSV schema explorer">
    <div class="schema-top"><div><div class="eyebrow" style="color:#b9d2c8">Stable machine contract</div><h2>CSV schema explorer</h2></div><button id="closeSchema">Close</button></div>
    <div class="schema-tabs"><button class="schema-tab ${state.schema === "ordinary" ? "active" : ""}" data-schema-tab="ordinary">Ordinary report</button><button class="schema-tab ${state.schema === "history" ? "active" : ""}" data-schema-tab="history">Correction history</button></div>
    <div class="schema-body"><div class="contract">UTF-8 · English <code>snake_case</code> headers · canonical codes · ISO 8601 timestamps · explicit IANA time zone · no localized display strings in coded fields · reject rather than truncate above 25,000 rows</div>
      <div class="schema-columns">${columns.map(c => `<div class="column"><code>${c[0]}</code><span>${c[1]}</span><span class="muted">${c[2]}</span></div>`).join("")}</div><div class="sample">${escapeHtml(sample)}</div>
      <div class="contract" style="margin-top:14px"><b>Always excluded:</b> email and authentication identifiers, free text, Session Ratings, correction actors and reasons, administrator notes, total Class Credit balance, and per-Booking credit provenance.</div>
    </div></section></div>`;
}

function render() {
  if (!variants[state.variant]) state.variant = "A";
  document.getElementById("app").innerHTML = shell(variants[state.variant].render());
  bind();
}

function bind() {
  document.getElementById("previousVariant").onclick = () => cycle(-1);
  document.getElementById("nextVariant").onclick = () => cycle(1);
  document.querySelectorAll("[data-schema]").forEach(b => b.onclick = () => { state.schemaOpen = true; render(); });
  document.querySelectorAll("[data-export]").forEach(b => b.onclick = () => {
    const jobs = ["Queued", "Running", "Completed", "Failed", "Expired"];
    state.exportDemoState = jobs[(jobs.indexOf(state.exportDemoState) + 1) % jobs.length];
    alert(`Prototype export is now ${state.exportDemoState}.\n\nThe visible job-state strip shows the complete lifecycle and user-facing recovery language.`);
    render();
  });
  document.querySelectorAll("[data-history]").forEach(b => b.onclick = () => {
    const ref = b.dataset.history;
    alert(ref === "STU-7F2A" ? "Correction history · Maya R.\n\n1 · outcome: no_show → attended · 2026-07-28T14:11:02-06:00\n2 · completed_unit_count: 5 → 6 · same atomic correction\n\nActor and reason are intentionally absent. Open the separately authorized Audit Log to investigate them." : `Detail for ${ref}\n\nNo correction history is exposed for an unchanged fact.`);
  });
  document.querySelectorAll("[data-select]").forEach(r => r.onclick = () => { state.selectedStudent = r.dataset.select; render(); });
  const close = document.getElementById("closeSchema");
  if (close) close.onclick = () => { state.schemaOpen = false; render(); };
  document.querySelectorAll("[data-schema-tab]").forEach(b => b.onclick = () => { state.schema = b.dataset.schemaTab; state.schemaOpen = true; render(); });
  document.getElementById("roleButton").onclick = () => {
    state.actingRole = isAdmin() ? "Organization Manager" : "Platform Administrator";
    state.scope = isAdmin() ? "Marketplace-wide · Operational reports" : "Northstar Learning · Active Sponsorships";
    state.selectedStudent = isAdmin() ? "ORG-91C" : "STU-7F2A";
    render();
  };
}

function isAdmin() { return state.actingRole === "Platform Administrator"; }

function cycle(delta) {
  const keys = Object.keys(variants);
  const index = keys.indexOf(state.variant);
  state.variant = keys[(index + delta + keys.length) % keys.length];
  const params = new URLSearchParams(location.search);
  params.set("variant", state.variant);
  history.replaceState({}, "", `${location.pathname}?${params}`);
  render();
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
}

addEventListener("keydown", event => {
  const tag = document.activeElement?.tagName;
  if (["INPUT", "TEXTAREA"].includes(tag) || document.activeElement?.isContentEditable) return;
  if (event.key === "ArrowLeft") cycle(-1);
  if (event.key === "ArrowRight") cycle(1);
  if (event.key === "Escape" && state.schemaOpen) { state.schemaOpen = false; render(); }
});

render();
