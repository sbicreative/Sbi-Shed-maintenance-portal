const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const migration = fs.readFileSync(path.join(root, "database", "14_repair_schedule_remarks.sql"), "utf8");

test("repair remarks migration creates an append-only table without backfill", () => {
    assert.match(migration, /BEFORE UPDATE ON repair_schedule_remarks/);
    assert.match(migration, /BEFORE DELETE ON repair_schedule_remarks/);
    assert.doesNotMatch(migration, /INSERT INTO repair_schedule_remarks/i);
    assert.doesNotMatch(migration, /UPDATE\s+(assign_work|manpower|schedule_form)/i);
});

test("all three role dashboards expose the Repairs Schedule timeline", () => {
    for (const name of ["incharge.html", "supervisor.html", "staff.html"]) {
        const html = fs.readFileSync(path.join(root, "public", "dashboard", name), "utf8");
        assert.match(html, /repairs-schedule\.html/);
        assert.match(html, /id="repairRemarksFeed"/);
        assert.match(html, /repair-remarks-feed\.js/);
    }
});

test("dashboard repair remark feed enforces the confirmed cross-role audiences", () => {
    const route = fs.readFileSync(path.join(root, "routes", "repairScheduleRoutes.js"), "utf8");
    assert.match(route, /incharge:\s*new Set\(\["supervisor", "staff"\]\)/);
    assert.match(route, /supervisor:\s*new Set\(\["incharge", "staff"\]\)/);
    assert.match(route, /staff:\s*new Set\(\["incharge", "supervisor"\]\)/);
});

test("Repairs work created as Active remains selectable in every schedule", () => {
    const route = fs.readFileSync(path.join(root, "routes", "workMasterRoutes.js"), "utf8");
    assert.match(route, /\.in\("status", \["true", "Active"\]\)/);
});

test("dashboard logo references match case-sensitive production filenames", () => {
    const dashboardDir = path.join(root, "public", "dashboard");
    for (const name of fs.readdirSync(dashboardDir).filter(name => name.endsWith(".html"))) {
        const html = fs.readFileSync(path.join(dashboardDir, name), "utf8");
        assert.doesNotMatch(html, /images\/(?:ir-logo|sbi-logo)\.jpeg/);
        assert.doesNotMatch(html, /images\/(?:IR logo|SBI shed logo)\.jpeg/);
    }
});

test("legacy remark fields remain in their established write routes", () => {
    const sources = [
        ["routes/assignWorkRoutes.js", /remarks: work\.remarks\.length \? work\.remarks\.join\("\\n"\) : null/],
        ["routes/manpowerRoutes.js", /remarks: remarkList\.length \? remarkList\.join\("\\n"\) : null/],
        ["routes/scheduleFormRoutes.js", /staff_remarks: staffRemarks \|\| null/],
        ["routes/scheduleFormRoutes.js", /update\.supervisor_remarks = remarks \|\| null/],
        ["routes/scheduleFormRoutes.js", /update\.incharge_remarks = remarks \|\| null/]
    ];
    for (const [file, pattern] of sources) {
        assert.match(fs.readFileSync(path.join(root, file), "utf8"), pattern);
    }
});

test("Incharge can submit multiple work-level remarks without overwriting history", () => {
    const client = fs.readFileSync(path.join(root, "public", "js", "assign-work.js"), "utf8");
    const route = fs.readFileSync(path.join(root, "routes", "assignWorkRoutes.js"), "utf8");
    assert.match(client, /add-remark-btn/);
    assert.match(client, /data-remark-key/);
    assert.match(route, /for \(const remarkText of sourceWork\?\.remarks \|\| \[\]\)/);
    assert.match(route, /remarks\.join\("\\n"\)/);
});

test("Supervisor sees existing work remarks and adds multiple remarks only once through Lead Staff", () => {
    const client = fs.readFileSync(path.join(root, "public", "js", "manpower-distribution.js"), "utf8");
    const route = fs.readFileSync(path.join(root, "routes", "manpowerRoutes.js"), "utf8");
    assert.match(client, /existing-remarks-list/);
    assert.match(client, /add-supervisor-remark/);
    assert.match(client, /remarks: isLead \? remarks : \[\]/);
    assert.match(route, /repair_remarks:/);
    assert.match(route, /for \(const remarkText of remarkList\)/);
});

