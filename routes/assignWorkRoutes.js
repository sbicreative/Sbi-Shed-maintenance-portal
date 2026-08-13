const express = require("express");
const router = express.Router();

const supabase = require("../config/supabase");
const { appendRepairRemark } = require("../lib/repairScheduleRemarks");

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
        // Create Assignment Header
        // ==============================================

        const { data: headerData, error: headerError } =
            await supabase

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

            return res.status(500).json({

                success: false,
                message: headerError.message

            });

        }

        // ==============================================
        // Prepare Multiple Work Rows
        // ==============================================

        const workRows = works.map(work => ({

            assign_header_id: headerData.id,

            work_master_id: work.work_master_id,

            status: "Pending",

            remarks: work.remarks || null

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
            await appendRepairRemark({
                remark_text: detail.remarks,
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
