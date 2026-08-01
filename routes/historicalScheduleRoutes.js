const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();
const bucket = "old-schedule-forms";

router.get("/", async (req, res) => {
    try {
        const locoNo = String(req.query.loco_no || "").trim();
        let query = supabase
            .from("historical_schedule_records")
            .select("id,loco_no,department,schedule_date,schedule_type,original_filename,file_size_bytes,remarks")
            .order("schedule_date", { ascending: false, nullsFirst: false });

        if (locoNo) query = query.eq("loco_no", locoNo);
        const { data, error } = await query;
        if (error) throw error;

        res.json({ success: true, records: data || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get("/:id/view", async (req, res) => {
    try {
        const { data: record, error: recordError } = await supabase
            .from("historical_schedule_records")
            .select("storage_path")
            .eq("id", Number(req.params.id))
            .maybeSingle();
        if (recordError) throw recordError;
        if (!record) return res.status(404).send("Historical form not found.");

        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(record.storage_path, 300);
        if (error) throw error;

        res.redirect(data.signedUrl);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

module.exports = router;

