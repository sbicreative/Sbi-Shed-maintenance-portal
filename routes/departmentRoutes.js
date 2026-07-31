const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

// ============================
// Department List
// ============================

router.get("/departments", async (req, res) => {

    const { data, error } = await supabase
        .from("department_master")
        .select("*")
        .order("department_name");

    if (error) return res.status(500).json(error);

    res.json(data);

});

// ============================
// Section List By Department
// ============================

router.get("/sections/:departmentId", async (req, res) => {

    const departmentId = req.params.departmentId;

    const { data, error } = await supabase
        .from("section_master")
        .select("*")
        .eq("department_id", departmentId)
        .order("section_name");

    if (error) return res.status(500).json(error);

    res.json(data);

});

module.exports = router;
// ============================
// Designation List By Department
// ============================

router.get("/designations/:departmentId", async (req, res) => {

    const departmentId = req.params.departmentId;

    const { data, error } = await supabase
        .from("designation_master")
        .select("*")
        .eq("department_id", departmentId)
        .order("designation_name");

    if (error)
        return res.status(500).json(error);

    res.json(data);

});