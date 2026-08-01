const express = require("express");
const router = express.Router();

const supabase = require("../config/supabase");

// ======================================================
// GET SCHEDULE LIST
// ======================================================

router.get("/", async (req, res) => {

    try {

        let { data, error } = await supabase
            .from("schedule_master")
            .select(`
                id,
                schedule_name,
                department_id,
                section_id,
                section_master (
                    id,
                    section_name
                )
            `)
            .order("section_id")
            .order("schedule_name");

        if (error && /section_id/i.test(error.message || "")) {
            const fallback = await supabase
                .from("schedule_master")
                .select("id,schedule_name,department_id")
                .order("schedule_name");
            data = fallback.data;
            error = fallback.error;
        }

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

module.exports = router;
