const express = require("express");
const router = express.Router();

const supabase = require("../config/supabase");
const { appendRepairRemark } = require("../lib/repairScheduleRemarks");

function normalize(value) {
    return String(value || "").trim().toLowerCase();
}

router.get("/repair-remarks", async (req, res) => {
    try {
        const locoId = Number(req.query.loco_id) || null;
        let temporaryLocoId = Number(req.query.temporary_loco_id) || null;
        const locoNo = String(req.query.loco_no || "").trim();
        if (!locoId && !temporaryLocoId && locoNo) {
            const { data: temporaryLoco, error: temporaryError } = await supabase
                .from("temporary_loco_master")
                .select("id")
                .eq("loco_no", locoNo)
                .maybeSingle();
            if (temporaryError) throw temporaryError;
            temporaryLocoId = Number(temporaryLoco?.id) || null;
        }
        if ((!locoId && !temporaryLocoId) || (locoId && temporaryLocoId)) {
            return res.status(400).json({ success: false, message: "Select one valid loco." });
        }

        let query = supabase
            .from("repair_schedule_remarks")
            .select("id,remark_text,author_name,author_role,created_at,repair_schedule_actions(status)")
            .order("created_at", { ascending: true });
        query = locoId ? query.eq("loco_id", locoId) : query.eq("temporary_loco_id", temporaryLocoId);
        const { data, error } = await query;
        if (error) throw error;

        const remarks = (data || []).filter(item =>
            !(item.repair_schedule_actions || []).some(action => action.status === "Completed")
        );
        res.json({ success: true, remarks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get("/summary", async (req, res) => {
    try {
        const assignDate = String(req.query.assign_date || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(assignDate)) {
            return res.status(400).json({
                success: false,
                message: "A valid assign_date is required."
            });
        }

        let { data, error } = await supabase
            .from("assign_work_header")
            .select("loco_id,temporary_loco_id")
            .eq("assign_date", assignDate);

        if (error && /temporary_loco_id/i.test(error.message || "")) {
            const fallback = await supabase
                .from("assign_work_header")
                .select("loco_id")
                .eq("assign_date", assignDate);
            data = fallback.data;
            error = fallback.error;
        }

        if (error) throw error;

        const uniqueLocos = new Set(
            (data || [])
                .map(item => item.loco_id
                    ? `master:${item.loco_id}`
                    : item.temporary_loco_id
                        ? `temporary:${item.temporary_loco_id}`
                        : null
                )
                .filter(Boolean)
        );

        res.json({
            success: true,
            assign_date: assignDate,
            working_locos: uniqueLocos.size
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ======================================================
// ASSIGN WORK
// Header = Loco + Schedule + Supervisor + Date
// Details = Multiple Assigned Works
// ======================================================

router.post("/", async (req, res) => {

    try {

        const {
            assign_date,
            loco_id,
            temporary_loco,
            schedule_id,
            supervisor_id,
            created_by,
            author_name,
            works
        } = req.body;

        // ==============================================
        // Basic Validation
        // ==============================================

        if (
            !assign_date ||
            (!loco_id && !temporary_loco?.loco_no) ||
            !schedule_id ||
            !supervisor_id ||
            !created_by
        ) {

            return res.status(400).json({

                success: false,
                message: "Assignment details are incomplete."

            });

        }

        if (!Array.isArray(works) || works.length === 0) {

            return res.status(400).json({

                success: false,
                message: "At least one work must be assigned."

            });

        }

        let temporaryLocoId = null;

        if (!loco_id) {
            const locoNo = String(temporary_loco.loco_no).trim();
            const { data: temporaryData, error: temporaryError } =
                await supabase
                    .from("temporary_loco_master")
                    .upsert({
                        loco_no: locoNo,
                        loco_type: String(temporary_loco.loco_type || "").trim() || null,
                        last_position: String(temporary_loco.position || "").trim() || null,
                        tracking_status: String(temporary_loco.status || "").trim() || null,
                        is_in_shed: true,
                        tracking_updated_at: temporary_loco.updated_at || null,
                        updated_at: new Date().toISOString()
                    }, { onConflict: "loco_no" })
                    .select("id")
                    .single();

            if (temporaryError) {
                return res.status(500).json({
                    success: false,
                    message: temporaryError.message
                });
            }

            temporaryLocoId = temporaryData.id;
        }

        // ==============================================
        // Prepare Multiple Work Rows
        // ==============================================

        const normalizedWorks = works.map(work => {
            const remarks = Array.isArray(work.remarks)
                ? work.remarks.map(value => String(value || "").trim()).filter(Boolean)
                : [String(work.remarks || "").trim()].filter(Boolean);
            const repairRemarkIds = Array.isArray(work.repair_remark_ids)
                ? [...new Set(work.repair_remark_ids.map(Number).filter(Number.isInteger))]
                : [];
            return { ...work, remarks, repair_remark_ids: repairRemarkIds };
        });

        const workMasterIds = [...new Set(normalizedWorks.map(work => Number(work.work_master_id)))];
        const { data: workMasters, error: workMasterError } = await supabase
            .from("work_master")
            .select("id,work_name")
            .in("id", workMasterIds);
        if (workMasterError) throw workMasterError;
        const workNameById = new Map((workMasters || []).map(item => [Number(item.id), normalize(item.work_name)]));

        for (const work of normalizedWorks) {
            const isRepairs = workNameById.get(Number(work.work_master_id)) === "repairs";
            if (isRepairs && !work.repair_remark_ids.length) {
                return res.status(400).json({ success: false, message: "Select at least one pending repair remark." });
            }
            if (!isRepairs && work.repair_remark_ids.length) {
                return res.status(400).json({ success: false, message: "Repair remarks can only be linked to Repairs work." });
            }
            if (isRepairs) {
                let remarkQuery = supabase
                    .from("repair_schedule_remarks")
                    .select("id,repair_schedule_actions(status)")
                    .in("id", work.repair_remark_ids);
                remarkQuery = loco_id
                    ? remarkQuery.eq("loco_id", Number(loco_id))
                    : remarkQuery.eq("temporary_loco_id", temporaryLocoId);
                const { data: selectedRemarks, error: selectedError } = await remarkQuery;
                if (selectedError) throw selectedError;
                const pendingIds = new Set((selectedRemarks || [])
                    .filter(item => !(item.repair_schedule_actions || []).some(action => action.status === "Completed"))
                    .map(item => Number(item.id)));
                if (work.repair_remark_ids.some(id => !pendingIds.has(id))) {
                    return res.status(400).json({ success: false, message: "One or more selected repair remarks are invalid or already completed." });
                }
            }
        }

        // ==============================================
        // Create Assignment Header only after validation
        // ==============================================

        const { data: headerData, error: headerError } = await supabase
            .from("assign_work_header")
            .insert([{
                assign_date,
                loco_id: loco_id || null,
                temporary_loco_id: temporaryLocoId,
                schedule_id,
                supervisor_id,
                created_by
            }])
            .select("id")
            .single();

        if (headerError) {
            return res.status(500).json({ success: false, message: headerError.message });
        }

        const workRows = normalizedWorks.map(work => ({

            assign_header_id: headerData.id,

            work_master_id: work.work_master_id,

            status: "Pending",

            remarks: work.remarks.length ? work.remarks.join("\n") : null

        }));

        // ==============================================
        // Insert Assigned Work Details
        // ==============================================

        const { data: detailData, error: detailsError } = await supabase

            .from("assign_work_details")

            .insert(workRows)
            .select("id,work_master_id,remarks");

        if (detailsError) {

            await supabase

                .from("assign_work_header")

                .delete()

                .eq("id", headerData.id);

            return res.status(500).json({

                success: false,
                message: detailsError.message

            });

        }

        for (const detail of detailData || []) {
            const sourceWork = normalizedWorks.find(
                work => Number(work.work_master_id) === Number(detail.work_master_id)
            );
            if (sourceWork?.repair_remark_ids?.length) {
                const { error: linkError } = await supabase
                    .from("repair_schedule_remark_assignments")
                    .insert(sourceWork.repair_remark_ids.map(remarkId => ({
                        repair_schedule_remark_id: remarkId,
                        assign_work_detail_id: detail.id,
                        assigned_by: Number(created_by)
                    })));
                if (linkError) throw linkError;
            }
            for (const remarkText of sourceWork?.remarks || []) {
                await appendRepairRemark({
                    remark_text: remarkText,
                    author_id: created_by,
                    author_name,
                    author_role: "Incharge",
                    assignment_date: assign_date,
                    loco_id: loco_id || null,
                    temporary_loco_id: temporaryLocoId,
                    assign_work_header_id: headerData.id,
                    schedule_id,
                    assign_work_detail_id: detail.id,
                    source_type: "assign_work_detail",
                    source_action: "assign"
                });
            }
        }

        // ==============================================
        // Success
        // ==============================================

        res.json({

            success: true,

            message: "Work Assigned Successfully.",

            assignment_id: headerData.id

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,

            message: err.message

        });

    }

});

module.exports = router;
