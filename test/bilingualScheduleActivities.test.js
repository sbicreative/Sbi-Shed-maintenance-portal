const test = require("node:test");
const assert = require("node:assert/strict");
const bilingual = require(
    "../public/js/bilingual-schedule-activities"
);

test("technical names remain English in Hindi activity line", () => {
    assert.equal(
        bilingual.translateActivity(
            "Check Working of Pantograph"
        ),
        "Pantograph की कार्यशीलता जाँचें।"
    );
    assert.equal(
        bilingual.translateActivity("Clean VCB insulator"),
        "VCB insulator को साफ करें।"
    );
});

test("common schedule actions receive Hindi instructions", () => {
    assert.equal(
        bilingual.translateActivity(
            "Condition of Silica Gel of SR-1"
        ),
        "Silica Gel of SR-1 की स्थिति जाँचें।"
    );
    assert.equal(
        bilingual.translateActivity("Measure Battery Voltage"),
        "Battery Voltage मापें।"
    );
});

test("existing bilingual text is not translated twice", () => {
    assert.equal(
        bilingual.translateActivity("जाँच की सूची CHECK LIST"),
        ""
    );
});
