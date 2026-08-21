const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { appendRepairRemark } = require("../lib/repairScheduleRemarks");

function normalizedRole(value) {
    return String(value || "").trim().toLowerCase();
}

function normalizedDepartmentId(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "1" || normalized === "electrical") return 1;
    if (normalized === "2" || normalized === "mechanical") return 2;
    return null;
}

router.get("/assignment-options", async (req, res) => {
    try {
        const role = normalizedRole(req.query.role);
        const authorId = Number(req.query.author_id);
        if (!["incharge", "supervisor"].includes(role) || !authorId) {
            return res.status(400).json({ success: false, message: "Valid dashboard role and author are required." });
        }

        let query = supabase
            .from("assign_work_details")
            .select(`
                id,
                work_master (work_name),
                assign_work_header!inner (
                    id, assign_date, created_by, supervisor_id,
                    loco_master (loco_no),
                    temporary_loco_master (loco_no),
                    schedule_master (schedule_name)
                )
            `)
            .order("id", { ascending: false });
        query = role === "incharge"
            ? query.eq("assign_work_header.created_by", authorId)
            : query.eq("assign_work_header.supervisor_id", authorId);
        const { data, error } = await query;
        if (error) throw error;
        res.json({ success: true, assignments: data || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post("/remarks", async (req, res) => {
    try {
        const role = normalizedRole(req.body.author_role);
        const authorId = Number(req.body.author_id);
        const detailId = Number(req.body.assign_work_detail_id);
        const authorName = String(req.body.author_name || "").trim();
        const remarks = Array.isArray(req.body.remarks)
            ? req.body.remarks.map(value => String(value || "").trim()).filter(Boolean)
            : [];
        if (!["incharge", "supervisor"].includes(role) || !authorId || !detailId || !authorName || !remarks.length) {
            return res.status(400).json({ success: false, message: "Assigned work and at least one remark are required." });
        }

        const { data: detail, error } = await supabase
            .from("assign_work_details")
            .select(`
                id, remarks,
                assign_work_header!inner (
                    id, assign_date, created_by, supervisor_id,
                    loco_id, temporary_loco_id, schedule_id
                )
            `)
            .eq("id", detailId)
            .single();
        if (error || !detail) throw error || new Error("Assigned work was not found.");
        const header = detail.assign_work_header || {};
        const ownsAssignment = role === "incharge"
            ? Number(header.created_by) === authorId
            : Number(header.supervisor_id) === authorId;
        if (!ownsAssignment) {
            return res.status(403).json({ success: false, message: "This assigned work is not available on your dashboard." });
        }

        for (const remarkText of remarks) {
            await appendRepairRemark({
                remark_text: remarkText,
                author_id: authorId,
                author_name: authorName,
                author_role: role === "incharge" ? "Incharge" : "Supervisor",
                assignment_date: header.assign_date,
                loco_id: header.loco_id,
                temporary_loco_id: header.temporary_loco_id,
                assign_work_header_id: header.id,
                schedule_id: header.schedule_id,
                assign_work_detail_id: detailId,
                source_type: "dashboard_remark",
                source_action: "add"
            });
        }

        const legacyRemarks = [String(detail.remarks || "").trim(), ...remarks].filter(Boolean).join("\n");
        const { error: legacyError } = await supabase
            .from("assign_work_details")
            .update({ remarks: legacyRemarks })
            .eq("id", detailId);
        if (legacyError) throw legacyError;
        res.status(201).json({ success: true, count: remarks.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get("/remarks", async (req, res) => {
    try {
        const date = String(req.query.date || "").trim();
        const departmentId = normalizedDepartmentId(req.query.department_id || req.query.department);
        if (!departmentId) {
            return res.status(400).json({ success: false, message: "A valid Electrical or Mechanical department is required." });
        }
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
                schedule_master (schedule_name, department_id),
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
            const sameDepartment = Number(item.schedule_master?.department_id) === departmentId;
            return sameDepartment && roleVisible && (!loco || String(locoNo).toLowerCase().includes(loco));
        });

        res.json({ success: true, remarks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
