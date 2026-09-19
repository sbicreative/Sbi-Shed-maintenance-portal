const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
test('Repairs form uses four columns with immutable deficiencies and stable answer keys', async () => {
    const source = fs.readFileSync(path.join(__dirname, '../routes/scheduleFormRoutes.js'), 'utf8');
    const query = {select(){return this;}, order(){return this;}, eq(){return this;}, in(){return this;},
        then(resolve){resolve({data:[{id:7,remark_text:'Horn <check>',schedule_master:{department_id:1},repair_schedule_actions:[]}]});}};
    const links = {...query, then(resolve){resolve({data:[{repair_schedule_remark_id:7}]});}};
    const context = {supabase:{from: name => name === 'repair_schedule_remarks' ? query : links}};
    vm.createContext(context);
    vm.runInContext(source.slice(source.indexOf('function normalize('), source.indexOf('async function getAssignment(')), context);
    const result = await context.buildRepairTemplate({detail:{work_master:{work_name:'Repairs'},assign_work_header:{loco_master:{id:1},schedule_master:{department_id:1}}}}, {template_schema:{}});
    const html = result.template_schema.document_html;
    assert.equal((html.match(/<th>/g)||[]).length, 4);
    assert.match(html, /<th>SN<\/th><th>Deficiency Noticed/);
    assert.match(html, /Horn &lt;check&gt;/);
    assert.match(html, /data-answer-key="repair_7"/);
    assert.match(html, /data-attribution-for="repair_7"/);
    assert.doesNotMatch(html, /<th>Description|repair_remark_7/);
});
