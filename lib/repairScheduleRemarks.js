const supabase = require("../config/supabase");

function isMissingRemarksTable(error) {
    return error && (
        error.code === "42P01" ||
        error.code === "PGRST205" ||
        /repair_schedule_remarks.*(not found|does not exist)/i.test(error.message || "")
    );
}

async function appendRepairRemark(remark) {
    const remarkText = String(remark.remark_text || "").trim();
    if (!remarkText) return null;

    const row = {
        remark_text: remarkText,
        author_id: remark.author_id ? Number(remark.author_id) : null,
        author_name: String(remark.author_name || remark.author_role || "Unknown").trim(),
        author_role: String(remark.author_role || "Unknown").trim(),
        assignment_date: remark.assignment_date || null,
        loco_id: remark.loco_id ? Number(remark.loco_id) : null,
        temporary_loco_id: remark.temporary_loco_id ? Number(remark.temporary_loco_id) : null,
        assign_work_header_id: remark.assign_work_header_id ? Number(remark.assign_work_header_id) : null,
        schedule_id: remark.schedule_id ? Number(remark.schedule_id) : null,
        assign_work_detail_id: remark.assign_work_detail_id ? Number(remark.assign_work_detail_id) : null,
        manpower_distribution_id: remark.manpower_distribution_id ? Number(remark.manpower_distribution_id) : null,
        schedule_form_detail_id: remark.schedule_form_detail_id ? Number(remark.schedule_form_detail_id) : null,
        source_type: String(remark.source_type || "application"),
        source_action: String(remark.source_action || "save")
    };

    const { data, error } = await supabase
        .from("repair_schedule_remarks")
        .insert([row])
        .select("id,created_at")
        .single();

    // Allows a safe application-first deployment. Once migration 14 exists,
    // any central-write failure remains a visible request error.
    if (isMissingRemarksTable(error)) return null;
    if (error) throw error;
    return data;
}

module.exports = { appendRepairRemark, isMissingRemarksTable };