test("Staff receives remarks only for locos assigned to that Staff member", () => {
    const client = fs.readFileSync(path.join(root, "public", "js", "staff.js"), "utf8");
    const feed = fs.readFileSync(path.join(root, "public", "js", "repair-remarks-feed.js"), "utf8");
    const route = fs.readFileSync(path.join(root, "routes", "manpowerRoutes.js"), "utf8");
    const html = fs.readFileSync(path.join(root, "public", "dashboard", "staff.html"), "utf8");
    assert.match(html, /<th>Assigned Work<\/th>\s*<th>Remarks<\/th>/);
    assert.match(client, /loco_repair_remarks/);
    assert.match(client, /assigned-repair-locos-ready/);
    assert.match(feed, /assignedRepairLocoNumbers \|\| new Set\(\)/);
    assert.match(route, /\.in\("author_role", \["Incharge", "Supervisor"\]\)/);
    assert.match(route, /loco_repair_remarks: remarksForHeader/);
});

test("Repair Schedule is always available to reviewers but conditional for Staff", () => {
    const staffHtml = fs.readFileSync(path.join(root, "public", "dashboard", "staff.html"), "utf8");
    const staffClient = fs.readFileSync(path.join(root, "public", "js", "staff.js"), "utf8");
    const repairsClient = fs.readFileSync(path.join(root, "public", "js", "repairs-schedule.js"), "utf8");
    assert.match(staffHtml, /id="repairsScheduleBtn"[^>]*hidden/);
    assert.match(staffClient, /hasLocoAssignment/);
    assert.match(repairsClient, /role === "incharge" \|\| role === "supervisor"/);
    assert.match(repairsClient, /if \(!locoAssignments\.length\)/);
    assert.match(repairsClient, /allowedStaffLocos = new Set/);
});

test("Man Power table keeps headings aligned and requires one visible Lead Staff", () => {
    const html = fs.readFileSync(path.join(root, "public", "dashboard", "manpower-distribution.html"), "utf8");
    const client = fs.readFileSync(path.join(root, "public", "js", "manpower-distribution.js"), "utf8");
    const css = fs.readFileSync(path.join(root, "public", "css", "pwa-responsive.css"), "utf8");
    const route = fs.readFileSync(path.join(root, "routes", "manpowerRoutes.js"), "utf8");
    assert.match(html, /class="manpower-page"/);
    assert.match(css, /\.manpower-page table\.mobile-manpower-table \{ display:table !important/);
    assert.match(client, /<span>Lead Staff<\/span>/);
    assert.match(client, /staffRows\.filter\(item => item\.isLead\)\.length !== 1/);
    const saveRoute = route.slice(route.indexOf('router.post("/"'));
    assert.ok(
        saveRoute.indexOf('code: "LEAD_STAFF_REQUIRED"') < saveRoute.indexOf(".insert([{"),
        "view-only staff must be rejected before insertion when no Lead exists"
    );
});

test("Incharge and Supervisor dashboards add multiple remarks only to owned assigned work", () => {
    const route = fs.readFileSync(path.join(root, "routes", "repairScheduleRoutes.js"), "utf8");
    const client = fs.readFileSync(path.join(root, "public", "js", "dashboard-remark-entry.js"), "utf8");
    for (const name of ["incharge.html", "supervisor.html"]) {
        const html = fs.readFileSync(path.join(root, "public", "dashboard", name), "utf8");
        assert.match(html, /id="dashboardRemarkForm"/);
        assert.match(html, /dashboard-remark-entry\.js/);
    }
    assert.match(client, /dashboardAddRemark/);
    assert.match(client, /remarks = Array\.from/);
    assert.match(route, /router\.get\("\/assignment-options"/);
    assert.match(route, /router\.post\("\/remarks"/);
    assert.match(route, /if \(!ownsAssignment\)/);
    assert.match(route, /for \(const remarkText of remarks\)/);
    assert.match(route, /source_type: "dashboard_remark"/);
});

test("Assign Work uses an aligned two-row phone layout without hiding remarks", () => {
    const html = fs.readFileSync(path.join(root, "public", "dashboard", "assign-work.html"), "utf8");
    const css = fs.readFileSync(path.join(root, "public", "css", "assign-work.css"), "utf8");
    assert.match(html, /<body class="assign-work-page">/);
    assert.match(css, /\.assign-work-page \.table-container tbody tr \{ display:grid; grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
    assert.match(css, /td:nth-child\(6\) \{ grid-column:span 2; \}/);
});
