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
        document.getElementById("pendingWork").textContent =
            summary.pending_work ?? 0;
        document.getElementById("completedToday").textContent =
            summary.completed_today ?? 0;
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
        document.getElementById("pendingWork").textContent =
            rows.filter(item =>
                String(item.status).toLowerCase() !== "completed"
            ).length;
        document.getElementById("completedToday").textContent =
            rows.filter(item =>
                String(item.status).toLowerCase() === "completed"
            ).length;
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
async function loadAssignedWork() {

    try {

        const response =
    await fetch(
        `/api/supervisors/assigned-work/${supervisorId}`
    );

        const data =
            await response.json();

        const tbody =
            document.getElementById("activityTable");

        tbody.innerHTML = "";

        if (!data.length) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="4">
                        No Record Found
                    </td>
                </tr>
            `;

            return;
        }

        data.forEach(item => {

            const row = document.createElement("tr");

            row.innerHTML = `

                <td>
                    ${item.assign_work_header?.loco_master?.loco_no ||
                    item.assign_work_header?.temporary_loco_master?.loco_no || ""}
                </td>

                <td>
                    ${item.assign_work_header?.schedule_id || ""}
                </td>

                <td>
                    ${item.work_master?.work_name || ""}
                </td>

                <td>
                    ${item.status}
                </td>

            `;

            tbody.appendChild(row);

        });

    }

    catch (err) {

        console.error(err);

    }

}
async function loadAssignedWork() {

    try {

        const response =
    await fetch(
        `/api/supervisors/assigned-work/${supervisorId}`
    );
        const data =
            await response.json();

        const tbody =
            document.getElementById("activityTable");

        tbody.innerHTML = "";

        if (!data.length) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="4">
                        No Record Found
                    </td>
                </tr>
            `;

            return;

        }

        data.forEach(item => {

            const row =
                document.createElement("tr");

            row.innerHTML = `

                <td>
                    ${item.assign_work_header.loco_master?.loco_no ||
                    item.assign_work_header.temporary_loco_master?.loco_no || ""}
                </td>

                <td>
                    ${item.assign_work_header.schedule_id}
                </td>

                <td>
                    ${item.work_master.work_name}
                </td>

                <td>
                    ${item.status}
                </td>

            `;

            tbody.appendChild(row);

        });

    }

    catch (err) {

        console.error(err);

    }

}
