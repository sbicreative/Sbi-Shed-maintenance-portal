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
const supervisorId = user.id;

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

    showHome();

    updateSerial();

    loadAssignedWork();

}
async function loadAssignedWork() {

    try {

        const response =
    await fetch(
        `/api/supervisors/assigned-work/${user.id}`
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
                    ${item.assign_work_header?.loco_id || ""}
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
        `/api/supervisors/assigned-work/${user.id}`
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
                    ${item.assign_work_header.loco_id}
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