const express = require("express");
const router = express.Router();

const supabase = require("../config/supabase");

// ======================================================
// GET LOCO LIST
// ======================================================

router.get("/", async (req, res) => {

    try {

        const { data, error } = await supabase
            .from("loco_master")
            .select(`
                id,
                loco_no,
                loco_type_id,
                loco_type_master (
                    loco_type
                )
            `)
            .order("loco_no");

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