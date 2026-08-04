const express = require("express");
const crypto = require("crypto");
const supabase = require("../config/supabase");
const { requireAdmin, requireCsrf } = require("../lib/adminAuth");

const router = express.Router();
router.use(requireAdmin, requireCsrf);

async function audit(actor, action, sessionId, details, result) {
    await supabase.from("admin_audit_log").insert({ actor, action, demo_session_id: sessionId || null, details, result });
}
async function activeSession() {
    const { data, error } = await supabase.from("demo_sessions").select("*").eq("status", "Active").maybeSingle();
    if (error) throw error;
    return data;
}
async function ids(table, column, values) {
    if (Array.isArray(values) && !values.length) return [];
    let query = supabase.from(table).select("id");
    query = Array.isArray(values) ? query.in(column, values) : query.eq(column, values);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(row => row.id);
}
async function previewFor(session) {
    const headers = await ids("assign_work_header", "assign_date", session.demo_date);
    const details = await ids("assign_work_details", "assign_header_id", headers);
    const distributions = await ids("manpower_distribution", "assign_work_detail_id", details);
    const forms = await ids("schedule_form_details", "manpower_distribution_id", distributions);
    const counts = { schedule_form_details: forms.length, manpower_distribution: distributions.length, assign_work_details: details.length, assign_work_header: headers.length };
    const previewToken = crypto.createHash("sha256").update(`${session.id}:${JSON.stringify(counts)}`).digest("hex");
    return { counts, ids: { forms, distributions, details, headers }, previewToken };
}
async function remove(table, values) {
    if (!values.length) return;
    const { error } = await supabase.from(table).delete().in("id", values);
    if (error) throw error;
}

router.get("/status", async (req, res) => {
    try {
        const session = await activeSession();
        const { data: logs, error } = await supabase.from("admin_audit_log").select("id,actor,action,details,result,created_at").order("created_at", { ascending: false }).limit(20);
        if (error) throw error;
        res.json({ success: true, session, logs: logs || [] });
    } catch (error) { res.status(503).json({ success: false, message: `Demo control schema unavailable: ${error.message}` }); }
});

router.post("/start", async (req, res) => {
    try {
        if (await activeSession()) return res.status(409).json({ success: false, message: "An active demo session already exists." });
        const demoDate = String(req.body.demoDate || "");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(demoDate)) return res.status(400).json({ success: false, message: "Valid demo date required." });
        const { data, error } = await supabase.from("demo_sessions").insert({ demo_date: demoDate, started_by: req.admin.username }).select("*").single();
        if (error) throw error;
        await audit(req.admin.username, "DEMO_STARTED", data.id, { demo_date: demoDate }, "success");
        res.status(201).json({ success: true, session: data });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post("/preview", async (req, res) => {
    try {
        const session = await activeSession();
        if (!session) return res.status(404).json({ success: false, message: "No active demo session." });
        const preview = await previewFor(session);
        await audit(req.admin.username, "DEMO_RESET_PREVIEWED", session.id, preview.counts, "success");
        res.json({ success: true, session, counts: preview.counts, previewToken: preview.previewToken, confirmationPhrase: `END DEMO ${session.id}` });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post("/end-reset", async (req, res) => {
    let session;
    try {
        session = await activeSession();
        if (!session) return res.status(404).json({ success: false, message: "No active demo session." });
        const preview = await previewFor(session);
        if (req.body.previewToken !== preview.previewToken || req.body.confirmationPhrase !== `END DEMO ${session.id}`) {
            return res.status(400).json({ success: false, message: "Preview changed or confirmation phrase is incorrect. Preview again." });
        }
        await remove("schedule_form_details", preview.ids.forms);
        await remove("manpower_distribution", preview.ids.distributions);
        await remove("assign_work_details", preview.ids.details);
        await remove("assign_work_header", preview.ids.headers);
        const { error } = await supabase.from("demo_sessions").update({ status: "Ended", ended_by: req.admin.username, ended_at: new Date().toISOString() }).eq("id", session.id);
        if (error) throw error;
        await audit(req.admin.username, "DEMO_ENDED_AND_RESET", session.id, preview.counts, "success");
        res.json({ success: true, counts: preview.counts });
    } catch (error) {
        await audit(req.admin.username, "DEMO_END_RESET_FAILED", session?.id, { message: error.message }, "failed").catch(() => {});
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
