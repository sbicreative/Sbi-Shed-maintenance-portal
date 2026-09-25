const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { summerDriveTemplate, monsoonDriveTemplate, winterDriveTemplate } = require("../lib/seasonalDriveTemplates");

test("seasonal drive templates are fillable without a permanent action column", () => {
    for (const html of [summerDriveTemplate(), monsoonDriveTemplate(), winterDriveTemplate()]) {
        assert.match(html, /data-admin-field-type="inspection"/);
        assert.doesNotMatch(html, /<th>Action Taken/);
        assert.match(html, /Name of TCN \/ Remarks/);
    }
    assert.match(summerDriveTemplate(), /data-admin-field-type="value"/);
    assert.doesNotMatch(summerDriveTemplate(), /<h3>Air Delivery Measurements/);
    assert.doesNotMatch(summerDriveTemplate(), /<h3>TM Temperature/);
});

test("seasonal fields use conditional actions and standard-value assessment", () => {
    const client = fs.readFileSync(path.resolve(__dirname, "../public/js/schedule-form.js"), "utf8");
    assert.match(client, /explicitType === "inspection"/);
    assert.match(client, /item-action-taken/);
    assert.match(client, /assessMeasurement\(value, standard\)/);
    assert.match(client, /answer-invalid/);
    assert.match(client, /answer-valid/);
});

test("FRC customer feedback and Point A use the confirmed controls", () => {
    const client = fs.readFileSync(path.resolve(__dirname, "../public/js/schedule-form.js"), "utf8");
    assert.match(client, /prepareCustomerFeedbackTable/);
    assert.match(client, /add-customer-feedback-row/);
    assert.match(client, /type: customerFeedbackTable \? "text" : "value"/);
    assert.match(client, /Remarks<br><small>टिप्पणी<\/small>/);
    assert.match(client, /prepareIncomingPointATable/);
    assert.match(client, /\[5,6,7,8,11,12,13,14,15,16,19,20,23\]/);
    assert.match(client, /options: \["Working", "Not Working", "N\.A\."\]/);
    assert.match(client, /\[21,22\]/);
    assert.match(client, /options: \["Same", "Different", "N\.A\."\]/);
    assert.doesNotMatch(client, /dataset\.bulkOkDisabled = "true"/);
    assert.match(client, /bulkOkAllowed/);
});

test("seasonal drive source PDFs are packaged for Render", () => {
    const root = path.resolve(__dirname, "../Project Documents/MASTER/El schedule form");
    for (const name of [
        "EL 3-Phase  IAIBIC -Summer Drive 3.pdf",
        "EL 3-Phase  IAIBIC -Monsoon Drive.pdf",
        "EL 3-Phase  IAIBIC-Winter drive.pdf"
    ]) assert.equal(fs.existsSync(path.join(root, name)), true, name);
});

test("seasonal-only import maps the confirmed work names", () => {
    const importer = fs.readFileSync(path.resolve(__dirname, "../import-schedule-form-master.js"), "utf8");
    assert.match(importer, /EL_SUMMER_DRIVE[\s\S]*workNames: \["SUMMER DRIVE"\]/);
    assert.match(importer, /EL_MONSOON_DRIVE[\s\S]*workNames: \["MONSOON DRIVE"\]/);
    assert.match(importer, /EL_WINTER_DRIVE[\s\S]*workNames: \["WINTER DRIVE"\]/);
    assert.equal((importer.match(/scheduleTypes: \["IA", "IB", "IC"\]/g) || []).length >= 3, true);
    assert.match(importer, /process\.env\.SEASONAL_ONLY === "1"/);
});
