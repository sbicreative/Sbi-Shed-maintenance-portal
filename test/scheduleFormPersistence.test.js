const test = require("node:test");
const assert = require("node:assert/strict");
const { splitScheduleAnswers } = require("../lib/scheduleFormPersistence");
const fs = require("node:fs");
const path = require("node:path");

test("keeps measurements, exceptions, actions and remarks but omits routine OK", () => {
    const result = splitScheduleAnswers({
        voltage: "109.5",
        routine: "Checked OK",
        defect: "Not Working",
        action: "Replaced fuse",
        remark: "TCN Sharma",
        empty: ""
    }, {
        voltage: { kind: "measurement", label: "Battery voltage", unit: "V", standard_value: "100-110" },
        routine: { kind: "inspection", label: "Visual check" },
        defect: { kind: "inspection", label: "Blower" },
        action: { kind: "action-taken", label: "Action Taken" },
        remark: { kind: "remarks", label: "Remarks / TCN Name" }
    });

    assert.deepEqual(Object.keys(result.structuredAnswers).sort(), ["action", "defect", "remark", "voltage"]);
    assert.equal(result.records.find(item => item.answer_key === "voltage").numeric_value, 109.5);
    assert.equal(result.records.find(item => item.answer_key === "defect").retention_reason, "exception");
});

test("keeps positive textual readings when the field is an important measurement", () => {
    const result = splitScheduleAnswers(
        { gi_result: "Working", final_result: "Good" },
        {
            gi_result: { kind: "measurement", section: "Schedule check-3" },
            final_result: { kind: "measurement", section: "Schedule check-8" }
        }
    );
    assert.deepEqual(Object.keys(result.structuredAnswers), ["gi_result", "final_result"]);
});

test("database migration creates searchable values and private approved-form storage", () => {
    const migration = fs.readFileSync(
        path.join(__dirname, "../database/21_schedule_form_database_storage_split.sql"),
        "utf8"
    );
    assert.match(migration, /CREATE TABLE IF NOT EXISTS schedule_form_search_values/);
    assert.match(migration, /loco_no, schedule_name, schedule_date DESC/);
    assert.match(migration, /'approved-schedule-forms'/);
    assert.match(migration, /false,\s*52428800/);
});

test("staff submission sends persistence metadata without changing rendered form markup", () => {
    const client = fs.readFileSync(
        path.join(__dirname, "../public/js/schedule-form.js"),
        "utf8"
    );
    assert.match(client, /function collectFieldMetadata\(\)/);
    assert.match(client, /field_metadata: collectFieldMetadata\(\)/);
});
test('pre-migration deployments keep the existing database save path; unrelated errors are not hidden', async () => {
    const { supportsSplitStorage } = require('../lib/scheduleFormPersistence');
    const db = error => ({ from: () => ({ select: () => ({ limit: async () => ({ error }) }) }) });
    assert.equal(await supportsSplitStorage(db(null)), true);
    assert.equal(await supportsSplitStorage(db({ code: '42703' })), false);
    assert.equal(await supportsSplitStorage(db({ code: 'PGRST204' })), false);
    await assert.rejects(supportsSplitStorage(db(new Error('connection failed'))), /connection failed/);
});
