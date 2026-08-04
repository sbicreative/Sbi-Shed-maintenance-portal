const express = require("express");
const supabase = require("../config/supabase");
const { requireAdmin, requireCsrf } = require("../lib/adminAuth");

const router = express.Router();
router.use(requireAdmin, requireCsrf);

const definitions = {
    departments: { table: "department_master", fields: ["department_name"] },
    sections: { table: "section_master", fields: ["department_id", "section_name"] },
    designations: { table: "designation_master", fields: ["department_id", "designation_name"] },
    employees: { table: "employee_master", fields: ["name", "pf_no", "designation", "department", "section"] },
    supervisors: { table: "supervisor_master", fields: ["name", "pf_no", "designation", "department", "section"] },
    users: { table: "user_master", fields: ["name", "mobile_no_cug", "pf_no", "department", "section", "designation", "role"] },
    "loco-types": { table: "loco_type_master", fields: ["loco_type"] },
    locos: { table: "loco_master", fields: ["loco_no", "loco_type_id", "status"] },
    schedules: { table: "schedule_master", fields: ["department_id", "section_id", "schedule_name"] },
    works: { table: "work_master", fields: ["department_id", "section_id", "schedule_id", "work_name", "status"] }
};

function definition(req, res) {
    const value = definitions[req.params.resource];
    if (!value) res.status(404).json({ success: false, message: "Unknown or protected master resource." });
    return value;
}

function payload(def, body) {
    return Object.fromEntries(def.fields.filter(field => Object.hasOwn(body, field)).map(field => [field, body[field] === "" ? null : body[field]]));
}

router.get("/definitions", (req, res) => res.json({ success: true, resources: definitions }));
router.get("/:resource", async (req, res) => {
    const def = definition(req, res); if (!def) return;
    const { data, error } = await supabase.from(def.table).select("*").order("id", { ascending: false }).limit(500);
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, rows: data || [], fields: def.fields });
});
router.post("/:resource", async (req, res) => {
    const def = definition(req, res); if (!def) return;
    const values = payload(def, req.body);
    if (!Object.keys(values).length) return res.status(400).json({ success: false, message: "No valid fields supplied." });
    const { data, error } = await supabase.from(def.table).insert(values).select("*").single();
    if (error) return res.status(400).json({ success: false, message: error.message });
    res.status(201).json({ success: true, row: data });
});
router.patch("/:resource/:id", async (req, res) => {
    const def = definition(req, res); if (!def) return;
    const values = payload(def, req.body);
    const { data, error } = await supabase.from(def.table).update(values).eq("id", req.params.id).select("*").single();
    if (error) return res.status(400).json({ success: false, message: error.message });
    res.json({ success: true, row: data });
});
router.delete("/:resource/:id", async (req, res) => {
    const def = definition(req, res); if (!def) return;
    const { error } = await supabase.from(def.table).delete().eq("id", req.params.id);
    if (error) return res.status(409).json({ success: false, message: `Record is in use or cannot be deleted: ${error.message}` });
    res.json({ success: true });
});

module.exports = router;
