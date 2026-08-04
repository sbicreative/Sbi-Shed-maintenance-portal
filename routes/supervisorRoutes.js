const express = require("express");
const router = express.Router();

const supabase = require("../config/supabase");

router.get("/dashboard-summary/:supervisorId", async (req, res) => {
    try {
        const supervisorId = Number(req.params.supervisorId);
        const assignDate = String(req.query.assign_date || "").trim();
        if (!supervisorId || !/^\d{4}-\d{2}-\d{2}$/.test(assignDate)) {
            return res.status(400).json({
                success: false,
                message: "Valid supervisor and assign date are required."
            });
        }

        const { data: supervisor, error: supervisorError } = await supabase
            .from("supervisor_master")
            .select("section")
            .eq("id", supervisorId)
            .single();
        if (supervisorError) throw supervisorError;

        const [workResult, staffResult, ownershipResult] = await Promise.all([
            supabase
                .from("assign_work_details")
                .select(`
                    id,status,
                    assign_work_header!inner(
                        assign_date,loco_id,temporary_loco_id,supervisor_id
                    )
                `)
                .eq("assign_work_header.supervisor_id", supervisorId)
                .eq("assign_work_header.assign_date", assignDate),
            supabase
                .from("employee_master")
                .select("id,designation")
                .ilike("section", supervisor.section),
            supabase
                .from("manpower_distribution")
                .select("staff_id,assigned_by,status")
                .eq("assigned_date", assignDate)
        ]);

        const error = workResult.error || staffResult.error || ownershipResult.error;
        if (error) throw error;

        const works = workResult.data || [];
        const staff = (staffResult.data || []).filter(item =>
            !["SSE", "JE"].includes(
                String(item.designation || "").trim().toUpperCase()
            )
        );
        const lockedByOthers = new Set(
            (ownershipResult.data || [])
                .filter(item => Number(item.assigned_by) !== supervisorId)
                .map(item => Number(item.staff_id))
        );
        const locos = new Set(works.map(item => {
            const header = item.assign_work_header || {};
            return header.loco_id
                ? `master:${header.loco_id}`
                : `temporary:${header.temporary_loco_id}`;
        }));

        res.json({
            success: true,
            assign_date: assignDate,
            total_assigned_locos: locos.size,
            available_staff: staff.filter(item =>
                !lockedByOthers.has(Number(item.id))
            ).length,
            pending_work: works.filter(item =>
                String(item.status).toLowerCase() !== "completed"
            ).length,
            completed_today: works.filter(item =>
                String(item.status).toLowerCase() === "completed"
            ).length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


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
                            temporary_loco_id,
                            schedule_id,
                            supervisor_id,
                            loco_master(
                                loco_no
                            ),
                            temporary_loco_master(
                                loco_no,
                                loco_type
                            )
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
