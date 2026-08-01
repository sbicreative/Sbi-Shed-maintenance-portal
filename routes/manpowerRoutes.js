const express = require("express");
const router = express.Router();

const supabase = require("../config/supabase");

// ======================================================
// GET STAFF ALREADY ASSIGNED ON A WORK DATE
// ======================================================

router.get("/unavailable-staff", async (req, res) => {

    try {

        const assignDate =
            String(req.query.assign_date || "").trim();
        const supervisorId =
            Number(req.query.supervisor_id);

        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(assignDate) ||
            !supervisorId
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "A valid assign_date and supervisor_id are required."
            });
        }

        const { data, error } = await supabase
            .from("manpower_distribution")
            .select("staff_id,assigned_by")
            .eq("assigned_date", assignDate)
            .neq("assigned_by", supervisorId);

        if (error) {
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }

        const staffIds = [
            ...new Set(
                (data || [])
                    .map(item => Number(item.staff_id))
                    .filter(Boolean)
            )
        ];

        res.json({
            success: true,
            assign_date: assignDate,
            supervisor_id: supervisorId,
            staff_ids: staffIds
        });

    }

    catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }

});

// ======================================================
// GET WORK ASSIGNED TO A MAPPED STAFF MEMBER
// ======================================================

router.get("/staff/:staffId", async (req, res) => {

    try {

        const staffId = Number(req.params.staffId);

        if (!staffId) {
            return res.status(400).json({
                success: false,
                message: "Invalid employee master ID."
            });
        }

        const { data: distributions, error: distributionError } =
            await supabase
                .from("manpower_distribution")
                .select(`
                    id,
                    assign_work_detail_id,
                    assigned_by,
                    assigned_date,
                    status,
                    remarks
                `)
                .eq("staff_id", staffId)
                .order("assigned_date", { ascending: false });

        if (distributionError) {
            return res.status(500).json({
                success: false,
                message: distributionError.message
            });
        }

        if (!distributions || distributions.length === 0) {
            return res.json([]);
        }

        const detailIds = [
            ...new Set(
                distributions.map(item =>
                    Number(item.assign_work_detail_id)
                )
            )
        ];

        const supervisorIds = [
            ...new Set(
                distributions
                    .map(item => Number(item.assigned_by))
                    .filter(Boolean)
            )
        ];

        const [
            { data: details, error: detailError },
            { data: supervisors, error: supervisorError }
        ] = await Promise.all([
            supabase
                .from("assign_work_details")
                .select(`
                    id,
                    status,
                    remarks,
                    work_master (
                        id,
                        work_name
                    ),
                    assign_work_header (
                        id,
                        assign_date,
                        loco_master (
                            loco_no
                        ),
                        temporary_loco_master (
                            loco_no,
                            loco_type
                        ),
                        schedule_master (
                            schedule_name
                        )
                    )
                `)
                .in("id", detailIds),
            supervisorIds.length
                ? supabase
                    .from("supervisor_master")
                    .select("id,name")
                    .in("id", supervisorIds)
                : Promise.resolve({
                    data: [],
                    error: null
                })
        ]);

        if (detailError || supervisorError) {
            return res.status(500).json({
                success: false,
                message:
                    detailError?.message ||
                    supervisorError?.message
            });
        }

        const detailMap = new Map(
            (details || []).map(item => [
                Number(item.id),
                item
            ])
        );

        const supervisorMap = new Map(
            (supervisors || []).map(item => [
                Number(item.id),
                item.name
            ])
        );

        const result = distributions.map(distribution => ({
            ...distribution,
            assigned_by_name:
                supervisorMap.get(
                    Number(distribution.assigned_by)
                ) || "Supervisor",
            work_detail:
                detailMap.get(
                    Number(
                        distribution.assign_work_detail_id
                    )
                ) || null
        }));

        res.json(result);

    }

    catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }

});

// ======================================================
// UPDATE STAFF WORK STATUS
// ======================================================

router.patch("/staff/:staffId/:distributionId/status", async (req, res) => {

    try {

        const staffId = Number(req.params.staffId);
        const distributionId =
            Number(req.params.distributionId);
        const status = String(req.body.status || "").trim();
        const allowedStatuses = [
            "Assigned",
            "In Progress",
            "Completed"
        ];

        if (!staffId || !distributionId) {
            return res.status(400).json({
                success: false,
                message: "Invalid work assignment."
            });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid work status."
            });
        }

        const { data, error } = await supabase
            .from("manpower_distribution")
            .update({ status })
            .eq("id", distributionId)
            .eq("staff_id", staffId)
            .select("id,status")
            .maybeSingle();

        if (error) {
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message:
                    "This work is not assigned to the logged-in staff member."
            });
        }

        res.json({
            success: true,
            assignment: data
        });

    }

    catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }

});

