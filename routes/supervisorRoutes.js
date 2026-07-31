const express = require("express");
const router = express.Router();

const supabase = require("../config/supabase");


// ======================================================
// GET ALL SUPERVISORS
// URL: /api/supervisors
// ======================================================

router.get("/", async (req, res) => {

    try {

        const { data, error } =
            await supabase
                .from("supervisor_master")
                .select(`
                    id,
                    name,
                    designation,
                    department,
                    section,
                    role
                `)
                .ilike("role", "supervisor")
                .order("name", {
                    ascending: true
                });

        if (error) {

            console.error(
                "Get Supervisors Error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }

        res.json(data || []);

    }

    catch (err) {

        console.error(
            "Get Supervisors Error:",
            err
        );

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});


// ======================================================
// GET SUPERVISORS BY DEPARTMENT
// URL: /api/supervisors/department/Electrical
// ======================================================

router.get(
    "/department/:department",
    async (req, res) => {

        try {

            const department =
                req.params.department;

            const { data, error } =
                await supabase
                    .from("supervisor_master")
                    .select(`
                        id,
                        name,
                        designation,
                        department,
                        section,
                        role
                    `)
                    .ilike(
                        "department",
                        department
                    )
                    .ilike(
                        "role",
                        "supervisor"
                    )
                    .order("name", {
                        ascending: true
                    });

            if (error) {

                console.error(
                    "Department Supervisor Error:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    message: error.message
                });

            }

            res.json(data || []);

        }

        catch (err) {

            console.error(
                "Department Supervisor Error:",
                err
            );

            res.status(500).json({
                success: false,
                message: err.message
            });

        }

    }
);


// ======================================================
// GET SUPERVISORS BY SECTION
// URL: /api/supervisors/section/EL
// ======================================================

router.get(
    "/section/:section",
    async (req, res) => {

        try {

            const section =
                req.params.section;

            const { data, error } =
                await supabase
                    .from("supervisor_master")
                    .select(`
                        id,
                        name,
                        designation,
                        department,
                        section,
                        role
                    `)
                    .ilike(
                        "section",
                        section
                    )
                    .ilike(
                        "role",
                        "supervisor"
                    )
                    .order("name", {
                        ascending: true
                    });

            if (error) {

                console.error(
                    "Section Supervisor Error:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    message: error.message
                });

            }

            res.json(data || []);

        }

        catch (err) {

            console.error(
                "Section Supervisor Error:",
                err
            );

            res.status(500).json({
                success: false,
                message: err.message
            });

        }

    }
);


// ======================================================
// GET ASSIGNED WORK BY SUPERVISOR
// URL: /api/supervisors/assigned-work/28
// ======================================================

router.get(
    "/assigned-work/:supervisorId",
    async (req, res) => {

        try {

            const supervisorId =
                Number(req.params.supervisorId);

            const assignDate =
                String(req.query.assign_date || "")
                    .trim();

            if (!supervisorId) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid supervisor ID."
                });

            }

            let query =
                supabase
                    .from("assign_work_details")
                    .select(`
                        id,
                        status,
                        remarks,

                        assign_work_header!inner(
                            id,
                            assign_date,
                            loco_id,
                            schedule_id,
                            supervisor_id
                        ),

                        work_master(
                            id,
                            work_name
                        )
                    `)
                    .eq(
                        "assign_work_header.supervisor_id",
                        supervisorId
                    );

            if (assignDate) {

                if (!/^\d{4}-\d{2}-\d{2}$/.test(assignDate)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid assign_date."
                    });
                }

                query = query.eq(
                    "assign_work_header.assign_date",
                    assignDate
                );

            }

            const { data, error } =
                await query
                    .order(
                        "id",
                        {
                            ascending: false
                        }
                    );

            if (error) {

                console.error(
                    "Assigned Work Error:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    message: error.message
                });

            }

            res.json(data || []);

        }

        catch (err) {

            console.error(
                "Assigned Work Error:",
                err
            );

            res.status(500).json({
                success: false,
                message: err.message
            });

        }

    }
);

module.exports = router;
