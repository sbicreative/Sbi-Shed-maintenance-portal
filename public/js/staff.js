const currentUser = readCurrentUser();
const employeeMasterId =
    Number(currentUser?.employee_master_id);
let assignedWork = [];
let showHistory = false;

function readCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch (error) {
        return null;
    }
}

function requireStaffLogin() {
    const role =
        String(currentUser?.role || "")
            .trim()
            .toLowerCase();

    if (
        !currentUser ||
        role !== "staff"
    ) {
        window.location.replace("/dashboard/login.html");
        return false;
    }

    if (!employeeMasterId) {
        showMessage(
            "Your login is not mapped with Employee Master. Please contact Admin.",
            true
        );
        document.getElementById("assignedWorkBody").innerHTML = `
            <tr>
            <td colspan="9">Employee mapping is required.</td>
            </tr>
        `;
        return false;
    }

    return true;
}

function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function normalizedStatus(item) {
    return String(item.status || "Assigned").trim();
}

function showMessage(message, isError = false) {
    const element = document.getElementById("dashboardMessage");
    element.textContent = message;
    element.classList.toggle("error", isError);
    element.hidden = !message;
}

function updateClock() {
    document.getElementById("currentDateTime").textContent =
        new Intl.DateTimeFormat("en-IN", {
            dateStyle: "medium",
            timeStyle: "medium"
        }).format(new Date());
}

async function loadAssignedWork() {
    const body = document.getElementById("assignedWorkBody");
    body.innerHTML = `
        <tr>
            <td colspan="9">Loading assigned work...</td>
        </tr>
    `;
    showMessage("");

    try {
        const response = await fetch(
            `/api/manpower-distribution/staff/${employeeMasterId}`
        );
        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Unable to load assigned work."
            );
        }

        assignedWork = Array.isArray(result) ? result : [];
        const hasLocoAssignment = assignedWork.some(item => {
            const header = item.work_detail?.assign_work_header || {};
            return Boolean(header.loco_master?.loco_no || header.temporary_loco_master?.loco_no);
        });
        const repairsButton = document.getElementById("repairsScheduleBtn");
        if (repairsButton) repairsButton.hidden = !hasLocoAssignment;
        document.querySelectorAll("[data-repairs-schedule-access]")
            .forEach(link => { link.hidden = !hasLocoAssignment; });
        window.assignedRepairLocoNumbers = new Set(assignedWork.map(item => {
            const header = item.work_detail?.assign_work_header || {};
            return String(header.loco_master?.loco_no || header.temporary_loco_master?.loco_no || "").trim().toLowerCase();
        }).filter(Boolean));
        window.dispatchEvent(new CustomEvent("assigned-repair-locos-ready"));
        updateSummary();
        renderWorkTable();
    } catch (error) {
        body.innerHTML = `
            <tr>
            <td colspan="9">Unable to load assigned work.</td>
            </tr>
        `;
        showMessage(error.message, true);
    }
}

function updateSummary() {
    const today = localDateKey();
    const todayItems = assignedWork.filter(
        item => item.assigned_date === today
    );
    const pending = assignedWork.filter(
        item => normalizedStatus(item) !== "Completed"
    );
    const completedToday = todayItems.filter(
        item => normalizedStatus(item) === "Completed"
    );

    document.getElementById("todayAssigned").textContent =
        todayItems.length;
    document.getElementById("pendingWork").textContent =
        pending.length;
    document.getElementById("completedToday").textContent =
        completedToday.length;
    document.getElementById("formsSubmitted").textContent =
        completedToday.length;
}

function visibleWork() {
    if (showHistory) {
        return assignedWork;
    }

    const today = localDateKey();
    return assignedWork.filter(
        item => item.assigned_date === today
    );
}

function statusClass(status) {
    if (status === "Completed") return "status-completed";
    if (status === "In Progress") return "status-in-progress";
    return "";
}

function actionButton(item) {
    const status = normalizedStatus(item);

    if (!item.is_lead) {
        return `<button class="work-action" type="button" data-open-form="${item.id}">View Form</button>`;
    }

    if (status === "Completed") {
        return `
            <button class="work-action"
                type="button"
                data-open-form="${item.id}">
                View Form
            </button>
        `;
    }

    if (status === "In Progress") {
        return `
            <button class="work-action"
                type="button"
                data-open-form="${item.id}">
                Open Form
            </button>
        `;
    }

    return `
        <button class="work-action"
            type="button"
            data-status-id="${item.id}"
            data-next-status="In Progress">
            Start Work
        </button>
    `;
}

