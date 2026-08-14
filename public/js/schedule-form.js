const scheduleUser = readUser();
const scheduleStaffId =
    Number(scheduleUser?.employee_master_id);
const query = new URLSearchParams(window.location.search);
const distributionId =
    Number(query.get("assignment"));
let loadedSubmission = null;
let loadedScheduleName = "";

function readUser() {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch (error) {
        return null;
    }
}

function isStaffSession() {
    return (
        String(scheduleUser?.role || "")
            .trim()
            .toLowerCase() === "staff" &&
        scheduleStaffId &&
        distributionId
    );
}

function showFormMessage(message, isError = false) {
    const element = document.getElementById("formMessage");
    element.textContent = message;
    element.classList.toggle("error", isError);
    element.hidden = !message;
}

function safeTemplateHtml(html) {
    const documentValue = new DOMParser()
        .parseFromString(String(html || ""), "text/html");

    documentValue
        .querySelectorAll("script,iframe,object,embed,style,img")
        .forEach(element => element.remove());

    documentValue.querySelectorAll("*").forEach(element => {
        [...element.attributes].forEach(attribute => {
            const name = attribute.name.toLowerCase();
            const value = attribute.value.toLowerCase();

            if (
                name.startsWith("on") ||
                (
                    ["href", "src"].includes(name) &&
                    value.startsWith("javascript:")
                )
            ) {
                element.removeAttribute(attribute.name);
            }
        });
    });

    return documentValue.body.innerHTML;
}

function columnContext(table, rowIndex, cellIndex) {
    const labels = [];
    for (let index = 0; index <= rowIndex; index += 1) {
        const cell = table.rows[index]?.cells[cellIndex];
        if (!cell) continue;
        const text = cell.textContent.replace(/\s+/g, " ").trim();
        if (text) labels.push(text);
    }
    return labels.slice(-3).join(" ");
}

function buildAnswerField(config, key, savedValue, label) {
    let field;

    if (config.type === "select") {
        field = document.createElement("select");
        field.className = "cell-answer ic-answer-select";
        field.innerHTML = '<option value="">Select</option>';
        config.options.forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            field.appendChild(option);
        });
    } else if (config.type === "value") {
        field = document.createElement("input");
        field.type = "text";
        field.inputMode = "decimal";
        field.className = "cell-answer ic-value-input";
        field.placeholder = "Actual value";
    } else {
        field = document.createElement("textarea");
        field.className = "cell-answer";
    }

    field.dataset.answerKey = key;
    field.dataset.fieldKind = config.kind;
    field.setAttribute("aria-label", label);
    field.value = savedValue || "";
    const handleFieldUpdate = () => {
        field.closest("tr")?.classList.remove(
            "ic-row-needs-remarks"
        );
        updateCompletion();
    };
    field.addEventListener("input", handleFieldUpdate);
    field.addEventListener("change", handleFieldUpdate);
    return field;
}

function createAnswerFields(savedAnswers = {}, scheduleName = "") {
    const tables = document.querySelectorAll(
        "#templateContainer table"
    );

    tables.forEach((table, tableIndex) => {
        [...table.rows].forEach((row, rowIndex) => {
            [...row.cells].forEach((cell, cellIndex) => {
                const plainText =
                    cell.textContent.replace(/\s+/g, " ").trim();

                if (plainText) return;

                const key =
                    `t${tableIndex}_r${rowIndex}_c${cellIndex}`;
                const label =
                    `Answer row ${rowIndex + 1}, column ${cellIndex + 1}`;
                const usesTypedControls = window.IcFormControls
                    ?.isTypedSchedule(scheduleName);
                const config = usesTypedControls
                    ? window.IcFormControls.classify(
                        row.textContent,
                        columnContext(table, rowIndex, cellIndex)
                    )
                    : { type: "text", kind: "text" };
                cell.replaceChildren(
                    buildAnswerField(
                        config,
                        key,
                        savedAnswers[key],
                        label
                    )
                );
            });
        });
    });

    updateCompletion();
}

