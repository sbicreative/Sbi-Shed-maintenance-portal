const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

router.get("/candidates/:inchargeId", async (req, res) => {
    try {
        const inchargeId = Number(req.params.inchargeId);
        const { data: incharge, error: inchargeError } = await supabase
            .from("supervisor_master")
            .select("id,department,role")
            .eq("id", inchargeId)
            .maybeSingle();
        if (inchargeError) throw inchargeError;
        if (!incharge || String(incharge.role).toLowerCase() !== "incharge") {
            return res.status(403).json({
                success: false,
                message: "Only the permanent Incharge can hand over charge."
            });
        }

        const { data, error } = await supabase
            .from("supervisor_master")
            .select("id,name,section,designation")
            .ilike("department", incharge.department)
            .ilike("role", "supervisor")
            .order("name", { ascending: true });
        if (error) throw error;
        res.json({ success: true, candidates: data || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get("/current/:reviewerId", async (req, res) => {
    try {
        const reviewerId = Number(req.params.reviewerId);
        const date = String(req.query.date || "").trim();
        if (!reviewerId || !validDate(date)) {
            return res.status(400).json({
                success: false,
                message: "Valid reviewer and date are required."
            });
        }
        const { data, error } = await supabase
            .from("incharge_charge_handover")
            .select("*")
            .or(
                `permanent_incharge_id.eq.${reviewerId},acting_incharge_id.eq.${reviewerId}`
            )
            .eq("status", "Active")
            .lte("start_date", date)
            .gte("end_date", date)
            .maybeSingle();
        if (error) throw error;
        res.json({ success: true, handover: data || null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post("/", async (req, res) => {
    try {
        const permanentId = Number(req.body.permanent_incharge_id);
        const actingId = Number(req.body.acting_incharge_id);
        const startDate = String(req.body.start_date || "").trim();
        const endDate = String(req.body.end_date || "").trim();
        const reason = String(req.body.reason || "").trim();
        if (!permanentId || !actingId || !validDate(startDate) ||
            !validDate(endDate) || endDate < startDate) {
            return res.status(400).json({
                success: false,
                message: "Acting Incharge and a valid date range are required."
            });
        }

        const { data: people, error: peopleError } = await supabase
            .from("supervisor_master")
            .select("id,name,department,role")
            .in("id", [permanentId, actingId]);
        if (peopleError) throw peopleError;
        const permanent = (people || []).find(item => Number(item.id) === permanentId);
        const acting = (people || []).find(item => Number(item.id) === actingId);
        if (!permanent || !acting ||
            String(permanent.role).toLowerCase() !== "incharge" ||
            String(acting.role).toLowerCase() !== "supervisor" ||
            String(permanent.department).trim().toLowerCase() !==
                String(acting.department).trim().toLowerCase()) {
            return res.status(403).json({
                success: false,
                message: "Acting Incharge must be a Supervisor from the same department."
            });
        }

        const { data: conflicts, error: conflictError } = await supabase
            .from("incharge_charge_handover")
            .select("id")
            .eq("status", "Active")
            .lte("start_date", endDate)
            .gte("end_date", startDate)
            .or(
                `permanent_incharge_id.eq.${permanentId},acting_incharge_id.eq.${actingId}`
            )
            .limit(1);
        if (conflictError) throw conflictError;
        if ((conflicts || []).length) {
            return res.status(409).json({
                success: false,
                message: "An overlapping active charge handover already exists."
            });
        }

        const { data, error } = await supabase
            .from("incharge_charge_handover")
            .insert([{
                permanent_incharge_id: permanentId,
                acting_incharge_id: actingId,
                department: permanent.department,
                start_date: startDate,
                end_date: endDate,
                reason: reason || null
            }])
            .select("*")
            .single();
        if (error) throw error;
        res.status(201).json({
            success: true,
            message: `Charge handed over to ${acting.name}.`,
            handover: data
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