function renderWorkTable() {
    const body = document.getElementById("assignedWorkBody");
    const items = visibleWork();

    document.getElementById("workTableTitle").textContent =
        showHistory ? "Work History" : "Today's Assigned Work";
    document.getElementById("workTableSubtitle").textContent =
        showHistory
            ? "All work mapped to your employee master record"
            : "Work mapped to your employee master record";

    if (items.length === 0) {
        body.innerHTML = `
            <tr class="empty-work-grid" aria-label="Empty assigned work record">
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
            </tr>
            <tr class="empty-work-message">
                <td colspan="9">
                    ${showHistory
                        ? "No work history found."
                        : "No work assigned for today."}
                </td>
            </tr>
        `;
        return;
    }

    body.innerHTML = items.map((item, index) => {
        const detail = item.work_detail || {};
        const header = detail.assign_work_header || {};
        const status = normalizedStatus(item);
        const locoRemarks = Array.isArray(item.loco_repair_remarks)
            ? item.loco_repair_remarks
            : [];
        const remarksMarkup = locoRemarks.length
            ? `<div class="staff-loco-remarks">${locoRemarks.map(remark => `
                <div class="staff-loco-remark">
                    <p>${escapeHtml(remark.remark_text)}</p>
                    <small>${escapeHtml(remark.author_name)} (${escapeHtml(remark.author_role)})</small>
                </div>`).join("")}</div>`
            : '<span class="no-staff-remarks">-</span>';

        return `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(item.assigned_date || "-")}</td>
                <td>${escapeHtml(
                    header.loco_master?.loco_no ||
                    header.temporary_loco_master?.loco_no || "-"
                )}</td>
                <td>${escapeHtml(
                    header.schedule_master?.schedule_name || "-"
                )}</td>
                <td>${escapeHtml(
                    detail.work_master?.work_name || "-"
                )}</td>
                <td>${remarksMarkup}</td>
                <td>${escapeHtml(
                    item.assigned_by_name || "Supervisor"
                )}</td>
                <td>
                    <span class="status-badge ${statusClass(status)}">
                        ${escapeHtml(status)}
                    </span>
                    <small>${item.is_lead ? "Lead Staff" : "Team Member · View Only"}</small>
                </td>
                <td>${actionButton(item)}</td>
            </tr>
        `;
    }).join("");
}

async function updateWorkStatus(distributionId, status, button) {
    button.disabled = true;

    try {
        const response = await fetch(
            `/api/manpower-distribution/staff/${employeeMasterId}/${distributionId}/status`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ status })
            }
        );
        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Unable to update work status."
            );
        }

        const item = assignedWork.find(
            work => Number(work.id) === Number(distributionId)
        );

        if (item) item.status = status;

        updateSummary();
        renderWorkTable();
        showMessage(
            status === "Completed"
                ? "Work submitted successfully."
                : "Work started successfully."
        );
    } catch (error) {
        button.disabled = false;
        showMessage(error.message, true);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("userName").textContent =
        currentUser?.name || "Staff";

    updateClock();
    setInterval(updateClock, 1000);

    document.getElementById("logoutBtn").addEventListener(
        "click",
        () => {
            if (!confirm("Are you sure you want to logout?")) return;
            localStorage.removeItem("user");
            window.location.replace("/dashboard/login.html");
        }
    );

    document.getElementById("refreshBtn").addEventListener(
        "click",
        loadAssignedWork
    );

    document.querySelector("[data-scroll-work]").addEventListener(
        "click",
        () => {
            showHistory = false;
            renderWorkTable();
            document.getElementById("assignedWorkSection")
                .scrollIntoView({ behavior: "smooth" });
        }
    );

    document.querySelector("[data-show-history]").addEventListener(
        "click",
        () => {
            showHistory = true;
            renderWorkTable();
            document.getElementById("assignedWorkSection")
                .scrollIntoView({ behavior: "smooth" });
        }
    );

    document.querySelector("[data-open-current]").addEventListener(
        "click",
        () => {
            const current = assignedWork.find(item =>
                item.assigned_date === localDateKey() &&
                normalizedStatus(item) !== "Assigned"
            );

            if (current) {
                window.location.href =
                    `/dashboard/schedule-form.html?assignment=${current.id}`;
                return;
            }

            showMessage(
                "Start an assigned work before opening its schedule form.",
                true
            );
        }
    );

    document.getElementById("assignedWorkBody").addEventListener(
        "click",
        event => {
            const button = event.target.closest("[data-status-id]");
            const formButton =
                event.target.closest("[data-open-form]");

            if (formButton) {
                window.location.href =
                    `/dashboard/schedule-form.html?assignment=${formButton.dataset.openForm}`;
                return;
            }

            if (!button) return;

            updateWorkStatus(
                Number(button.dataset.statusId),
                button.dataset.nextStatus,
                button
            );
        }
    );

    if (requireStaffLogin()) {
        loadAssignedWork();
    }
});
