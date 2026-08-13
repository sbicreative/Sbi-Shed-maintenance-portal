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
