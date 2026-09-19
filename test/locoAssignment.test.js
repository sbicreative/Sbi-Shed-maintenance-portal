const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('multiple selected works save one shared loco remark, without duplicate work rows', async () => {
    let handler;
    const inserted = {};
    const remarks = [];
    const db = { from(table) {
        const query = {
            select() { return query; }, in() { return query; }, eq() { return query; },
            insert(rows) { inserted[table] = rows; return query; },
            single() { return Promise.resolve({ data: table === 'schedule_master' ? {department_id:1} : {id:90} }); },
            then(resolve, reject) {
                const data = table === 'work_master'
                    ? [{id:11,work_name:'Check A'},{id:12,work_name:'Check B'}]
                    : (inserted[table] || []).map((r,i) => ({...r,id:100+i}));
                return Promise.resolve({data}).then(resolve,reject);
            }
        };
        return query;
    }};
    const router = {get(){}, post(url, fn) {handler=fn;}};
    const context = {module:{exports:{}}, require(name) {
        if (name === 'express') return {Router:()=>router};
        if (name.includes('config/supabase')) return db;
        if (name.includes('repairScheduleRemarks')) return {appendRepairRemark:async row => remarks.push(row)};
        throw Error(name);
    }};
    vm.runInNewContext(fs.readFileSync(path.join(root,'routes/assignWorkRoutes.js'),'utf8'),context);
    let response, status=200;
    await handler({body:{assign_date:'2026-09-18',loco_id:1,schedule_id:2,supervisor_id:3,
        created_by:4,author_name:'Test',loco_remarks:[' Shared note ','Shared note'],
        works:[{work_master_id:11},{work_master_id:12},{work_master_id:11}]}},
    {status(n){status=n;return this;},json(value){response=value;}});
    assert.equal(status,200);
    assert.equal(response.success,true);
    assert.equal(inserted.assign_work_details.length,2);
    assert.ok(inserted.assign_work_details.every(row=>row.remarks === null));
    assert.equal(remarks.length,1);
    assert.equal(remarks[0].remark_text,'Shared note');
    assert.equal(remarks[0].assign_work_header_id,90);
    assert.equal(remarks[0].assign_work_detail_id,undefined);
});

test('activity groups by loco, schedule and supervisor, deduplicating works and escaping labels', async () => {
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) elements.set(id,{textContent:'',innerHTML:'',addEventListener(){}});
        return elements.get(id);
    };
    const rows = [
        {loco_key:'master:1',loco_no:'38802',schedule_id:1,schedule_name:'IA',supervisor_id:1,supervisor_name:'A',work_name:'Check <A>'},
        {loco_key:'master:1',loco_no:'38802',schedule_id:1,schedule_name:'IA',supervisor_id:1,supervisor_name:'A',work_name:'Check B'},
        {loco_key:'master:1',loco_no:'38802',schedule_id:1,schedule_name:'IA',supervisor_id:1,supervisor_name:'A',work_name:'Check B'},
        {loco_key:'master:1',loco_no:'38802',schedule_id:2,schedule_name:'IB',supervisor_id:1,supervisor_name:'A',work_name:'Check C'},
        {loco_key:'master:1',loco_no:'38802',schedule_id:1,schedule_name:'IA',supervisor_id:2,supervisor_name:'B',work_name:'Check D'}
    ];
    const ctx=vm.createContext({localStorage:{getItem:()=>JSON.stringify({id:1,name:'Test'})},
        document:{getElementById:element,addEventListener(){}},window:{location:{}},setInterval(){},console,
        fetch:async()=>({ok:true,json:async()=>({success:true,data:rows})})});
    vm.runInContext(fs.readFileSync(path.join(root,'public/js/incharge.js'),'utf8'),ctx);
    await vm.runInContext('loadTodaysActivity()',ctx);
    const html=element('activityTable').innerHTML;
    assert.equal((html.match(/<tr>/g)||[]).length,3);
    assert.equal((html.match(/Check B/g)||[]).length,1);
    assert.match(html,/Check &lt;A&gt;/);
});
