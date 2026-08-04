const reviewer = readReviewer();
const reviewerRole =
    String(reviewer?.role || "").trim().toLowerCase();
const reviewerId =
    Number(reviewer?.supervisor_master_id);
const formId = Number(
    new URLSearchParams(window.location.search).get("form")
);
let reviewRecord = null;

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

function populateReviewFields(answers) {
    document.querySelectorAll("#templateContainer table")
        .forEach((table, tableIndex) => {
            [...table.rows].forEach((row, rowIndex) => {
                [...row.cells].forEach((cell, cellIndex) => {
                    if (
                        cell.textContent.replace(/\s+/g, " ").trim()
                    ) return;

                    const key =
                        `t${tableIndex}_r${rowIndex}_c${cellIndex}`;
                    const field = document.createElement("textarea");
                    field.className = "cell-answer";
                    field.dataset.answerKey = key;
                    field.value = answers[key] || "";
                    cell.replaceChildren(field);
                });
            });
        });
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
        actions.innerHTML = `
            <button class="draft-btn" type="button" data-action="save">
                Save Edit
            </button>
            <button class="draft-btn" type="button" data-action="return">
                Return to Staff
            </button>
            <button class="submit-btn" type="button" data-action="forward">
                Forward to Incharge
            </button>
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
    populateReviewFields(form.form_answers || {});

    if (reviewerRole === "supervisor") {
        await loadIncharges(
            assignment.employee.department
        );
    }

    renderActionButtons(form.status);
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
        const response = await fetch(
            `/api/schedule-forms/review/${formId}/${reviewerRole}/${reviewerId}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    action,
                    remarks,
                    incharge_id: inchargeId,
                    form_answers: collectReviewAnswers()
                })
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
                event.target.closest("[data-action]");
            if (!button) return;
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
