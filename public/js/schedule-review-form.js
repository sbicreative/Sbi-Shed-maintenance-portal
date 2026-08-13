const reviewer = readReviewer();
const reviewerRole =
    String(reviewer?.role || "").trim().toLowerCase();
const reviewerId =
    Number(reviewer?.acting_for_incharge_id || reviewer?.supervisor_master_id);
const actionReviewerId = Number(reviewer?.supervisor_master_id);
const formId = Number(
    new URLSearchParams(window.location.search).get("form")
);
let reviewRecord = null;

function expiredActingFormAccess() {
    if (!reviewer?.acting_charge) return false;
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    return today < String(reviewer.charge_handover?.start_date || "") ||
        today > String(reviewer.charge_handover?.end_date || "");
}

function readReviewer() {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch (error) {
        return null;
    }
}

function showReviewMessage(message, isError = false) {
    const element = document.getElementById("formMessage");
    element.textContent = message;
    element.classList.toggle("error", isError);
    element.hidden = !message;
}

function sanitizeReviewHtml(html) {
    const value = new DOMParser()
        .parseFromString(String(html || ""), "text/html");
    value.querySelectorAll("script,iframe,object,embed,style,img")
        .forEach(element => element.remove());
    value.querySelectorAll("*").forEach(element => {
        [...element.attributes].forEach(attribute => {
            if (
                attribute.name.toLowerCase().startsWith("on")
            ) {
                element.removeAttribute(attribute.name);
            }
        });
    });
    return value.body.innerHTML;
}

