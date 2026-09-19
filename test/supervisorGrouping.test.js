const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/js/supervisor.js'), 'utf8');
const context = {};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function groupSupervisorWork'), source.indexOf('async function loadAssignedWork')), context);
test('Supervisor groups loco/schedule and deduplicates work and remarks without changing source records', () => {
    const row = (loco, schedule, work, remarks) => ({
        assign_work_header: { loco_master: { loco_no:loco }, schedule_master: { schedule_name:schedule } },
        work_master: { work_name:work }, remarks
    });
    const items = [row('38802','IC','Repairs','Check horn'), row('38802','IC','Repairs','Check horn'),
        row('38802','IC','HVAC','Check horn\nCheck compressor'), row('38802','IB','IRC',''), row('43540','IB','IRC','')];
    const original = JSON.stringify(items);
    const groups = context.groupSupervisorWork(items);
    assert.equal(groups.length, 3);
    assert.deepEqual([...groups[0].works], ['Repairs','HVAC']);
    assert.deepEqual([...groups[0].remarks], ['Check horn','Check compressor']);
    assert.equal(JSON.stringify(items), original);
    assert.equal(context.groupSupervisorWork([]).length, 0);
    assert.equal((source.match(/async function loadAssignedWork\(/g) || []).length, 1);
});
