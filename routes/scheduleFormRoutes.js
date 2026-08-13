const express = require("express");
const path = require("path");
const router = express.Router();
const supabase = require("../config/supabase");
const { appendRepairRemark } = require("../lib/repairScheduleRemarks");
const { mergeLockedAnswers, completionState } = require("../lib/continuousScheduleForm");

async function appendFormRemark({ assignment, formId, text, authorId, authorName, authorRole, action }) {
    const header = assignment.detail?.assign_work_header || {};
    await appendRepairRemark({
        remark_text: text,
        author_id: authorId,
        author_name: authorName,
        author_role: authorRole,
        assignment_date: assignment.distribution?.assigned_date || header.assign_date,
        loco_id: header.loco_id || header.loco_master?.id,
        temporary_loco_id: header.temporary_loco_id || header.temporary_loco_master?.id,
        assign_work_header_id: header.id,
        schedule_id: header.schedule_id || header.schedule_master?.id,
        assign_work_detail_id: assignment.distribution?.assign_work_detail_id,
        manpower_distribution_id: assignment.distribution?.id,
        schedule_form_detail_id: formId,
        source_type: "schedule_form",
        source_action: action
    });
}

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

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
}

function isRepairsAssignment(assignment) {
    return normalize(assignment.detail?.work_master?.work_name) === "repairs";
}

function repairLocoKey(assignment) {
    const header = assignment.detail?.assign_work_header || {};
    if (header.loco_master?.id) return `master:${header.loco_master.id}`;
    if (header.temporary_loco_master?.id) return `temporary:${header.temporary_loco_master.id}`;
    return null;
}

