const express = require("express");
const path = require("path");
const router = express.Router();
const supabase = require("../config/supabase");

router.get("/template/:templateId/source", async (req, res) => {
    try {
        const templateId = Number(req.params.templateId);
        if (!templateId) {
            return res.status(400).json({
                success: false,
                message: "Invalid form template."
            });
        }

        const { data, error } = await supabase
            .from("schedule_form_master")
            .select("source_file_name")
            .eq("id", templateId)
            .single();
        if (error) throw error;

        const masterRoot = path.resolve(
            __dirname,
            "..",
            "Project Documents",
            "MASTER"
        );
        const sourcePath = path.resolve(
            masterRoot,
            String(data.source_file_name || "")
        );
        if (!sourcePath.startsWith(masterRoot + path.sep)) {
            return res.status(400).json({
                success: false,
                message: "Invalid template source path."
            });
        }

        res.sendFile(sourcePath);
    } catch (err) {
        res.status(404).json({
            success: false,
            message: err.message
        });
    }
});

function normalize(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

async function getAssignment(staffId, distributionId) {
    const { data: distribution, error } = await supabase
        .from("manpower_distribution")
        .select(`
            id,
            staff_id,
            assign_work_detail_id,
            assigned_date,
            assigned_by,
            status,
            remarks
        `)
        .eq("id", distributionId)
        .eq("staff_id", staffId)
        .maybeSingle();

    if (error) throw error;
    if (!distribution) return null;

    const [
        { data: detail, error: detailError },
        { data: employee, error: employeeError }
    ] = await Promise.all([
        supabase
            .from("assign_work_details")
            .select(`
                id,
                work_master_id,
                work_master (
                    id,
                    work_name
                ),
                assign_work_header (
                    id,
                    assign_date,
                    loco_master (
                        id,
                        loco_no
                    ),
                    temporary_loco_master (
                        id,
                        loco_no,
                        loco_type
                    ),
                    schedule_master (
                        id,
                        schedule_name
                    )
                )
            `)
            .eq("id", distribution.assign_work_detail_id)
            .single(),
        supabase
            .from("employee_master")
            .select("id,name,department,section,designation")
            .eq("id", staffId)
            .single()
    ]);

    if (detailError) throw detailError;
    if (employeeError) throw employeeError;

    return {
        distribution,
        detail,
        employee
    };
}

async function findTemplate(assignment) {
    const workName =
        assignment.detail?.work_master?.work_name || "";
    const section =
        assignment.employee?.section || "";
    const scheduleName =
        assignment.detail?.assign_work_header
            ?.schedule_master?.schedule_name || "";

    const { data, error } = await supabase
        .from("schedule_form_master")
        .select(`
            id,
            form_code,
            form_name,
            department,
            section,
            work_master_id,
            schedule_types,
            source_file_name,
            template_schema,
            version,
            is_active
        `)
        .eq("is_active", true)
        .ilike("section", section);

    if (error) throw error;

    const normalizedWork = normalize(workName);
    const normalizedSchedule = normalize(scheduleName);

    return (data || []).find(template => {
        const workNames =
            template.template_schema?.work_names || [];
        const workMatches =
            Number(template.work_master_id) ===
                Number(assignment.detail.work_master_id) ||
            workNames.some(name =>
                normalize(name) === normalizedWork
            );
        const schedules =
            template.schedule_types || [];
        const scheduleMatches =
            schedules.length === 0 ||
            schedules.some(name =>
                normalize(name) === normalizedSchedule
            );

        return workMatches && scheduleMatches;
    }) || null;
}

async function getReviewRecord(formId) {
    const { data: form, error } = await supabase
        .from("schedule_form_details")
        .select("*")
        .eq("id", formId)
        .maybeSingle();

    if (error) throw error;
    if (!form) return null;

    const assignment = await getAssignment(
        Number(form.staff_id),
        Number(form.manpower_distribution_id)
    );

    if (!assignment) return null;

    const { data: template, error: templateError } =
        await supabase
            .from("schedule_form_master")
            .select("*")
            .eq("id", form.schedule_form_master_id)
            .single();

    if (templateError) throw templateError;

    return {
        form,
        assignment,
        template
    };
}

router.get("/incharges", async (req, res) => {
    try {
        const department =
            String(req.query.department || "").trim();

        let query = supabase
            .from("supervisor_master")
            .select("id,name,designation,department,section,role")
            .ilike("role", "incharge")
            .order("name", { ascending: true });

        if (department) {
            query = query.ilike("department", department);
        }

        const { data, error } = await query;

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

router.get("/review-queue/:role/:reviewerId", async (req, res) => {
    try {
        const role =
            String(req.params.role || "").trim().toLowerCase();
        const reviewerId = Number(req.params.reviewerId);

        if (
            !["supervisor", "incharge"].includes(role) ||
            !reviewerId
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid reviewer."
            });
        }

        let query = supabase
            .from("schedule_form_details")
            .select("id")
            .order("submitted_at", { ascending: false });

        if (role === "supervisor") {
            query = query
                .eq("submitted_to_supervisor_id", reviewerId)
                .in("status", [
                    "Submitted",
                    "Supervisor Review",
                    "Returned to Supervisor",
                    "Forwarded to Incharge",
                    "Approved"
                ]);
        } else {
            query = query
                .eq("forwarded_to_incharge_id", reviewerId)
                .in("status", [
                    "Forwarded to Incharge",
                    "Approved"
                ]);
        }

        const { data, error } = await query;
        if (error) throw error;

        const records = await Promise.all(
            (data || []).map(item =>
                getReviewRecord(item.id)
            )
        );

        res.json(
            records.filter(Boolean).map(record => {
                const header =
                    record.assignment.detail
                        .assign_work_header || {};

                return {
                    id: record.form.id,
                    status: record.form.status,
                    submitted_at:
                        record.form.submitted_at,
                    staff_name:
                        record.assignment.employee.name,
                    staff_id:
                        record.assignment.employee.id,
                    loco_no:
                        header.loco_master?.loco_no ||
                        header.temporary_loco_master?.loco_no || "-",
                    schedule_name:
                        header.schedule_master
                            ?.schedule_name || "-",
                    assigned_work:
                        record.assignment.detail.work_master
                            ?.work_name || "-",
                    form_name:
                        record.template.form_name
                };
            })
        );
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

router.get("/review/:formId/:role/:reviewerId", async (req, res) => {
    try {
        const formId = Number(req.params.formId);
        const reviewerId = Number(req.params.reviewerId);
        const role =
            String(req.params.role || "").trim().toLowerCase();
        const record = await getReviewRecord(formId);

        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Schedule form was not found."
            });
        }

        const isAllowed =
            (
                role === "supervisor" &&
                Number(
                    record.form.submitted_to_supervisor_id
                ) === reviewerId
            ) ||
            (
                role === "incharge" &&
                Number(
                    record.form.forwarded_to_incharge_id
                ) === reviewerId
            );

        if (!isAllowed) {
            return res.status(403).json({
                success: false,
                message:
                    "This schedule form is not routed to the logged-in reviewer."
            });
        }

        res.json({
            success: true,
            ...record
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

router.patch("/review/:formId/:role/:reviewerId", async (req, res) => {
    try {
        const formId = Number(req.params.formId);
        const reviewerId = Number(req.params.reviewerId);
        const role =
            String(req.params.role || "").trim().toLowerCase();
        const action =
            String(req.body.action || "").trim().toLowerCase();
        const remarks =
            String(req.body.remarks || "").trim();
        const formAnswers = req.body.form_answers;
        const record = await getReviewRecord(formId);

        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Schedule form was not found."
            });
        }

        const isAllowed =
            (
                role === "supervisor" &&
                Number(
                    record.form.submitted_to_supervisor_id
                ) === reviewerId
            ) ||
            (
                role === "incharge" &&
                Number(
                    record.form.forwarded_to_incharge_id
                ) === reviewerId
            );

        if (!isAllowed) {
            return res.status(403).json({
                success: false,
                message:
                    "This schedule form is not routed to the logged-in reviewer."
            });
        }

        const update = {};

        if (
            role !== "supervisor" &&
            formAnswers &&
            typeof formAnswers === "object" &&
            !Array.isArray(formAnswers)
        ) {
            update.form_answers = formAnswers;
        }

        if (role === "supervisor") {
            if (!["save", "forward", "return"].includes(action)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid Supervisor action."
                });
            }

            update.supervisor_remarks = remarks || null;
            update.supervisor_reviewed_at =
                new Date().toISOString();

            if (action === "save") {
                update.status = "Supervisor Review";
            }

            if (action === "return") {
                if (!remarks) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Return remarks are required."
                    });
                }
                update.status = "Returned to Staff";
                update.returned_at = new Date().toISOString();
            }

            if (action === "forward") {
                const inchargeId =
                    Number(req.body.incharge_id);
                if (!inchargeId) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Please select an Incharge."
                    });
                }
                update.forwarded_to_incharge_id = inchargeId;
                update.forwarded_at = new Date().toISOString();
                update.status = "Forwarded to Incharge";
            }
        } else if (role === "incharge") {
            if (!["save", "approve", "return"].includes(action)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid Incharge action."
                });
            }

            update.incharge_remarks = remarks || null;
            update.incharge_reviewed_at =
                new Date().toISOString();
            update.reviewed_by =
                Number(req.body.action_reviewer_id) || reviewerId;

            if (action === "save") {
                update.status = "Forwarded to Incharge";
            }

            if (action === "return") {
                if (!remarks) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Return remarks are required."
                    });
                }
                update.status = "Returned to Supervisor";
                update.returned_at = new Date().toISOString();
            }

            if (action === "approve") {
                update.status = "Approved";
                update.approved_at = new Date().toISOString();
            }
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid reviewer role."
            });
        }

        const { data, error } = await supabase
            .from("schedule_form_details")
            .update(update)
            .eq("id", formId)
            .select("*")
            .single();

        if (error) throw error;

        if (
            role === "supervisor" &&
            action === "return"
        ) {
            const { error: manpowerError } = await supabase
                .from("manpower_distribution")
                .update({ status: "In Progress" })
                .eq(
                    "id",
                    record.form.manpower_distribution_id
                )
                .eq("staff_id", record.form.staff_id);

            if (manpowerError) throw manpowerError;
        }

        res.json({
            success: true,
            message:
                action === "forward"
                    ? "Form forwarded to Incharge."
                    : action === "approve"
                        ? "Form approved successfully."
                        : action === "return"
                            ? "Form returned for review."
                            : "Review changes saved.",
            submission: data
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

router.get(
    "/assignment/:distributionId/staff/:staffId",
    async (req, res) => {
        try {
            const staffId = Number(req.params.staffId);
            const distributionId =
                Number(req.params.distributionId);

            if (!staffId || !distributionId) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid staff work assignment."
                });
            }

            const assignment =
                await getAssignment(staffId, distributionId);

            if (!assignment) {
                return res.status(404).json({
                    success: false,
                    message:
                        "This work is not assigned to the logged-in staff member."
                });
            }

            const template = await findTemplate(assignment);

            if (!template) {
                return res.status(404).json({
                    success: false,
                    code: "FORM_TEMPLATE_NOT_FOUND",
                    message:
                        `No active schedule form is mapped to "${assignment.detail?.work_master?.work_name || "this work"}" for section ${assignment.employee?.section || "-"}.`
                });
            }

            const { data: submission, error: submissionError } =
                await supabase
                    .from("schedule_form_details")
                    .select("*")
                    .eq(
                        "manpower_distribution_id",
                        distributionId
                    )
                    .maybeSingle();

            if (submissionError) throw submissionError;

            res.json({
                success: true,
                assignment,
                template,
                submission
            });
        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }
);

