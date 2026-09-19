/* ===========================================
   SBI SHED MAINTENANCE PORTAL
   Supervisor Dashboard
=========================================== */
const user =
    JSON.parse(
        localStorage.getItem("user")
    );

if (!user) {

    window.location.href =
        "/dashboard/login.html";

}
const supervisorId =
    user.supervisor_master_id || user.id;

function escapeDashboardText(value) {
    const element = document.createElement('span');
    element.textContent = value == null ? '' : String(value);
    return element.innerHTML;
}

function localDateValue() {
    const now = new Date();
    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
    ].join("-");
}

async function loadDashboardSummary() {
    try {
        const response = await fetch(
            `/api/supervisors/dashboard-summary/${supervisorId}` +
            `?assign_date=${localDateValue()}`
        );
        const summary = await response.json();
        if (!response.ok) {
            throw new Error(summary.message || "Unable to load summary.");
        }
        document.getElementById("totalAssignedLocos").textContent =
            summary.total_assigned_locos ?? 0;
        document.getElementById("availableStaff").textContent =
            summary.available_staff ?? 0;
    } catch (error) {
        console.error("Supervisor Summary Error:", error);
        await loadDashboardSummaryFallback();
    }
}

async function loadIncompleteFormsSummary() {
    try {
        const response = await fetch(`/api/schedule-forms/incomplete-summary/supervisor/${supervisorId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        document.getElementById("incompleteForms").textContent = result.count ?? 0;
        document.getElementById("incompleteSchedules").textContent =
            result.schedule_names?.join(", ") || "-";
    } catch (error) { console.error("Incomplete Forms Summary:", error); }
}

async function loadDashboardSummaryFallback() {
    try {
        const date = localDateValue();
        const params = new URLSearchParams({
            department: user.department || "",
            section: user.section || ""
        });
        const [workResponse, staffResponse] = await Promise.all([
            fetch(
                `/api/supervisors/assigned-work/${supervisorId}` +
                `?assign_date=${date}`
            ),
            fetch(`/api/employees?${params.toString()}`)
        ]);
        const [works, staff] = await Promise.all([
            workResponse.json(),
            staffResponse.json()
        ]);
        if (!workResponse.ok || !staffResponse.ok) {
            throw new Error("Dashboard fallback data unavailable.");
        }

        const rows = Array.isArray(works) ? works : [];
        const locos = new Set(rows.map(item =>
            item.assign_work_header?.loco_master?.loco_no ||
            item.assign_work_header?.temporary_loco_master?.loco_no
        ).filter(Boolean));
        document.getElementById("totalAssignedLocos").textContent =
            locos.size;
        document.getElementById("availableStaff").textContent =
            Array.isArray(staff) ? staff.length : 0;
    } catch (error) {
        console.error("Supervisor Summary Fallback Error:", error);
    }
}

// ================= USER NAME =================

document.getElementById("userName").textContent =
    user.name;

const MAX_STAFF = 50;
//-------------------------------------
// Panel Navigation
//-------------------------------------

function showWorkDistribution() {

    document.getElementById("homePanel").style.display = "none";
    document.getElementById("reviewPanel").style.display = "none";
    document.getElementById("workPanel").style.display = "block";

}

function showScheduleReview() {

    document.getElementById("homePanel").style.display = "none";
    document.getElementById("workPanel").style.display = "none";
    document.getElementById("reviewPanel").style.display = "block";

}

function showHome() {

    document.getElementById("homePanel").style.display = "block";
    document.getElementById("workPanel").style.display = "none";
    document.getElementById("reviewPanel").style.display = "none";

}

//-------------------------------------
// Add Manpower Row
//-------------------------------------

function addRow() {

    const table = document.getElementById("manpowerTable").getElementsByTagName("tbody")[0];

    if (table.rows.length >= MAX_STAFF) {

        alert("Maximum 50 staff can be assigned.");

        return;
    }

    const row = table.insertRow();

    row.innerHTML = `

    <td></td>

    <td>
        <input type="text"
        class="form-control"
        placeholder="Employee Name">
    </td>

    <td>

        <select class="form-select">

            <option>Technician-I</option>

            <option>Technician-II</option>

            <option>Technician-III</option>

            <option>JE</option>

            <option>SSE</option>

        </select>

    </td>

    <td>

        <select class="form-select">

            <option>A</option>

            <option>B</option>

            <option>C</option>

            <option>General</option>

        </select>

    </td>

    <td class="text-center">

        <button
        class="btn btn-danger btn-sm"
        onclick="deleteRow(this)">
        X
        </button>

    </td>

    `;

    updateSerial();

}

//-------------------------------------
// Delete Row
//-------------------------------------

function deleteRow(button) {

    const row = button.parentNode.parentNode;

    row.remove();

    updateSerial();

}

//-------------------------------------
// Update Serial Numbers
//-------------------------------------

function updateSerial() {

    const table = document.getElementById("manpowerTable").getElementsByTagName("tbody")[0];

    for (let i = 0; i < table.rows.length; i++) {

        table.rows[i].cells[0].innerHTML = i + 1;

    }

}

//-------------------------------------
// Save All
//-------------------------------------

function saveAll() {

    const table = document.getElementById("manpowerTable").getElementsByTagName("tbody")[0];

    const staff = [];

    for (let i = 0; i < table.rows.length; i++) {

        const row = table.rows[i];

        const name = row.cells[1].querySelector("input").value;

        const designation = row.cells[2].querySelector("select").value;

        const shift = row.cells[3].querySelector("select").value;

        staff.push({

            sr: i + 1,

            name,

            designation,

            shift

        });

    }

    console.clear();

    console.table(staff);

    alert("Data Ready.\nNext Step : Save into SQLite Database.");

}

//-------------------------------------
// Reset Table
//-------------------------------------

function clearTable() {

    const tbody = document.getElementById("manpowerTable").getElementsByTagName("tbody")[0];

    tbody.innerHTML = "";

    updateSerial();

}

//-------------------------------------
// Forward Schedule
//-------------------------------------

function forwardSchedule() {

    const incharge = document.querySelector("#reviewPanel select").value;

    if (incharge === "Select Incharge") {

        alert("Please select Incharge.");

        return;

    }

    alert("Schedule forwarded successfully.");

}

//-------------------------------------
// Return Schedule
//-------------------------------------

function returnSchedule() {

    alert("Schedule returned for review.");

}
// ================= LOGOUT =================

document
    .getElementById("logoutBtn")
    .addEventListener("click", () => {

        if (confirm("Are you sure you want to logout?")) {

            localStorage.removeItem("user");

            window.location.href =
                "/dashboard/login.html";

        }

    });
//-------------------------------------
// Auto Start
//-------------------------------------

window.onload = function () {
    loadAssignedWork();
    loadDashboardSummary();
    loadIncompleteFormsSummary();
    setInterval(loadDashboardSummary, 30000);
    setInterval(loadIncompleteFormsSummary, 30000);

}
function groupSupervisorWork(items) {
    const groups = new Map();
    for (const item of items) {
        const header = item.assign_work_header || {};
        const loco = header.loco_master?.loco_no || header.temporary_loco_master?.loco_no || "-";
        const schedule = header.schedule_master?.schedule_name || "-";
        const key = JSON.stringify([header.loco_id || loco, header.temporary_loco_id || null,
            header.schedule_id || schedule, header.assign_date || ""]);
        if (!groups.has(key)) groups.set(key, { loco, schedule, works: new Set(), remarks: new Set() });
        const group = groups.get(key);
        if (item.work_master?.work_name) group.works.add(item.work_master.work_name);
        for (const value of String(item.remarks || "").split("\n")) {
            if (value.trim()) group.remarks.add(value.trim());
        }
        for (const remark of item.repair_remarks || []) {
            if (remark.remark_text?.trim()) group.remarks.add(remark.remark_text.trim());
        }
    }
    return [...groups.values()];
}

async function loadAssignedWork() {
    const tbody = document.getElementById("activityTable");
    try {
        const response = await fetch(
            `/api/supervisors/assigned-work/${supervisorId}?assign_date=${localDateValue()}`
        );
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) throw new Error(data.message || "Unable to load work.");
        const groups = groupSupervisorWork(data);
        tbody.innerHTML = groups.length ? groups.map(group => `
            <tr>
                <td>${escapeDashboardText(group.loco)}</td>
                <td>${escapeDashboardText(group.schedule)}</td>
                <td><ul class="supervisor-group-list">${[...group.works].map(work =>
                    `<li>${escapeDashboardText(work)}</li>`).join("")}</ul></td>
                <td>${group.remarks.size ? `<ol class="supervisor-group-list">${[...group.remarks].map(remark =>
                    `<li>${escapeDashboardText(remark)}</li>`).join("")}</ol>` : "-"}</td>
            </tr>`).join("") : '<tr><td colspan="4">No Record Found</td></tr>';
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="4">Unable to load assigned work. Please refresh.</td></tr>';
    }
}
