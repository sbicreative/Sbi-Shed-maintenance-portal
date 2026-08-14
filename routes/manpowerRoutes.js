const express = require("express");
const router = express.Router();

const supabase = require("../config/supabase");

function sameText(left, right) {
    return String(left || "").trim().toLowerCase() ===
        String(right || "").trim().toLowerCase();
}

async function getSupervisor(supervisorId) {
    const { data, error } = await supabase
        .from("supervisor_master")
        .select("id,department,section")
        .eq("id", supervisorId)
        .maybeSingle();
    if (error) throw error;
    return data;
}

// ======================================================
// TEMPORARY STAFF LOANS FOR THE SELECTED DATE
// ======================================================

router.get("/temporary-loans", async (req, res) => {
    try {
        const loanDate = String(req.query.loan_date || "").trim();
        const supervisorId = Number(req.query.supervisor_id);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(loanDate) || !supervisorId) {
            return res.status(400).json({
                success: false,
                message: "A valid loan date and supervisor are required."
            });
        }

        const supervisor = await getSupervisor(supervisorId);
        if (!supervisor) {
            return res.status(404).json({
                success: false,
                message: "Supervisor was not found."
            });
        }

        const [loanResult, employeeResult, sectionResult] = await Promise.all([
            supabase
                .from("temporary_staff_loans")
                .select("id,staff_id,loan_date,department,from_section,to_section")
                .eq("loan_date", loanDate)
                .ilike("department", supervisor.department),
            supabase
                .from("employee_master")
                .select("id,name,designation,department,section")
                .ilike("department", supervisor.department)
                .order("name", { ascending: true }),
            supabase
                .from("supervisor_master")
                .select("section")
                .ilike("department", supervisor.department)
        ]);

        const error = loanResult.error || employeeResult.error || sectionResult.error;
        if (error) throw error;

        const employeeMap = new Map(
            (employeeResult.data || []).map(item => [Number(item.id), item])
        );
        const loans = (loanResult.data || []).map(item => ({
            ...item,
            staff_name: employeeMap.get(Number(item.staff_id))?.name || "Staff"
        }));
        const ownSection = supervisor.section;
        const permanentStaff = (employeeResult.data || []).filter(item =>
            sameText(item.section, ownSection) &&
            !["SSE", "JE"].includes(
                String(item.designation || "").trim().toUpperCase()
            )
        );
        const loanedOutIds = new Set(
            loans.filter(item => sameText(item.from_section, ownSection))
                .map(item => Number(item.staff_id))
        );
        const sections = [...new Set(
            (sectionResult.data || [])
                .map(item => String(item.section || "").trim())
                .filter(section => section && !sameText(section, ownSection))
        )].sort((a, b) => a.localeCompare(b));

        res.json({
            success: true,
            loan_date: loanDate,
            section: ownSection,
            loaned_in: loans.filter(item => sameText(item.to_section, ownSection)),
            loaned_out: loans.filter(item => sameText(item.from_section, ownSection)),
            staff_for_loan: permanentStaff.filter(item =>
                !loanedOutIds.has(Number(item.id))
            ),
            destination_sections: sections
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post("/temporary-loans", async (req, res) => {
    try {
        const loanDate = String(req.body.loan_date || "").trim();
        const supervisorId = Number(req.body.supervisor_id);
        const staffId = Number(req.body.staff_id);
        const toSection = String(req.body.to_section || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(loanDate) ||
            !supervisorId || !staffId || !toSection) {
            return res.status(400).json({
                success: false,
                message: "Staff, destination section and loan date are required."
            });
        }

        const [supervisor, employeeResult] = await Promise.all([
            getSupervisor(supervisorId),
            supabase.from("employee_master")
                .select("id,name,department,section")
                .eq("id", staffId)
                .maybeSingle()
        ]);
        if (employeeResult.error) throw employeeResult.error;
        const employee = employeeResult.data;
        if (!supervisor || !employee ||
            !sameText(employee.department, supervisor.department) ||
            !sameText(employee.section, supervisor.section)) {
            return res.status(403).json({
                success: false,
                message: "Only staff from your own section can be loaned out."
            });
        }
        if (sameText(toSection, supervisor.section)) {
            return res.status(400).json({
                success: false,
                message: "Loan destination must be another section."
            });
        }

        const { data: destinations, error: destinationError } = await supabase
            .from("supervisor_master")
            .select("section")
            .ilike("department", supervisor.department);
        if (destinationError) throw destinationError;
        const validDestination = (destinations || []).some(item =>
            sameText(item.section, toSection)
        );
        if (!validDestination) {
            return res.status(400).json({
                success: false,
                message: "Selected destination section is not valid."
            });
        }

        const { data: existingWork, error: workError } = await supabase
            .from("manpower_distribution")
            .select("id")
            .eq("staff_id", staffId)
            .eq("assigned_date", loanDate)
            .limit(1);
        if (workError) throw workError;
        if ((existingWork || []).length) {
            return res.status(409).json({
                success: false,
                message:
                    "This staff member already has work assigned for the selected date."
            });
        }

        const { data, error } = await supabase
            .from("temporary_staff_loans")
            .insert([{
                staff_id: staffId,
                loan_date: loanDate,
                department: supervisor.department,
                from_section: supervisor.section,
                to_section: toSection,
                created_by: supervisorId
            }])
            .select("id,staff_id,loan_date,from_section,to_section")
            .single();
        if (error) {
            return res.status(error.code === "23505" ? 409 : 500).json({
                success: false,
                message: error.code === "23505"
                    ? "This staff member already has a loan entry for the selected date."
                    : error.message
            });
        }

        res.status(201).json({
            success: true,
            message: "Temporary staff loan saved.",
            loan: { ...data, staff_name: employee.name }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

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
