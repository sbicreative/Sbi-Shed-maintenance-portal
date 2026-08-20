const test = require("node:test");
const assert = require("node:assert/strict");
const bilingual = require(
    "../public/js/bilingual-schedule-activities"
);
const fullHindiTranslations = require(
    "../public/js/schedule-hindi-translations"
);

test("all generated schedule instructions have complete static Hindi lines", () => {
    const entries = Object.entries(fullHindiTranslations);
    assert.equal(entries.length, 506);
    assert.ok(entries.every(([, hindi]) => /[\u0900-\u097f]/.test(hindi)));

    const pressureInstruction = entries.find(([english]) =>
        english.includes("SA-9 Direct Brake")
    );
    assert.ok(pressureInstruction);
    assert.match(pressureInstruction[1], /SA-9 Direct Brake लगाए बिना/);
    assert.match(pressureInstruction[1], /SA-9 Direct Brake लगाकर/);
    assert.match(pressureInstruction[1], /kg\/cm 2/);

    const fduInstruction = entries.find(([english]) =>
        english.includes("Calibrate the FDU")
    );
    assert.ok(fduInstruction);
    for (const technicalText of ["FDU", "Trolex", "Siemens/Cerberus", "mV"]) {
        assert.match(fduInstruction[1], new RegExp(technicalText.replace("/", "\\/")));
    }
});

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

test("alternate electrical and mechanical form wording receives verified Hindi", () => {
    assert.equal(
        bilingual.translateActivity("Wiper Operation"),
        "वाइपर की कार्यशीलता जाँचें।"
    );
    assert.equal(
        bilingual.translateActivity(
            "While Loco is energised, check the following:"
        ),
        "लोको ऊर्जित होने पर निम्न बिंदुओं की जाँच करें:"
    );
    assert.equal(
        bilingual.translateActivity("No air leakage"),
        "वायु रिसाव नहीं होना सुनिश्चित करें।"
    );
});
