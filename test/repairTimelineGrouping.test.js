const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
test('Repair timeline groups loco and schedule without losing individual remarks', () => {
    const source = fs.readFileSync(path.join(__dirname, '../public/js/repairs-schedule.js'), 'utf8');
    const context = {};
    vm.createContext(context);
    vm.runInContext(source.slice(source.indexOf('function groupRepairLocos'), source.indexOf('async function loadRemarks')), context);
    const row = (id, loco, schedule) => ({id, loco_master:{loco_no:loco}, schedule_master:{schedule_name:schedule}, remark_text:'Same text'});
    const rows = [row(1,'38802','IC'), row(2,'38802','IC'), row(3,'38802','IB'), row(4,'43540','IB')];
    const original = JSON.stringify(rows);
    const groups = context.groupRepairLocos(rows);
    assert.equal(groups.length, 3);
    assert.deepEqual(Array.from(groups[0].remarks, r => r.id), [1,2]);
    assert.equal(JSON.stringify(rows), original);
    assert.equal(context.groupRepairLocos([]).length, 0);
});