async function buildRepairTemplate(assignment, template) {
    if (!isRepairsAssignment(assignment)) return template;
    const header = assignment.detail.assign_work_header || {};
    let query = supabase.from("repair_schedule_remarks").select("id,remark_text,author_name,author_role,created_at,repair_schedule_actions(status)").order("created_at", { ascending: true });
    query = header.loco_master?.id
        ? query.eq("loco_id", header.loco_master.id)
        : query.eq("temporary_loco_id", header.temporary_loco_master?.id);
    const { data, error } = await query;
    if (error) throw error;
    const pending = (data || []).filter(item =>
        !(item.repair_schedule_actions || []).some(action => action.status === "Completed")
    );
    const rows = pending.map((item, index) => `<tr><td><strong>${index + 1}.</strong> ${escapeHtml(item.remark_text)}<small>${escapeHtml(new Date(item.created_at).toLocaleString("en-IN"))} · ${escapeHtml(item.author_name)} (${escapeHtml(item.author_role)})</small></td><td data-answer-key="repair_${item.id}" data-required-answer="true"></td><td data-attribution-for="repair_${item.id}"></td><td data-answer-key="repair_remark_${item.id}" data-required-answer="false"></td></tr>`).join("");
    return { ...template, template_schema: { ...(template.template_schema || {}), dynamic_type: "repair_remarks", document_html: `<table><thead><tr><th>Work item<br><small>कार्य विवरण</small></th><th>Action Taken<br><small>की गई कार्रवाई</small></th><th>Name of TCN/Staff<br><small>तकनीशियन/कर्मचारी का नाम</small></th><th>Remark<br><small>टिप्पणी</small></th></tr></thead><tbody>${rows || '<tr><td colspan="4">No pending repair remarks.</td></tr>'}</tbody></table>` } };
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
            is_lead,
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
        Number(form.active_manpower_distribution_id || form.manpower_distribution_id)
    );

    if (!assignment) return null;

    const { data: storedTemplate, error: templateError } =
        await supabase
            .from("schedule_form_master")
            .select("*")
            .eq("id", form.schedule_form_master_id)
            .single();

    if (templateError) throw templateError;
    const template = await buildRepairTemplate(assignment, storedTemplate);

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
                    "Submitted Incomplete",
                    "Supervisor Review",
                    "Returned to Supervisor",
                    "Continuation Assigned",
                    "Submitted Complete",
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
        const authorName = String(req.body.author_name || role).trim();
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
                if (record.form.completion_state !== "Complete") {
                    return res.status(400).json({
                        success: false,
                        message: "Incomplete forms must be continued before they can be forwarded to Incharge."
                    });
                }
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
            update.reviewed_by = reviewerId;

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
                if (record.template.template_schema?.dynamic_type === "repair_remarks") {
                    update.completion_state = "Incomplete";
                }
                update.returned_at = new Date().toISOString();
            }

            if (action === "approve") {
                if (record.template.template_schema?.dynamic_type === "repair_remarks") {
                    const repairKeys = [...String(record.template.template_schema.document_html || "")
                        .matchAll(/data-answer-key="(repair_\d+)"/g)].map(match => match[1]);
                    if (!completionState(repairKeys, record.form.form_answers).complete) {
                        return res.status(400).json({
                            success: false,
                            message: "New pending repair remarks must be attended before Incharge approval."
                        });
                    }
                }
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

        if (role === "incharge" && action === "approve") {
            const { error: repairApprovalError } = await supabase
                .from("repair_schedule_actions")
                .update({
                    status: "Completed",
                    reviewed_by: reviewerId,
                    reviewed_at: new Date().toISOString(),
                    review_remarks: remarks || null
                })
                .eq("schedule_form_detail_id", formId)
                .eq("status", "Waiting for Incharge Approval");
            if (repairApprovalError) throw repairApprovalError;
        }

        await appendFormRemark({
            assignment: record.assignment,
            formId,
            text: remarks,
            authorId: reviewerId,
            authorName,
            authorRole: role === "incharge" ? "Incharge" : "Supervisor",
            action
        });

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

        if (role === "incharge" && action === "approve") {
            const activeDistributionId = Number(
                record.form.active_manpower_distribution_id || record.form.manpower_distribution_id
            );
            const { error: manpowerError } = await supabase
                .from("manpower_distribution")
                .update({ status: "Completed" })
                .eq("id", activeDistributionId);
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

router.get("/incomplete-summary/:role/:reviewerId", async (req, res) => {
    try {
        const role = String(req.params.role || "").toLowerCase();
        const reviewerId = Number(req.params.reviewerId);
        if (!["supervisor", "incharge"].includes(role) || !reviewerId) {
            return res.status(400).json({ success: false, message: "Invalid reviewer." });
        }
        let query = supabase
            .from("schedule_form_details")
            .select("id")
            .eq("completion_state", "Incomplete")
            .in("status", ["Submitted Incomplete", "Supervisor Review", "Continuation Assigned", "Returned to Staff"]);
        if (role === "supervisor") query = query.eq("submitted_to_supervisor_id", reviewerId);
        const { data, error } = await query;
        if (error) throw error;
        let records = (await Promise.all((data || []).map(item => getReviewRecord(item.id)))).filter(Boolean);
        if (role === "incharge") {
            const { data: incharge, error: inchargeError } = await supabase
                .from("supervisor_master")
                .select("department")
                .eq("id", reviewerId)
                .maybeSingle();
            if (inchargeError) throw inchargeError;
            records = records.filter(record =>
                !incharge?.department || normalize(record.assignment.employee.department) === normalize(incharge.department)
            );
        }
        const scheduleNames = [...new Set(records.map(record =>
            record.assignment.detail.assign_work_header?.schedule_master?.schedule_name || "-"
        ))].sort();
        res.json({ success: true, count: records.length, schedule_names: scheduleNames });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post("/review/:formId/continuation/:reviewerId", async (req, res) => {
    try {
        const formId = Number(req.params.formId);
        const reviewerId = Number(req.params.reviewerId);
        const staffId = Number(req.body.staff_id);
        const assignedDate = String(req.body.assigned_date || "").trim();
        const record = await getReviewRecord(formId);
        if (!record || Number(record.form.submitted_to_supervisor_id) !== reviewerId) {
            return res.status(403).json({ success: false, message: "This incomplete form is not assigned to this Supervisor." });
        }
        if (record.form.completion_state !== "Incomplete") {
            return res.status(409).json({ success: false, message: "Only incomplete forms can be reassigned." });
        }
        if (!staffId || !/^\d{4}-\d{2}-\d{2}$/.test(assignedDate)) {
            return res.status(400).json({ success: false, message: "Staff and continuation date are required." });
        }
        const detailId = Number(record.assignment.distribution.assign_work_detail_id);
        const { data: previousLeads, error: previousLeadError } = await supabase
            .from("manpower_distribution")
            .update({ is_lead: false })
            .eq("assign_work_detail_id", detailId)
            .eq("is_lead", true)
            .select("id");
        if (previousLeadError) throw previousLeadError;
        const { data: distribution, error: distributionError } = await supabase
            .from("manpower_distribution")
            .insert([{
                assign_work_detail_id: detailId,
                staff_id: staffId,
                assigned_by: reviewerId,
                assigned_date: assignedDate,
                is_lead: true,
                status: "Assigned",
                remarks: "Schedule form continuation"
            }])
            .select("id")
            .single();
        if (distributionError) {
            if (previousLeads?.length) {
                await supabase.from("manpower_distribution")
                    .update({ is_lead: true })
                    .in("id", previousLeads.map(item => item.id));
            }
            throw distributionError;
        }

        const { error: continuationError } = await supabase
            .from("schedule_form_continuations")
            .insert([{
                schedule_form_detail_id: formId,
                manpower_distribution_id: distribution.id,
                staff_id: staffId,
                assigned_by: reviewerId,
                assigned_date: assignedDate
            }]);
        if (continuationError) throw continuationError;

        const { data, error } = await supabase
            .from("schedule_form_details")
            .update({
                active_manpower_distribution_id: distribution.id,
                staff_id: staffId,
                status: "Continuation Assigned"
            })
            .eq("id", formId)
            .select("*")
            .single();
        if (error) throw error;

        res.json({ success: true, message: "Remaining schedule form assigned for continuation.", submission: data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
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

            let template = await findTemplate(assignment);

            if (!template) {
                return res.status(404).json({
                    success: false,
                    code: "FORM_TEMPLATE_NOT_FOUND",
                    message:
                        `No active schedule form is mapped to "${assignment.detail?.work_master?.work_name || "this work"}" for section ${assignment.employee?.section || "-"}.`
                });
            }
            template = await buildRepairTemplate(assignment, template);

            let submissionQuery = supabase.from("schedule_form_details").select("*");
            const locoKey = repairLocoKey(assignment);
            submissionQuery = locoKey && isRepairsAssignment(assignment)
                ? submissionQuery.eq("repair_loco_key", locoKey)
                : submissionQuery.eq("assign_work_detail_id", assignment.distribution.assign_work_detail_id);
            const { data: submission, error: submissionError } = await submissionQuery.maybeSingle();

            if (submissionError) throw submissionError;

            res.json({
                success: true,
                assignment,
                template,
                submission,
                can_edit: Boolean(assignment.distribution.is_lead)
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
            const answerKeys = Array.isArray(req.body.answer_keys)
                ? req.body.answer_keys.map(String)
                : Object.keys(formAnswers);
            const staffRemarks =
                String(req.body.staff_remarks || "").trim();
            const authorName = String(req.body.author_name || "Staff").trim();
            const supervisorId =
                Number(req.body.supervisor_id);

            if (!staffId || !distributionId) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid staff work assignment."
                });
            }

            if (!["draft", "submit_incomplete", "submit_complete"].includes(action)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid form action."
                });
            }

            if (action !== "draft" && !supervisorId) {
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

            let template = await findTemplate(assignment);

            if (!template) {
                return res.status(404).json({
                    success: false,
                    code: "FORM_TEMPLATE_NOT_FOUND",
                    message:
                        "No active schedule form template is mapped to this work."
                });
            }

            if (!assignment.distribution.is_lead) {
                return res.status(403).json({
                    success: false,
                    code: "LEAD_STAFF_REQUIRED",
                    message: "Only the active Lead Staff can save or submit this schedule form."
                });
            }
            template = await buildRepairTemplate(assignment, template);

            const locoKey = repairLocoKey(assignment);
            let existingQuery = supabase.from("schedule_form_details").select("*");
            existingQuery = locoKey && isRepairsAssignment(assignment)
                ? existingQuery.eq("repair_loco_key", locoKey)
                : existingQuery.eq("assign_work_detail_id", assignment.distribution.assign_work_detail_id);
            const { data: existing, error: existingError } = await existingQuery.maybeSingle();

            if (existingError) throw existingError;
            if (existing && ["Submitted Incomplete","Supervisor Review","Submitted Complete","Forwarded to Incharge","Approved"].includes(existing.status)) {
                return res.status(409).json({ success: false, message: "This submission is waiting for review." });
            }

            const merged = mergeLockedAnswers(
                existing?.form_answers,
                formAnswers,
                existing?.answer_attributions,
                { staff_id: staffId, staff_name: authorName, lock_new: action !== "draft" }
            );
            const progress = completionState(answerKeys, merged.answers);
            if (action === "submit_complete" && !progress.complete) {
                return res.status(400).json({ success: false, message: "All remaining fields must be filled before complete submission." });
            }
            const isSubmitted = action !== "draft";
            const status = action === "submit_incomplete"
                ? "Submitted Incomplete"
                : action === "submit_complete" ? "Submitted Complete" : "Draft";

            const record = {
                schedule_form_master_id: template.id,
                manpower_distribution_id: existing?.manpower_distribution_id || distributionId,
                active_manpower_distribution_id: distributionId,
                original_manpower_distribution_id: existing?.original_manpower_distribution_id || distributionId,
                repair_loco_key: isRepairsAssignment(assignment) ? locoKey : null,
                assign_work_detail_id: assignment.distribution.assign_work_detail_id,
                staff_id: staffId,
                template_version: template.version,
                form_answers: merged.answers,
                answer_attributions: merged.attributions,
                completion_state: progress.complete ? "Complete" : "Incomplete",
                staff_remarks: staffRemarks || null,
                status,
                submitted_at: isSubmitted ? new Date().toISOString() : null,
                submitted_to_supervisor_id:
                    isSubmitted
                        ? supervisorId
                        : undefined
            };

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

            if (isRepairsAssignment(assignment) && action === "submit_complete") {
                const actionRows = Object.entries(merged.answers)
                    .filter(([key, value]) => /^repair_\d+$/.test(key) && String(value).trim())
                    .map(([key, value]) => ({
                        repair_schedule_remark_id: Number(key.slice(7)),
                        schedule_form_detail_id: saved.id,
                        manpower_distribution_id: distributionId,
                        staff_id: Number(merged.attributions[key]?.staff_id || staffId),
                        staff_name: merged.attributions[key]?.staff_name || authorName,
                        action_taken: String(value).trim()
                    }));
                if (actionRows.length) {
                    const { error: actionError } = await supabase
                        .from("repair_schedule_actions")
                        .upsert(actionRows, {
                            onConflict: "schedule_form_detail_id,repair_schedule_remark_id",
                            ignoreDuplicates: true
                        });
                    if (actionError) throw actionError;
                }
            }

            const distributionStatus =
                action === "submit_complete"
                    ? "In Progress"
                    : "In Progress";

            const { error: statusError } = await supabase
                .from("manpower_distribution")
                .update({ status: distributionStatus })
                .eq("id", distributionId)
                .eq("staff_id", staffId);

            if (statusError) throw statusError;

            if (action !== "draft") {
                await appendFormRemark({
                    assignment,
                    formId: saved.id,
                    text: staffRemarks,
                    authorId: staffId,
                    authorName,
                    authorRole: "Staff",
                    action
                });
            }

            res.json({
                success: true,
                message:
                    action === "submit_incomplete"
                        ? "Incomplete form sent to Supervisor for continuation review."
                        : action === "submit_complete"
                            ? "Complete form sent for review."
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
