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
        ["routes/assignWorkRoutes.js", /remarks: work\.remarks \|\| null/],
        ["routes/manpowerRoutes.js", /remarks:\s*remarks \|\| null/],
        ["routes/scheduleFormRoutes.js", /staff_remarks: staffRemarks \|\| null/],
        ["routes/scheduleFormRoutes.js", /update\.supervisor_remarks = remarks \|\| null/],
        ["routes/scheduleFormRoutes.js", /update\.incharge_remarks = remarks \|\| null/]
    ];
    for (const [file, pattern] of sources) {
        assert.match(fs.readFileSync(path.join(root, file), "utf8"), pattern);
    }
});
