const express = require('express');
const supabase = require('../config/supabase');
const router = express.Router();

// Supabase limits each response; do not silently lose older schedules.
async function readAll(makeQuery) {
    const result = [];
    for (let offset = 0; ; offset += 500) {
        const { data, error } = await makeQuery().range(offset, offset + 499);
        if (error) throw error;
        result.push(...(data || []));
        if (!data || data.length < 500) return result;
    }
}

router.get('/', async (req, res) => {
    try {
        const [templates, forms] = await Promise.all([
            readAll(() => supabase.from('schedule_form_master')
                .select('id,form_name,version,schedule_types,template_schema').order('id')),
            readAll(() => supabase.from('schedule_form_details').select(`
                id,schedule_form_master_id,template_version,form_answers,answer_attributions,
                assign_work_details(assign_work_header(assign_date,loco_master(loco_no),temporary_loco_master(loco_no),schedule_master(schedule_name))),
                manpower_distribution!manpower_distribution_id(assign_work_details(assign_work_header(assign_date,loco_master(loco_no),temporary_loco_master(loco_no),schedule_master(schedule_name)))),
                employee_master!staff_id(name)
            `).eq('status', 'Approved').order('id'))
        ]);
        const versions = new Map(templates.map(template => [
            `${template.id}:${template.version}`, template.template_schema
        ]));
        const missing = [...new Set(forms.map(form => `${form.schedule_form_master_id}:${form.template_version}`))]
            .filter(key => !versions.has(key));
        // Only request version history when needed, including on installations without edits.
        for (const key of missing) {
            const [id, version] = key.split(':').map(Number);
            const { data, error } = await supabase.from('schedule_form_template_versions')
                .select('template_schema').eq('schedule_form_master_id', id).eq('version', version).maybeSingle();
            if (error) throw error;
            if (data) versions.set(key, data.template_schema);
        }
        let unavailable = 0;
        const records = [];
        for (const form of forms) {
            const schema = versions.get(`${form.schedule_form_master_id}:${form.template_version}`);
            const header = form.assign_work_details?.assign_work_header || form.manpower_distribution?.assign_work_details?.assign_work_header;
            if (!schema?.document_html || !header) { unavailable++; continue; }
            records.push({
                id: form.id, templateKey: `${form.schedule_form_master_id}:${form.template_version}`,
                locoNo: header.loco_master?.loco_no || header.temporary_loco_master?.loco_no,
                schedule: header.schedule_master?.schedule_name || '',
                date: header.assign_date,
                answers: form.form_answers || {}, attributions: form.answer_attributions || {},
                staffName: form.employee_master?.name || ''
            });
        }
        res.json({ success: true, records, unavailable,
            templates: [...versions].map(([key, schema]) => ({ key, html: schema?.document_html || '' }))
        });
    } catch (error) {
        console.error('Viewer parameter history:', error.message);
        res.status(500).json({ success: false, message: 'Unable to load parameter history. Please retry.' });
    }
});

module.exports = router;
