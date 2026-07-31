const express = require("express");
const router = express.Router();

const supabase = require("../config/supabase");

// ======================================================
// GET WORK MASTER LIST
// ======================================================

router.get("/", async (req, res) => {

    try {

        const { data, error } = await supabase

            .from("work_master")

            .select(`
                id,
                work_name,
                status,
                department_id,
                section_id,
                schedule_id,
                department_master (
                    department_name
                ),
                section_master (
                    section_name
                ),
                schedule_master (
                    schedule_name
                )
            `)

            .eq("status", "true")

            .order("work_name");

        if (error) {

            return res.status(500).json({

                success: false,
                message: error.message

            });

        }

        res.json(data);

    }

    catch (err) {

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

});

// ======================================================
// GET WORK BY SECTION AND SCHEDULE
// ======================================================

router.get(
    "/section/:sectionId/schedule/:scheduleId",
    async (req, res) => {

        try {

            const sectionId = req.params.sectionId;
            const scheduleId = req.params.scheduleId;

            const { data, error } = await supabase

                .from("work_master")

                .select(`
                    id,
                    work_name
                `)

                .eq("section_id", sectionId)

                .eq("schedule_id", scheduleId)

                .eq("status", "true")

                .order("work_name");

            if (error) {

                return res.status(500).json({

                    success: false,
                    message: error.message

                });

            }

            res.json(data);

        }

        catch (err) {

            res.status(500).json({

                success: false,
                message: err.message

            });

        }

    }
);

module.exports = router;