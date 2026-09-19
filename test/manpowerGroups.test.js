const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('grouped distribution preserves every work picker and conditionally shows incomplete returns', () => {
    const client = read('public/js/manpower-distribution.js');
    const grouping = client.slice(client.indexOf('function groupAssignedWorkRows'), client.indexOf('async function saveDistribution'));
    assert.match(grouping, /header\.schedule_id/);
    assert.match(grouping, /header\.assign_date/);
    assert.match(grouping, /unit\.appendChild\(row\.querySelector\('\.manpower-picker'\)\)/);
    assert.match(grouping, /if \(item\.incomplete_submission\)/);
    assert.match(grouping, /Returned By:/);
    assert.match(grouping, /document\.createElement\('ol'\)/);
    assert.match(grouping, /entry\.textContent = remark\.text/);
});

test('new shared remarks are sent once per group and stored without a work-detail link', () => {
    const client = read('public/js/manpower-distribution.js');
    assert.match(client, /remarkedGroups\.has\(row\) \? \[\]/);
    assert.match(client, /if \(staffRows\.length\) remarkedGroups\.add\(row\)/);
    assert.match(client, /remarks_scope: 'loco'/);
    assert.match(read('routes/manpowerRoutes.js'), /assign_work_detail_id: req\.body\.remarks_scope === 'loco' \? null : detailId/);
    assert.match(read('lib/assignmentLocoRemarks.js'), /is\('assign_work_detail_id', null\)/);
});
