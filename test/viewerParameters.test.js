const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const parameters = require('../public/js/viewer-parameters');
const controls = require('../public/js/ic-form-controls');

test('parameter results preserve GI, Final, actions, staff attribution and standards', () => {
    const definition = [{ parameter: 'Safety Valve Blowing Pressure', section: '', standard: '8.5 ± 0.25', fields: [
        { key: 'gi', role: 'gi', label: 'GI' }, { key: 'final', role: 'final', label: 'Final' }
    ] }];
    const rows = parameters.buildRows({ id: 1, locoNo: 30654, schedule: 'IC', date: '2026-09-01',
        answers: { gi: '9.2', final: '8.6', gi__action_taken: 'Adjusted valve' },
        attributions: { gi: { staff_name: 'Staff A' }, final: { staff_name: 'Staff B' } }
    }, definition, controls);
    assert.equal(rows[0].gi, '9.2');
    assert.equal(rows[0].final, '8.6');
    assert.equal(rows[0].standard, '8.5 ± 0.25');
    assert.match(rows[0].status, /GI: Out of range; Final: Within range/);
    assert.equal(rows[0].action, 'Adjusted valve');
    assert.equal(rows[0].staff, 'Staff A / Staff B');
    definition[0].standard = '8.5+ 0.25';
    assert.match(parameters.buildRows({ answers: { gi: '9' }, attributions: {} }, definition, controls)[0].status, /Not assessed/);
});

test('parameter filters require matching loco and schedule, include boundaries, and sort all history', () => {
    const rows = [
        { id: 1, parameter: 'Valve', locoNo: '30654', schedule: 'IC', date: '2025-01-01' },
        { id: 2, parameter: 'Valve', locoNo: '30654', schedule: 'IC', date: '2026-09-30' },
        { id: 3, parameter: 'Valve', locoNo: '30654', schedule: 'IA', date: '2026-09-30' },
        { id: 4, parameter: 'Valve', locoNo: '30000', schedule: 'IC', date: '2026-09-30' }
    ];
    const filter = { parameter: 'Valve', loco: '30654', schedule: 'IC' };
    assert.deepEqual(parameters.filterRows(rows, filter).map(row => row.id), [2, 1]);
    assert.deepEqual(parameters.filterRows(rows, { ...filter, from: '2026-09-30', to: '2026-09-30' }).map(row => row.id), [2]);
    assert.equal(parameters.filterRows(rows, { ...filter, from: '2025-01-01', to: '2026-09-30' }).length, 2);
    assert.equal(parameters.filterRows(rows, { ...filter, loco: 'Select All Locos' }).length, 3);
    assert.equal(parameters.filterRows(rows, { ...filter, parameter: 'Unknown' }).length, 0);
});

test('viewer component list is built only from parameters that have saved values', () => {
    const viewer = fs.readFileSync(require('node:path').join(__dirname, '../public/js/viewer.js'), 'utf8');
    assert.match(viewer, /parameterRows\.map\(item => item\.parameter\)/);
    assert.doesNotMatch(viewer, /templates\.values\(\).*map\(item => item\.parameter\)/s);
});

test('viewer uses the same coordinate normalization as the saved schedule form', () => {
    const form = fs.readFileSync(require('node:path').join(__dirname, '../public/js/schedule-form.js'), 'utf8');
    const viewer = fs.readFileSync(require('node:path').join(__dirname, '../public/js/viewer-parameters.js'), 'utf8');
    for (const name of ['annotateLogicalColumns', 'removeSignatureRemarksColumns', 'removeRepetitiveJeSignatureRows', 'removeScheduleSignatureRows']) {
        const extract = source => {
            const start = source.indexOf('function ' + name + '(');
            return source.slice(start, source.indexOf('\nfunction ', start + 1)).replace(/\r/g, '').trim();
        };
        // Last copied helper is followed by the module's constants instead of a function.
        const expected = extract(form);
        assert.ok(viewer.replace(/\r/g, '').includes(expected), name);
    }
});

test('history API paginates approved forms and resolves exact historical versions', async () => {
    let handler;
    const calls = [];
    const header = { assign_date: '2025-01-01', loco_master: { loco_no: '30654' }, schedule_master: { schedule_name: 'IC' } };
    const forms = Array.from({ length: 501 }, (_, index) => ({ id: index + 1,
        schedule_form_master_id: 1, template_version: 1, assign_work_details: { assign_work_header: header },
        form_answers: { gi: '8.5' }, employee_master: { name: 'A' }
    }));
    forms[500].assign_work_details = null;
    forms[500].manpower_distribution = { assign_work_details: { assign_work_header: header } };
    const supabase = { from(table) {
        const query = { select() { return this; }, order() { return this; },
            eq(key, value) { calls.push([table, key, value]); return this; },
            range(start, end) { return Promise.resolve({ data: table === 'schedule_form_master'
                ? [{ id: 1, version: 2, template_schema: { document_html: 'current' } }]
                : forms.slice(start, end + 1) }); },
            maybeSingle() { return Promise.resolve({ data: { template_schema: { document_html: 'old' } } }); }
        }; return query;
    } };
    vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../routes/viewerParameterRoutes.js'), 'utf8'), {
        require: name => name === 'express' ? { Router: () => ({ get: (path, fn) => { handler = fn; } }) } : supabase,
        module: {}, console
    });
    let result;
    await handler({}, { json(value) { result = value; }, status() { return this; } });
    assert.equal(result.success, true);
    assert.equal(result.records.length, 501);
    assert.equal(result.templates.find(item => item.key === '1:1').html, 'old');
    assert.equal(result.records[500].locoNo, '30654');
    assert.ok(calls.some(([table, key, value]) => table === 'schedule_form_details' && key === 'status' && value === 'Approved'));
});