// ======================================================
// GET ASSIGNED WORK FOR MANPOWER DISTRIBUTION
// ======================================================

router.get("/", async (req, res) => {

    try {

        const { data, error } = await supabase

            .from("assign_work_details")

            .select(`
                id,
                status,
                remarks,

                work_master (
                    id,
                    work_name
                ),

                assign_work_header (
                    id,
                    assign_date,

                    loco_master (
                        loco_no
                    ),
                    temporary_loco_master (
                        loco_no,
                        loco_type
                    ),

                    schedule_master (
                        schedule_name
                    )
                )
            `)

            .order("id", { ascending: false });

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
// SAVE MANPOWER DISTRIBUTION
// ======================================================

router.post("/", async (req, res) => {

    try {

        const {
            assign_work_detail_id,
            staff_id,
            assigned_by,
            remarks
        } = req.body;

        const detailId = Number(assign_work_detail_id);
        const staffId = Number(staff_id);
        const assignedBy = Number(assigned_by);

        if (!detailId || !staffId || !assignedBy) {
            return res.status(400).json({
                success: false,
                message:
                    "Work detail, staff and assigning supervisor are required."
            });
        }

        const {
            data: workDetail,
            error: workDetailError
        } = await supabase
            .from("assign_work_details")
            .select(`
                id,
                assign_work_header!inner (
                    assign_date
                )
            `)
            .eq("id", detailId)
            .single();

        if (workDetailError || !workDetail) {
            return res.status(400).json({
                success: false,
                message:
                    workDetailError?.message ||
                    "Assigned work detail was not found."
            });
        }

        const assignDate =
            workDetail.assign_work_header?.assign_date;

        if (!assignDate) {
            return res.status(400).json({
                success: false,
                message:
                    "The assigned work does not have an assign date."
            });
        }

        const {
            data: existingAssignment,
            error: conflictCheckError
        } = await supabase
            .from("manpower_distribution")
            .select("id,assigned_by,assign_work_detail_id")
            .eq("staff_id", staffId)
            .eq("assigned_date", assignDate)
            .limit(1);

        if (conflictCheckError) {
            return res.status(500).json({
                success: false,
                message: conflictCheckError.message
            });
        }

        const ownedByAnother = (existingAssignment || []).find(
            item => Number(item.assigned_by) !== assignedBy
        );
        const duplicateWork = (existingAssignment || []).find(
            item => Number(item.assigned_by) === assignedBy &&
                Number(item.assign_work_detail_id) === detailId
        );

        if (ownedByAnother) {
            return res.status(409).json({
                success: false,
                code: "STAFF_LOCKED_TO_SUPERVISOR",
                message:
                    `This staff member is assigned to another supervisor on ${assignDate}.`
            });
        }

        if (duplicateWork) {
            return res.status(409).json({
                success: false,
                code: "STAFF_ALREADY_ON_WORK",
                message:
                    "This staff member is already assigned to this work."
            });
        }

        const { error } = await supabase

            .from("manpower_distribution")

            .insert([{

                assign_work_detail_id: detailId,
                staff_id: staffId,
                assigned_by: assignedBy,
                assigned_date: assignDate,

                status: "Assigned",

                remarks:
                    remarks || null

            }]);

        if (error) {

            const isUniqueConflict =
                error.code === "23505";
            const isSupervisorLock =
                error.code === "23514";

            return res.status(
                isUniqueConflict || isSupervisorLock
                    ? 409
                    : 500
            ).json({

                success: false,
                code:
                    isUniqueConflict
                        ? "STAFF_ALREADY_ASSIGNED"
                        : isSupervisorLock
                            ? "STAFF_LOCKED_TO_SUPERVISOR"
                        : undefined,
                message:
                    isUniqueConflict
                        ? "This staff member is already assigned to this work."
                        : isSupervisorLock
                            ? `This staff member is assigned to another supervisor on ${assignDate}.`
                        : error.message

            });

        }

        res.json({

            success: true,
            message:
                "Manpower Assigned Successfully."

        });

    }

    catch (err) {

        res.status(500).json({

            success: false,
            message: err.message

        });

    }

});

module.exports = router;
