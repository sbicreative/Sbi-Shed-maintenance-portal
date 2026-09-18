const supabase = require('../config/supabase');
const { isMissingRemarksTable } = require('./repairScheduleRemarks');

// Header-scoped remarks are shared across works, but stored only once.
async function loadLocoRemarks(details) {
    const ids = [...new Set(details.map(item => Number(item.assign_work_header?.id)).filter(Boolean))];
    const byHeader = new Map();
    if (!ids.length) return byHeader;
    const { data, error } = await supabase.from('repair_schedule_remarks')
        .select('id,assign_work_header_id,remark_text,author_name,author_role,created_at')
        .in('assign_work_header_id', ids).is('assign_work_detail_id', null)
        .order('created_at');
    if (error && !isMissingRemarksTable(error)) throw error;
    for (const remark of data || []) {
        const id = Number(remark.assign_work_header_id);
        if (!byHeader.has(id)) byHeader.set(id, []);
        byHeader.get(id).push(remark);
    }
    return byHeader;
}
module.exports = { loadLocoRemarks };
