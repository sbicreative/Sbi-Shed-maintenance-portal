const test = require("node:test");
const assert = require("node:assert/strict");

const {
    identityKey,
    normalizeMobileNumber,
    normalizeName,
    normalizePfNumber
} = require("../lib/masterIdentity");

test("mobile numbers ignore formatting and optional country code", () => {
    assert.equal(normalizeMobileNumber("98765 43210"), "9876543210");
    assert.equal(normalizeMobileNumber("+91-98765-43210"), "9876543210");
});
const { buildPlan } = require("../lib/importMasterWorkbook");

test("PF numbers are stored in one canonical form", () => {
    assert.equal(normalizePfNumber(" 50819-150109 "), "50819150109");
    assert.equal(normalizePfNumber("50819150109.0"), "50819150109");
    assert.equal(normalizePfNumber(""), "");
});

test("name normalization handles observed Excel/user differences", () => {
    assert.equal(normalizeName('" Kaluram Prajapat'), normalizeName("Kalu Ram Prajapat"));
    assert.equal(
        normalizeName("DIWAN DINESHCHANDRA (Incharge)"),
        normalizeName("Diwan Dinesh chandra")
    );
    assert.equal(normalizeName("Sh. Jignesh Zinzala"), normalizeName("Jignesh Zinzala"));
});

test("import plan prefers PF and only uses unique identity for legacy backfill", () => {
    const source = [{
        excelRow: 2,
        record: {
            name: "Kalu Ram Prajapat",
            department: "Electrical",
            section: "EL",
            pf_no: "50819150109"
        }
    }];
    const current = [{
        id: 12,
        name: '" Kaluram Prajapat',
        department: "Electrical",
        section: "EL",
        pf_no: null
    }];

    assert.equal(identityKey(source[0].record), identityKey(current[0]));
    assert.deepEqual(buildPlan(source, current)[0], {
        ...source[0],
        action: "backfill-pf",
        id: 12
    });
});

test("ambiguous legacy identity is rejected", () => {
    const source = [{
        excelRow: 8,
        record: {
            name: "Same Name",
            department: "Electrical",
            section: "EL",
            pf_no: "123"
        }
    }];
    const duplicate = {
        name: "Same Name",
        department: "Electrical",
        section: "EL",
        pf_no: null
    };

    assert.throws(
        () => buildPlan(source, [{ id: 1, ...duplicate }, { id: 2, ...duplicate }]),
        /multiple legacy rows/
    );
});
