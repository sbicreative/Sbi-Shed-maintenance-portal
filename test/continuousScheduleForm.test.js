const test = require("node:test");
const assert = require("node:assert/strict");
const { mergeLockedAnswers, completionState } = require("../lib/continuousScheduleForm");
const fs = require("node:fs");
const path = require("node:path");
const migration = fs.readFileSync(path.resolve(__dirname, "../database/15_continuous_schedule_forms.sql"), "utf8");
const leadMigration = fs.readFileSync(path.resolve(__dirname, "../database/16_lead_staff_schedule_forms.sql"), "utf8");

test("submitted Staff fields remain locked during continuation", () => {
    const result = mergeLockedAnswers(
        { a: "first value", b: "" },
        { a: "overwrite attempt", b: "second value" },
        { a: { staff_id: 1, staff_name: "First Staff", entered_at: "2026-08-13T00:00:00Z" } },
        { staff_id: 2, staff_name: "Second Staff", timestamp: "2026-08-14T00:00:00Z", lock_new: true }
    );
    assert.equal(result.answers.a, "first value");
    assert.equal(result.answers.b, "second value");
    assert.equal(result.attributions.a.staff_name, "First Staff");
    assert.equal(result.attributions.b.staff_name, "Second Staff");
});

test("draft fields remain editable until submitted", () => {
    const result = mergeLockedAnswers(
        { a: "draft one" }, { a: "draft two" }, {},
        { staff_id: 1, staff_name: "Staff", lock_new: false }
    );
    assert.equal(result.answers.a, "draft two");
    assert.deepEqual(result.attributions, {});
});

test("completion requires every rendered answer key", () => {
    assert.deepEqual(completionState(["a", "b"], { a: "x", b: "" }), {
        filled: 1, total: 2, complete: false
    });
    assert.equal(completionState(["a", "b"], { a: "x", b: "y" }).complete, true);
});

test("continuous workflow migration includes Repairs, continuation, and action attribution", () => {
    assert.match(migration, /schedule_form_continuations/);
    assert.match(migration, /answer_attributions JSONB/);
    assert.match(migration, /repair_schedule_actions/);
    assert.match(migration, /'Repairs'/);
    assert.match(migration, /Submitted Incomplete/);
    assert.match(migration, /Submitted Complete/);
    assert.match(migration, /ensure_repairs_work_for_schedule/);
    assert.match(migration, /ON CONFLICT\(form_code\) WHERE form_code IS NOT NULL/);
    assert.match(migration, /department_id, section_id/);
    assert.match(migration, /loco_type, schedule_name/);
});

test("repair Action Taken is stored separately from immutable remarks", () => {
    const routes = fs.readFileSync(path.resolve(__dirname, "../routes/scheduleFormRoutes.js"), "utf8");
    assert.match(routes, /\.from\("repair_schedule_actions"\)/);
    assert.doesNotMatch(routes, /appendRepairRemark\([\s\S]{0,300}action_taken/);
    assert.match(routes, /\^repair_\\d\+\$/);
});

test("locked bilingual format auto-renders Staff attribution", () => {
    const staffForm = fs.readFileSync(path.resolve(__dirname, "../public/js/schedule-form.js"), "utf8");
    const reviewForm = fs.readFileSync(path.resolve(__dirname, "../public/js/schedule-review-form.js"), "utf8");
    for (const source of [staffForm, reviewForm]) {
        assert.match(source, /Action Taken<br><small>की गई कार्रवाई<\/small>/);
        assert.match(source, /Name of TCN\/Staff<br><small>तकनीशियन\/कर्मचारी का नाम<\/small>/);
        assert.match(source, /Remark<br><small>टिप्पणी<\/small>/);
    }
});

test("database permits only one active Lead Staff per work", () => {
    assert.match(leadMigration, /is_lead BOOLEAN NOT NULL DEFAULT FALSE/);
    assert.match(leadMigration, /UNIQUE INDEX IF NOT EXISTS uq_manpower_active_lead_per_work/);
    assert.match(leadMigration, /WHERE is_lead = TRUE AND status <> 'Completed'/);
    assert.match(leadMigration, /assign_work_detail_id BIGINT/);
    assert.match(leadMigration, /uq_schedule_form_work_detail/);
});
