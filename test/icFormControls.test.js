const test = require("node:test");
const assert = require("node:assert/strict");
const rules = require("../public/js/ic-form-controls");

test("typed controls apply to maintenance schedules", () => {
    assert.equal(rules.isIcSchedule("IC"), true);
    assert.equal(rules.isTypedSchedule("IC"), true);
    assert.equal(rules.isTypedSchedule("IA"), true);
    assert.equal(rules.isTypedSchedule("IB"), true);
    assert.equal(rules.isTypedSchedule("TI-3 PHASE"), true);
    assert.equal(rules.isTypedSchedule("OUT OF COURSE"), true);
});

test("typed controls exclude commissioning", () => {
    assert.equal(rules.isTypedSchedule("IC-O"), false);
    assert.equal(
        rules.isTypedSchedule("Commissioning (IC-O)"),
        false
    );
    assert.equal(rules.isTypedSchedule(""), false);
});

test("IC measurement rows keep value inputs", () => {
    assert.equal(
        rules.classify("Battery Voltage", "Actual Value").type,
        "value"
    );
    assert.equal(
        rules.classify("Measure pantograph strip thickness", "PT-1").type,
        "value"
    );
});

test("IC operational rows receive specific choices", () => {
    assert.equal(
        rules.classify("Check pipe for any leakage", "Action Taken").kind,
        "leakage"
    );
    assert.equal(
        rules.classify("Check pipe for any leakage", "Observed").kind,
        "leakage"
    );
    assert.equal(
        rules.classify("Clean the filter", "Observed").kind,
        "action"
    );
    assert.equal(
        rules.classify("Check motor working", "Observed").kind,
        "working"
    );
});

test("negative IC results are marked adverse", () => {
    assert.equal(rules.isAdverse("Defect Found"), true);
    assert.equal(rules.isAdverse("Checked OK"), false);
});

test("actual measurements are checked against common standard value formats", () => {
    assert.equal(rules.assessMeasurement("7.2", "6.0 - 8.0 kg/cm²"), true);
    assert.equal(rules.assessMeasurement("8.5", "6.0 - 8.0 kg/cm²"), false);
    assert.equal(rules.assessMeasurement("7", "6-8 kg/cm²"), true);
    assert.equal(rules.assessMeasurement("49", "< 50 mV"), true);
    assert.equal(rules.assessMeasurement("50", "< 50 mV"), false);
    assert.equal(rules.assessMeasurement("148", "150 ± 3 KN"), true);
    assert.equal(rules.assessMeasurement("146", "150 ± 3 KN"), false);
    assert.equal(rules.assessMeasurement("abc", "6 - 8"), null);
    assert.equal(rules.isAdverse("Not OK"), true);
});
