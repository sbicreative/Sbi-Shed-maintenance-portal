const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const router = express.Router();
const trackingDb = createClient(
    "https://cgbnuyltwqdazyejottk.supabase.co",
    "sb_publishable_QA6Obxmmpy7GT9NOWtwHIQ_yNs91LID"
);

router.get("/summary", async (req, res) => {
    try {
        const { data, error } = await trackingDb
            .from("loco_positions")
            .select("position,updated_at,updated_by")
            .order("updated_at", { ascending: false });

        if (error) throw error;

        const records = data || [];
        res.json({
            success: true,
            total_locos: records.length,
            occupied_positions:
                new Set(records.map(item => item.position)).size,
            last_updated: records[0]?.updated_at || null,
            updated_by: records[0]?.updated_by || null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