function validateIcExceptions() {
    if (!window.IcFormControls?.isTypedSchedule(
        loadedScheduleName
    )) {
        return true;
    }

    document.querySelectorAll(".ic-row-needs-remarks")
        .forEach(row => row.classList.remove(
            "ic-row-needs-remarks"
        ));

    const generalRemarks = document.getElementById(
        "staffRemarks"
    )?.value.trim();
    const adverseField = [...document.querySelectorAll(
        ".ic-answer-select[data-answer-key]"
    )].find(field => {
        if (!window.IcFormControls.isAdverse(field.value)) return false;
        const row = field.closest("tr");
        const remarks = [...(row?.querySelectorAll(
            'textarea[data-answer-key], input[data-answer-key][data-field-kind="remarks"]'
        ) || [])];
        if (remarks.length) {
            return !remarks.some(item => item.value.trim());
        }
        return !generalRemarks;
    });

    if (!adverseField) return true;
    showFormMessage(
        "Please enter remarks for every defect, missing item or negative result.",
        true
    );
    adverseField.focus();
    adverseField.closest("tr")?.classList.add("ic-row-needs-remarks");
    return false;
}

function collectAnswers() {
    const answers = {};

    document.querySelectorAll("[data-answer-key]")
        .forEach(field => {
            answers[field.dataset.answerKey] =
                field.value.trim();
        });

    return answers;
}

function updateCompletion() {
    const fields = [
        ...document.querySelectorAll("[data-answer-key]")
    ];
    const filled = fields.filter(
        field => field.value.trim()
    ).length;

    document.getElementById("completionText").textContent =
        `${filled} of ${fields.length} fields filled`;
}

function setReadOnly(readOnly) {
    document.querySelectorAll(
        "[data-answer-key], #staffRemarks, #supervisorSelect"
    ).forEach(field => {
        field.disabled = readOnly;
    });

    document.getElementById("saveDraftBtn").disabled = readOnly;
    document.getElementById("submitFormBtn").disabled = readOnly;
}

async function loadSupervisors(section, selectedId) {
    const response = await fetch(
        `/api/supervisors/section/${encodeURIComponent(section)}`
    );
    const supervisors = await response.json();

    if (!response.ok) {
        throw new Error(
            supervisors.message ||
            "Unable to load Supervisors."
        );
    }

    const select =
        document.getElementById("supervisorSelect");
    select.innerHTML =
        '<option value="">Select Supervisor</option>';

    supervisors.forEach(supervisor => {
        const option = document.createElement("option");
        option.value = supervisor.id;
        option.textContent =
            `${supervisor.name} (${supervisor.designation || "Supervisor"})`;
        option.selected =
            Number(supervisor.id) === Number(selectedId);
        select.appendChild(option);
    });
}