router.post(
    "/assignment/:distributionId/staff/:staffId",
    async (req, res) => {
        try {
            const staffId = Number(req.params.staffId);
            const distributionId =
                Number(req.params.distributionId);
            const action =
                String(req.body.action || "draft")
                    .trim()
                    .toLowerCase();
            const formAnswers = req.body.form_answers || {};
            const staffRemarks =
                String(req.body.staff_remarks || "").trim();
            const supervisorId =
                Number(req.body.supervisor_id);

            if (!staffId || !distributionId) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid staff work assignment."
                });
            }

            if (!["draft", "submit"].includes(action)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid form action."
                });
            }

            if (action === "submit" && !supervisorId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please select a Supervisor before submitting."
                });
            }

            if (
                !formAnswers ||
                Array.isArray(formAnswers) ||
                typeof formAnswers !== "object"
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid schedule form answers."
                });
            }

            const assignment =
                await getAssignment(staffId, distributionId);

            if (!assignment) {
                return res.status(404).json({
                    success: false,
                    message:
                        "This work is not assigned to the logged-in staff member."
                });
            }

            const template = await findTemplate(assignment);

            if (!template) {
                return res.status(404).json({
                    success: false,
                    code: "FORM_TEMPLATE_NOT_FOUND",
                    message:
                        "No active schedule form template is mapped to this work."
                });
            }

            const status =
                action === "submit" ? "Submitted" : "Draft";
            const submittedAt =
                action === "submit"
                    ? new Date().toISOString()
                    : null;

            const record = {
                schedule_form_master_id: template.id,
                manpower_distribution_id: distributionId,
                staff_id: staffId,
                template_version: template.version,
                form_answers: formAnswers,
                staff_remarks: staffRemarks || null,
                status,
                submitted_at: submittedAt,
                submitted_to_supervisor_id:
                    action === "submit"
                        ? supervisorId
                        : undefined
            };

            const { data: existing, error: existingError } =
                await supabase
                    .from("schedule_form_details")
                    .select("id,status")
                    .eq(
                        "manpower_distribution_id",
                        distributionId
                    )
                    .maybeSingle();

            if (existingError) throw existingError;

            if (
                existing &&
                [
                    "Submitted",
                    "Supervisor Review",
                    "Forwarded to Incharge",
                    "Returned to Supervisor",
                    "Approved"
                ]
                    .includes(existing.status)
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "This form has already been submitted and cannot be edited."
                });
            }

            let saved;
            let saveError;

            if (existing) {
                ({ data: saved, error: saveError } =
                    await supabase
                        .from("schedule_form_details")
                        .update(record)
                        .eq("id", existing.id)
                        .select("*")
                        .single());
            } else {
                ({ data: saved, error: saveError } =
                    await supabase
                        .from("schedule_form_details")
                        .insert([record])
                        .select("*")
                        .single());
            }

            if (saveError) throw saveError;

            const distributionStatus =
                action === "submit"
                    ? "Completed"
                    : "In Progress";

            const { error: statusError } = await supabase
                .from("manpower_distribution")
                .update({ status: distributionStatus })
                .eq("id", distributionId)
                .eq("staff_id", staffId);

            if (statusError) throw statusError;

            res.json({
                success: true,
                message:
                    action === "submit"
                        ? "Schedule form submitted successfully."
                        : "Draft saved successfully.",
                submission: saved
            });
        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }
);

module.exports = router;
