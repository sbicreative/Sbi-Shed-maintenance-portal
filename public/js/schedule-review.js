const reviewUser = getReviewUser();
const reviewRole =
    String(reviewUser?.role || "").trim().toLowerCase();
const reviewerMasterId =
    Number(
        reviewUser?.acting_for_incharge_id ||
        reviewUser?.supervisor_master_id
    );
let reviewRows = [];

function expiredActingReviewAccess() {
    if (!reviewUser?.acting_charge) return false;
    const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata"
    });
    return today < String(reviewUser.charge_handover?.start_date || "") ||
        today > String(reviewUser.charge_handover?.end_date || "");
}

function getReviewUser() {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch (error) {
        return null;
    }
}

function escapeReviewHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function validReviewer() {
    return (
        ["supervisor", "incharge"].includes(reviewRole) &&
        reviewerMasterId
    );
}

function updateDateTime() {
    document.getElementById("currentDateTime").textContent =
        new Date().toLocaleString("en-IN");
}

function statusGroup(status) {
    if (status === "Approved") return "approved";
    if (status.includes("Returned")) return "returned";
    if (status === "Forwarded to Incharge") return "forwarded";
    return "pending";
}

function statusBadge(status) {
    return `
        <span class="status-badge status-${statusGroup(status)}">
            ${escapeReviewHtml(status)}
        </span>
    `;
}

function filteredRows() {
    const date = document.getElementById("reviewDate").value;
    const status =
        document.getElementById("statusFilter").value;

    return reviewRows.filter(item => {
        const itemDate =
            String(item.submitted_at || "").slice(0, 10);
        const dateMatches = !date || itemDate === date;
        const statusMatches =
            status === "all" ||
            statusGroup(item.status) === status;

        return dateMatches && statusMatches;
    });
}

function renderReviewRows() {
    const rows = filteredRows();
    const body = document.getElementById("reviewTableBody");

    if (rows.length === 0) {
        body.innerHTML = `
            <tr class="no-data-row">
                <td colspan="7">No Schedule Form Found</td>
            </tr>
        `;
    } else {
        body.innerHTML = rows.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <strong>${escapeReviewHtml(item.loco_no)}</strong>
                    <div>${escapeReviewHtml(item.staff_name)}</div>
                </td>
                <td>${escapeReviewHtml(item.schedule_name)}</td>
                <td>
                    <span class="work-badge">
                        ${escapeReviewHtml(item.assigned_work)}
                    </span>
                </td>
                <td>${escapeReviewHtml(item.form_name)}</td>
                <td>${statusBadge(item.status)}</td>
                <td>
                    <button class="form-btn"
                        type="button"
                        data-review-form="${item.id}">
                        ${item.status === "Approved" ? "View" : "Review"}
                    </button>
                </td>
            </tr>
        `).join("");
    }

    document.getElementById("totalWorks").textContent =
        rows.length;
    document.getElementById("approvedForms").textContent =
        rows.filter(item => item.status === "Approved").length;
    document.getElementById("returnedForms").textContent =
        rows.filter(item => item.status.includes("Returned")).length;
    document.getElementById("pendingForms").textContent =
        rows.filter(item =>
            !["Approved"].includes(item.status) &&
            !item.status.includes("Returned")
        ).length;
}

async function loadReviewQueue() {
    const response = await fetch(
        `/api/schedule-forms/review-queue/${reviewRole}/${reviewerMasterId}`
    );
    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.message || "Unable to load review forms."
        );
    }

    reviewRows = Array.isArray(result) ? result : [];
    renderReviewRows();
}

document.addEventListener("DOMContentLoaded", () => {
    if (expiredActingReviewAccess()) {
        window.location.replace("/dashboard/login.html");
        return;
    }
    if (!validReviewer()) {
        window.location.replace("/dashboard/login.html");
        return;
    }

    document.getElementById("userName").textContent =
        reviewUser.name;
    document.querySelector(".bar-left").textContent =
        reviewRole === "supervisor"
            ? "SUPERVISOR SCHEDULE FORM REVIEW"
            : "INCHARGE SCHEDULE FORM REVIEW";

    updateDateTime();
    setInterval(updateDateTime, 1000);

    document.getElementById("reviewDate").value =
        new Date().toISOString().slice(0, 10);

    document.getElementById("reviewDashboardBtn")
        .addEventListener("click", () => {
            window.location.href =
                reviewRole === "supervisor"
                    ? "/dashboard/supervisor.html"
                    : "/dashboard/incharge.html";
        });

    document.getElementById("reviewDate")
        .addEventListener("change", renderReviewRows);
    document.getElementById("statusFilter")
        .addEventListener("change", renderReviewRows);

    document.getElementById("reviewTableBody")
        .addEventListener("click", event => {
            const button =
                event.target.closest("[data-review-form]");
            if (!button) return;
            window.location.href =
                `/dashboard/schedule-review-form.html?form=${button.dataset.reviewForm}`;
        });

    loadReviewQueue().catch(error => {
        document.getElementById("reviewTableBody").innerHTML = `
            <tr class="no-data-row">
                <td colspan="7">${escapeReviewHtml(error.message)}</td>
            </tr>
        `;
    });
});
