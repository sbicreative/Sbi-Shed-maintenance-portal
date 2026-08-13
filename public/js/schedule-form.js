const scheduleUser = readUser();
const scheduleStaffId =
    Number(scheduleUser?.employee_master_id);
const query = new URLSearchParams(window.location.search);
const distributionId =
    Number(query.get("assignment"));
let loadedSubmission = null;

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

function prepareBilingualColumns(table) {
    const columns = { action: null, name: null, remark: null };
    [...table.rows].slice(0, 8).forEach(row => [...row.cells].forEach((cell, index) => {
        const text = cell.textContent.replace(/\s+/g, " ").trim().toLowerCase();
        if (/action taken|की गयी कार्यवाही|कार्रवाई की गयी|की गई कार्रवाई/.test(text)) {
            columns.action = index;
            cell.innerHTML = "Action Taken<br><small>की गई कार्रवाई</small>";
        } else if (/name of tcn|name of staff|टीसीएन का नाम/.test(text)) {
            columns.name = index;
            cell.innerHTML = "Name of TCN/Staff<br><small>तकनीशियन/कर्मचारी का नाम</small>";
        } else if (/sign\s*\/\s*remarks?|remarks?$|हस्ताक्षर.*टिप्पणी/.test(text)) {
            columns.remark = index;
            cell.innerHTML = "Remark<br><small>टिप्पणी</small>";
        } else if (/detail of work|description of activities|items to check|कार्य.*निरीक्षण का विवरण/.test(text)) {
            cell.innerHTML = "Work item<br><small>कार्य विवरण</small>";
        }
    }));
    return columns;
}

function renderStaffName(cell, key, savedAnswers, attributions) {
    const attribution = attributions[key];
    const legacyName = savedAnswers[cell.dataset.legacyAnswerKey || ""];
    const name = attribution?.staff_name || legacyName || "—";
    const time = attribution?.entered_at
        ? `<small>${new Date(attribution.entered_at).toLocaleString("en-IN")}</small>`
        : "";
    cell.classList.add("staff-name-cell");
    cell.innerHTML = `<strong>${String(name).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char])}</strong>${time}`;
}

function createAnswerFields(savedAnswers = {}, attributions = {}) {
    const tables = document.querySelectorAll(
        "#templateContainer table"
    );

    tables.forEach((table, tableIndex) => {
        const columns = prepareBilingualColumns(table);
        [...table.rows].forEach((row, rowIndex) => {
            [...row.cells].forEach((cell, cellIndex) => {
                const plainText =
                    cell.textContent.replace(/\s+/g, " ").trim();

                if (plainText) return;

                const explicitAttributionKey = cell.dataset.attributionFor;
                if (explicitAttributionKey) {
                    renderStaffName(cell, explicitAttributionKey, savedAnswers, attributions);
                    return;
                }

                if (columns.name !== null && cellIndex === columns.name) {
                    const actionKey = `t${tableIndex}_r${rowIndex}_c${columns.action}`;
                    cell.dataset.legacyAnswerKey = `t${tableIndex}_r${rowIndex}_c${cellIndex}`;
                    renderStaffName(cell, actionKey, savedAnswers, attributions);
                    return;
                }

                const key =
                    cell.dataset.answerKey || `t${tableIndex}_r${rowIndex}_c${cellIndex}`;
                const textarea = document.createElement("textarea");
                textarea.className = "cell-answer";
                textarea.dataset.answerKey = key;
                const required = cell.dataset.requiredAnswer !== undefined
                    ? cell.dataset.requiredAnswer === "true"
                    : !(columns.remark !== null && cellIndex === columns.remark);
                textarea.dataset.requiredAnswer = String(required);
                textarea.setAttribute(
                    "aria-label",
                    `Answer row ${rowIndex + 1}, column ${cellIndex + 1}`
                );
                textarea.value = savedAnswers[key] || "";
                const attribution = attributions[key];
                if (attribution && textarea.value.trim()) {
                    textarea.readOnly = true;
                    textarea.classList.add("attributed-answer");
                    textarea.title = `Entered by ${attribution.staff_name} on ${new Date(attribution.entered_at).toLocaleString("en-IN")}`;
                    const credit = document.createElement("small");
                    credit.className = "answer-credit";
                    credit.textContent = textarea.title;
                    cell.replaceChildren(textarea, credit);
                } else {
                    cell.replaceChildren(textarea);
                }
                textarea.addEventListener(
                    "input",
                    updateCompletion
                );
            });
        });
    });

    updateCompletion();
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
        ...document.querySelectorAll('[data-answer-key][data-required-answer="true"]')
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
    document.getElementById("submitIncompleteBtn").disabled = readOnly;
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

        const { assignment, template, submission, can_edit: canEdit } = result;
        const header =
            assignment.detail.assign_work_header || {};

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
                submission?.answer_attributions || {}
            );
        } else {
            updateCompletion();
        }

        document.getElementById("staffRemarks").value =
            submission?.staff_remarks || "";

        setReadOnly(
            !canEdit ||
            [
                "Submitted Incomplete",
                "Supervisor Review",
                "Submitted Complete",
                "Forwarded to Incharge",
                "Returned to Supervisor",
                "Approved"
            ]
                .includes(submission?.status)
        );
        if (!canEdit) {
            showFormMessage("View only — only the active Lead Staff can fill or submit this form.");
        }
    } catch (error) {
        document.getElementById("templateContainer").textContent =
            error.message;
        showFormMessage(error.message, true);
        setReadOnly(true);
    }
}

async function saveForm(action) {
    const isSubmit = action !== "draft";

    if (
        isSubmit &&
        !confirm(
            action === "submit_incomplete"
                ? "Submit incomplete form to Supervisor for continuation review?"
                : "Submit completed form for review?"
        )
    ) {
        return;
    }

    const draftButton =
        document.getElementById("saveDraftBtn");
    const submitButton =
        document.getElementById("submitFormBtn");
    const incompleteButton = document.getElementById("submitIncompleteBtn");
    const draftLabel = draftButton.textContent;
    const submitLabel = submitButton.textContent;

    draftButton.disabled = true;
    submitButton.disabled = true;
    incompleteButton.disabled = true;
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
                    answer_keys: [...document.querySelectorAll("[data-answer-key]")]
                        .filter(field => field.dataset.requiredAnswer === "true")
                        .map(field => field.dataset.answerKey),
                    supervisor_id:
                        Number(
                            document.getElementById(
                                "supervisorSelect"
                            ).value
                        ) || null,
                    staff_remarks:
                        document.getElementById("staffRemarks")
                            .value.trim(),
                    author_name:
                        scheduleUser?.name || "Staff"
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
            incompleteButton.disabled = false;
            draftButton.textContent = draftLabel;
            submitButton.textContent = submitLabel;
        }
    } catch (error) {
        draftButton.disabled = false;
        submitButton.disabled = false;
        incompleteButton.disabled = false;
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
        () => saveForm("submit_complete")
    );
    document.getElementById("submitIncompleteBtn").addEventListener(
        "click",
        () => saveForm("submit_incomplete")
    );

    loadScheduleForm();
});