async function loadScheduleForm() {
    try {
        const response = await fetch(
            `/api/schedule-forms/assignment/${distributionId}/staff/${scheduleStaffId}`
        );
        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Unable to load schedule form."
            );
        }

        const { assignment, template, submission } = result;
        const header =
            assignment.detail.assign_work_header || {};

        loadedScheduleName =
            header.schedule_master?.schedule_name || "";

        loadedSubmission = submission;

        document.getElementById("staffName").textContent =
            assignment.employee.name;
        document.getElementById("locoNo").textContent =
            header.loco_master?.loco_no ||
            header.temporary_loco_master?.loco_no || "-";
        document.getElementById("scheduleName").textContent =
            header.schedule_master?.schedule_name || "-";
        document.getElementById("workName").textContent =
            assignment.detail.work_master?.work_name || "-";
        document.getElementById("assignDate").textContent =
            assignment.distribution.assigned_date || "-";
        document.getElementById("formTitle").textContent =
            template.form_name;
        document.getElementById("sourceFile").textContent =
            template.source_file_name || "";
        document.getElementById("formStatus").textContent =
            submission?.status || "New";

        await loadSupervisors(
            assignment.employee.section,
            submission?.submitted_to_supervisor_id ||
                assignment.distribution.assigned_by
        );

        const html =
            template.template_schema?.document_html || "";

        const isPdf =
            template.template_schema?.source_type === "pdf";

        if (!html && !isPdf) {
            throw new Error(
                "This source is registered, but its fillable web template is not configured yet."
            );
        }

        const container =
            document.getElementById("templateContainer");
        const templateContent = isPdf
            ? `<object class="schedule-pdf-reference"
                    data="/api/schedule-forms/template/${template.id}/source"
                    type="application/pdf">
                    <p>PDF preview unavailable.
                        <a href="/api/schedule-forms/template/${template.id}/source"
                            target="_blank" rel="noopener">Open source PDF</a>
                    </p>
                </object>`
            : safeTemplateHtml(html);

        container.innerHTML = `
            <div class="form-document-header">
                <img src="../images/IR-logo.jpeg"
                    alt="Indian Railways logo">
                <div class="form-document-title">
                    <strong>LOCOMOTIVE SHED, SABARMATI</strong>
                    <span>${template.form_name}</span>
                </div>
                <img src="../images/SBI-logo.jpeg"
                    alt="SBI Shed logo">
            </div>
            ${templateContent}
        `;
        if (!isPdf) {
            createAnswerFields(
                submission?.form_answers || {},
                loadedScheduleName
            );
            window.BilingualScheduleActivities?.enhance(
                container
            );
        } else {
            updateCompletion();
        }

        document.getElementById("staffRemarks").value =
            submission?.staff_remarks || "";

        setReadOnly(
            [
                "Submitted",
                "Supervisor Review",
                "Forwarded to Incharge",
                "Returned to Supervisor",
                "Approved"
            ]
                .includes(submission?.status)
        );
    } catch (error) {
        document.getElementById("templateContainer").textContent =
            error.message;
        showFormMessage(error.message, true);
        setReadOnly(true);
    }
}

async function saveForm(action) {
    const isSubmit = action === "submit";

    if (isSubmit && !validateIcExceptions()) {
        return;
    }

    if (
        isSubmit &&
        !confirm(
            "Submit this schedule form? After submission it cannot be edited."
        )
    ) {
        return;
    }

    const draftButton =
        document.getElementById("saveDraftBtn");
    const submitButton =
        document.getElementById("submitFormBtn");
    const draftLabel = draftButton.textContent;
    const submitLabel = submitButton.textContent;

    draftButton.disabled = true;
    submitButton.disabled = true;
    if (isSubmit) {
        submitButton.textContent = "Submitting...";
        showFormMessage(
            "Submitting schedule form. Please wait..."
        );
    } else {
        draftButton.textContent = "Saving...";
        showFormMessage("Saving draft. Please wait...");
    }

    try {
        const response = await fetch(
            `/api/schedule-forms/assignment/${distributionId}/staff/${scheduleStaffId}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    action,
                    form_answers: collectAnswers(),
                    supervisor_id:
                        Number(
                            document.getElementById(
                                "supervisorSelect"
                            ).value
                        ) || null,
                    staff_remarks:
                        document.getElementById("staffRemarks")
                            .value.trim()
                })
            }
        );
        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Unable to save schedule form."
            );
        }

        loadedSubmission = result.submission;
        document.getElementById("formStatus").textContent =
            result.submission.status;
        showFormMessage(result.message);

        if (isSubmit) {
            setReadOnly(true);
            submitButton.textContent = "Submitted";

            window.setTimeout(() => {
                window.location.href =
                    "/dashboard/staff.html";
            }, 1200);
        } else {
            draftButton.disabled = false;
            submitButton.disabled = false;
            draftButton.textContent = draftLabel;
            submitButton.textContent = submitLabel;
        }
    } catch (error) {
        draftButton.disabled = false;
        submitButton.disabled = false;
        draftButton.textContent = draftLabel;
        submitButton.textContent = submitLabel;
        showFormMessage(error.message, true);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (!isStaffSession()) {
        window.location.replace("/dashboard/login.html");
        return;
    }

    document.getElementById("dashboardBtn").addEventListener(
        "click",
        () => {
            window.location.href = "/dashboard/staff.html";
        }
    );

    document.getElementById("saveDraftBtn").addEventListener(
        "click",
        () => saveForm("draft")
    );

    document.getElementById("submitFormBtn").addEventListener(
        "click",
        () => saveForm("submit")
    );

    loadScheduleForm();
});
