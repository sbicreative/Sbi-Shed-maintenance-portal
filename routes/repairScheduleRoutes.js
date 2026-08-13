const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

router.get("/remarks", async (req, res) => {
    try {
        const date = String(req.query.date || "").trim();
        if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ success: false, message: "Invalid date filter." });
        }

        let query = supabase
            .from("repair_schedule_remarks")
            .select(`
                id, remark_text, author_name, author_role, assignment_date,
                source_type, source_action, created_at,
                loco_master (loco_no),
                temporary_loco_master (loco_no),
                schedule_master (schedule_name),
                assign_work_details (work_master (work_name)),
                schedule_form_details (schedule_form_master (form_name))
            `)
            .order("assignment_date", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(500);

        if (date) query = query.eq("assignment_date", date);
        const { data, error } = await query;
        if (error) throw error;

        const viewerRole = String(req.query.viewer_role || "").trim().toLowerCase();
        const visibleAuthorRoles = {
            incharge: new Set(["supervisor", "staff"]),
            supervisor: new Set(["incharge", "staff"]),
            staff: new Set(["incharge", "supervisor"])
        };
        if (viewerRole && !visibleAuthorRoles[viewerRole]) {
            return res.status(400).json({ success: false, message: "Invalid dashboard role." });
        }

        const loco = String(req.query.loco || "").trim().toLowerCase();
        const remarks = (data || []).filter(item => {
            const locoNo = item.loco_master?.loco_no || item.temporary_loco_master?.loco_no || "";
            const roleVisible = !viewerRole || visibleAuthorRoles[viewerRole].has(
                String(item.author_role || "").trim().toLowerCase()
            );
            return roleVisible && (!loco || String(locoNo).toLowerCase().includes(loco));
        });

        res.json({ success: true, remarks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