function prepareReviewColumns(table) {
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

function reviewStaffName(cell, key, answers, attributions) {
    const attribution = attributions[key];
    const legacyName = answers[cell.dataset.legacyAnswerKey || ""];
    const safeName = String(attribution?.staff_name || legacyName || "—")
        .replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
    cell.classList.add("staff-name-cell");
    cell.innerHTML = `<strong>${safeName}</strong>${attribution?.entered_at ? `<small>${new Date(attribution.entered_at).toLocaleString("en-IN")}</small>` : ""}`;
}

function populateReviewFields(answers, attributions = {}) {
    document.querySelectorAll("#templateContainer table")
        .forEach((table, tableIndex) => {
            const columns = prepareReviewColumns(table);
            [...table.rows].forEach((row, rowIndex) => {
                [...row.cells].forEach((cell, cellIndex) => {
                    if (
                        cell.textContent.replace(/\s+/g, " ").trim()
                    ) return;

                    if (cell.dataset.attributionFor) {
                        reviewStaffName(cell, cell.dataset.attributionFor, answers, attributions);
                        return;
                    }
                    if (columns.name !== null && cellIndex === columns.name) {
                        cell.dataset.legacyAnswerKey = `t${tableIndex}_r${rowIndex}_c${cellIndex}`;
                        reviewStaffName(cell, `t${tableIndex}_r${rowIndex}_c${columns.action}`, answers, attributions);
                        return;
                    }

                    const key =
                        cell.dataset.answerKey || `t${tableIndex}_r${rowIndex}_c${cellIndex}`;
                    const field = document.createElement("textarea");
                    field.className = "cell-answer";
                    field.dataset.answerKey = key;
                    field.value = answers[key] || "";
                    cell.replaceChildren(field);
                });
            });
        });
}

function showAttributions(attributions = {}) {
    document.querySelectorAll("[data-answer-key]").forEach(field => {
        const attribution = attributions[field.dataset.answerKey];
        if (!attribution || !field.value.trim()) return;
        field.title = `Entered by ${attribution.staff_name} on ${new Date(attribution.entered_at).toLocaleString("en-IN")}`;
        const credit = document.createElement("small");
        credit.className = "answer-credit";
        credit.textContent = field.title;
        field.parentElement.appendChild(credit);
    });
}

async function loadContinuationStaff(assignment) {
    const params = new URLSearchParams({
        department: assignment.employee.department || "",
        section: assignment.employee.section || ""
    });
    const response = await fetch(`/api/employees?${params}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Unable to load Staff.");
    const select = document.getElementById("continuationStaff");
    (Array.isArray(result) ? result : []).forEach(employee => {
        const option = document.createElement("option");
        option.value = employee.id;
        option.textContent = `${employee.name} (${employee.designation || "Staff"})`;
        select.appendChild(option);
    });
    document.getElementById("continuationDate").value = new Date().toISOString().slice(0, 10);
}

function collectReviewAnswers() {
    const answers = {};
    document.querySelectorAll("[data-answer-key]")
        .forEach(field => {
            answers[field.dataset.answerKey] =
                field.value.trim();
        });
    return answers;
}

function lockSubmittedAnswers() {
    document.querySelectorAll("[data-answer-key]")
        .forEach(field => {
            field.readOnly = true;
            field.setAttribute("aria-readonly", "true");
            field.title =
                "Submitted staff answer (read-only for Supervisor)";
        });
}

async function loadIncharges(department) {
    const response = await fetch(
        `/api/schedule-forms/incharges?department=${encodeURIComponent(department)}`
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);

    const select = document.getElementById("inchargeSelect");
    result.forEach(item => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent =
            `${item.name} (${item.designation || "Incharge"})`;
        select.appendChild(option);
    });
}

function renderActionButtons(status) {
    const actions = document.getElementById("reviewActions");
    const locked = status === "Approved";

    if (locked) {
        actions.innerHTML =
            '<button type="button" disabled>Approved</button>';
        document.querySelectorAll(
            "[data-answer-key], #reviewRemarks, #inchargeSelect"
        ).forEach(field => field.disabled = true);
        return;
    }

    if (reviewerRole === "supervisor") {
        document.getElementById("inchargeField").hidden = false;
        const incomplete = reviewRecord.form.completion_state !== "Complete";
        document.getElementById("continuationFields").hidden = !incomplete;
        actions.innerHTML = `
            <button class="draft-btn" type="button" data-action="save">
                Save Remarks
            </button>
            <button class="draft-btn" type="button" data-action="return">
                Return to Staff
            </button>
            ${incomplete
                ? '<button class="submit-btn" type="button" data-continuation>Assign Continuation</button>'
                : '<button class="submit-btn" type="button" data-action="forward">Forward to Incharge</button>'}
        `;
    } else {
        document.getElementById("inchargeField").remove();
        actions.innerHTML = `
            <button class="draft-btn" type="button" data-action="save">
                Save Edit
            </button>
            <button class="draft-btn" type="button" data-action="return">
                Return to Supervisor
            </button>
            <button class="submit-btn" type="button" data-action="approve">
                Approve Final
            </button>
        `;
    }
}

async function loadReviewForm() {
    const response = await fetch(
        `/api/schedule-forms/review/${formId}/${reviewerRole}/${reviewerId}`
    );
    const result = await response.json();
    if (!response.ok) {
        throw new Error(
            result.message || "Unable to load review form."
        );
    }

    reviewRecord = result;
    const { form, assignment, template } = result;
    const header = assignment.detail.assign_work_header || {};

    document.getElementById("formStatus").textContent =
        form.status;
    document.getElementById("staffName").textContent =
        assignment.employee.name;
    document.getElementById("locoNo").textContent =
        header.loco_master?.loco_no ||
        header.temporary_loco_master?.loco_no || "-";
    document.getElementById("scheduleName").textContent =
        header.schedule_master?.schedule_name || "-";
    document.getElementById("workName").textContent =
        assignment.detail.work_master?.work_name || "-";
    document.getElementById("formTitle").textContent =
        template.form_name;
    document.getElementById("sourceFile").textContent =
        template.source_file_name || "";
    document.getElementById("reviewRemarks").value =
        reviewerRole === "supervisor"
            ? form.supervisor_remarks || ""
            : form.incharge_remarks || "";

    const container =
        document.getElementById("templateContainer");
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
        ${sanitizeReviewHtml(
            template.template_schema?.document_html || ""
        )}
    `;
    populateReviewFields(form.form_answers || {}, form.answer_attributions || {});
    showAttributions(form.answer_attributions || {});

    lockSubmittedAnswers();
    if (reviewerRole === "supervisor") {
        await loadIncharges(
            assignment.employee.department
        );
        if (form.completion_state !== "Complete") await loadContinuationStaff(assignment);
    }

    renderActionButtons(form.status);
}

async function assignContinuation(button) {
    const staffId = Number(document.getElementById("continuationStaff").value);
    const assignedDate = document.getElementById("continuationDate").value;
    if (!staffId || !assignedDate) return showReviewMessage("Select Staff and continuation date.", true);
    button.disabled = true;
    try {
        const response = await fetch(`/api/schedule-forms/review/${formId}/continuation/${reviewerId}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staff_id: staffId, assigned_date: assignedDate })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showReviewMessage(result.message);
        setTimeout(() => window.location.href = "/dashboard/schedule-review.html", 1000);
    } catch (error) { button.disabled = false; showReviewMessage(error.message, true); }
}

async function performReviewAction(action, button) {
    const remarks =
        document.getElementById("reviewRemarks").value.trim();
    const inchargeId =
        Number(
            document.getElementById("inchargeSelect").value
        ) || null;

    if (action === "return" && !remarks) {
        showReviewMessage(
            "Return remarks are required.",
            true
        );
        return;
    }

    if (action === "forward" && !inchargeId) {
        showReviewMessage(
            "Please select an Incharge.",
            true
        );
        return;
    }

    button.disabled = true;
    showReviewMessage("Saving review action...");

    try {
        const requestBody = {
            action,
            remarks,
            author_name: reviewer?.name || reviewerRole,
            incharge_id: inchargeId,
            action_reviewer_id: actionReviewerId
        };

        if (reviewerRole !== "supervisor") {
            requestBody.form_answers = collectReviewAnswers();
        }

        const response = await fetch(
            `/api/schedule-forms/review/${formId}/${reviewerRole}/${reviewerId}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            }
        );
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message);
        }

        showReviewMessage(result.message);
        document.getElementById("formStatus").textContent =
            result.submission.status;

        window.setTimeout(() => {
            window.location.href =
                "/dashboard/schedule-review.html";
        }, 1000);
    } catch (error) {
        button.disabled = false;
        showReviewMessage(error.message, true);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (expiredActingFormAccess()) {
        window.location.replace("/dashboard/login.html");
        return;
    }
    if (
        !["supervisor", "incharge"].includes(reviewerRole) ||
        !reviewerId ||
        !formId
    ) {
        window.location.replace("/dashboard/login.html");
        return;
    }

    document.getElementById("reviewerName").textContent =
        reviewer.name;
    document.getElementById("reviewRoleTitle").textContent =
        reviewerRole === "supervisor"
            ? "Supervisor Schedule Form Review"
            : "Incharge Schedule Form Review";

    document.getElementById("backBtn").addEventListener(
        "click",
        () => {
            window.location.href =
                "/dashboard/schedule-review.html";
        }
    );

    document.getElementById("reviewActions")
        .addEventListener("click", event => {
            const button =
                event.target.closest("[data-action], [data-continuation]");
            if (!button) return;
            if (button.hasAttribute("data-continuation")) return assignContinuation(button);
            performReviewAction(
                button.dataset.action,
                button
            );
        });

    loadReviewForm().catch(error => {
        showReviewMessage(error.message, true);
        document.getElementById("templateContainer")
            .textContent = error.message;
    });
});
