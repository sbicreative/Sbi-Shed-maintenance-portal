const express = require("express");
const router = express.Router();

const supabase = require("../config/supabase");

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
            schedule_id,
            supervisor_id,
            created_by,
            works
        } = req.body;

        // ==============================================
        // Basic Validation
        // ==============================================

        if (
            !assign_date ||
            !loco_id ||
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

        // ==============================================
        // Create Assignment Header
        // ==============================================

        const { data: headerData, error: headerError } =
            await supabase

                .from("assign_work_header")

                .insert([{

                    assign_date,
                    loco_id,
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

        const { error: detailsError } = await supabase

            .from("assign_work_details")

            .insert(workRows);

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