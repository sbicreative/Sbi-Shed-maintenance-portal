// ==========================================
// ASSIGN WORK - INCHARGE
// SBI SHED LOCO APP
// ==========================================

const assignDate =
    document.getElementById("assignDate");

const locoType =
    document.getElementById("locoType");

const workTableBody =
    document.getElementById("workTableBody");

const addLocoBtn =
    document.getElementById("addLocoBtn");


// ==========================================
// MASTER LISTS
// ==========================================

let locoList = [];

let scheduleList = [];

let workList = [];

let supervisorList = [];


// ==========================================
// PAGE LOAD
// ==========================================

window.addEventListener(
    "DOMContentLoaded",
    async function () {

        assignDate.value =
            new Date()
                .toISOString()
                .split("T")[0];

        await loadSchedules();

        await loadWorks();

        await loadSupervisors();

    }
);


// ==========================================
// LOAD SCHEDULES
// Department-wise filtering
// ==========================================

async function loadSchedules() {

    try {

        const user =
            JSON.parse(
                localStorage.getItem("user")
            );

        if (!user) {

            alert("Login Required.");

            return;

        }

        const res =
            await fetch("/api/schedules");

        const allSchedules =
            await res.json();

        if (!res.ok) {

            throw new Error(
                allSchedules.message ||
                "Unable to load schedules."
            );

        }

        scheduleList =
            allSchedules.filter(item => {

                if (
                    user.department ===
                    "Electrical"
                ) {

                    return (
                        Number(item.department_id) === 1
                    );

                }

                if (
                    user.department ===
                    "Mechanical"
                ) {

                    return (
                        Number(item.department_id) === 2
                    );

                }

                return false;

            });

    }

    catch (err) {

        console.error(
            "Schedule Load Error:",
            err
        );

    }

}


// ==========================================
// LOAD WORK MASTER
// ==========================================

async function loadWorks() {

    try {

        const res =
            await fetch("/api/work-master");

        const data =
            await res.json();

        if (!res.ok) {

            throw new Error(
                data.message ||
                "Unable to load work master."
            );

        }

        workList =
            Array.isArray(data)
                ? data
                : [];

    }

    catch (err) {

        console.error(
            "Work Master Load Error:",
            err
        );

        workList = [];

    }

}


// ==========================================
// LOAD SUPERVISORS
// ==========================================

async function loadSupervisors() {

    try {

        const user =
            JSON.parse(
                localStorage.getItem("user")
            );

        const res =
            await fetch("/api/supervisors");

        const data =
            await res.json();

        if (!res.ok) {

            throw new Error(
                data.message ||
                "Unable to load supervisors."
            );

        }

        let list =
            Array.isArray(data)
                ? data
                : [];

        /*
        If API returns department information,
        show only logged-in Incharge's department supervisors.
        If department field is not returned, full list will remain.
        */

        if (
            user &&
            list.some(item => item.department)
        ) {

            list =
                list.filter(item =>
                    String(item.department)
                        .trim()
                        .toLowerCase() ===
                    String(user.department)
                        .trim()
                        .toLowerCase()
                );

        }

        supervisorList = list;

    }

    catch (err) {

        console.error(
            "Supervisor Load Error:",
            err
        );

        supervisorList = [];

    }

}


// ==========================================
// LOCO TYPE CHANGE
// ==========================================

locoType.addEventListener(
    "change",
    async function () {

        workTableBody.innerHTML = "";

        if (!this.value) {

            return;

        }

        try {

            const res =
                await fetch("/api/locos");

            const data =
                await res.json();

            if (!res.ok) {

                throw new Error(
                    data.message ||
                    "Unable to load locos."
                );

            }

            locoList =
                data.filter(item => {

                    const type =
                        item
                            .loco_type_master
                            ?.loco_type;

                    return (
                        String(type).trim() ===
                        String(locoType.value).trim()
                    );

                });

            if (locoList.length === 0) {

                alert(
                    "No loco found for selected type."
                );

                return;

            }

            addLocoRow();

        }

        catch (err) {

            console.error(
                "Loco Load Error:",
                err
            );

            alert(err.message);

        }

    }
);


// ==========================================
// ADD LOCO BUTTON
// ==========================================

addLocoBtn.addEventListener(
    "click",
    function () {

        if (!locoType.value) {

            alert(
                "Select Type of Loco."
            );

            return;

        }

        addLocoRow();

    }
);


// ==========================================
// LOCO OPTIONS
// ==========================================

function getLocoOptions() {

    return locoList
        .map(item => `

            <option value="${item.id}">

                ${item.loco_no}

            </option>

        `)
        .join("");

}


// ==========================================
// SCHEDULE OPTIONS
// ==========================================

function getScheduleOptions() {

    return scheduleList
        .map(item => `

            <option value="${item.id}">

                ${item.schedule_name}

            </option>

        `)
        .join("");

}


// ==========================================
// SUPERVISOR OPTIONS
// ==========================================

function getSupervisorOptions() {

    return supervisorList
        .map(item => {

            const supervisorName =
                item.name ||
                item.supervisor_name ||
                item.employee_name ||
                "Supervisor";

            return `

                <option value="${item.id}">

                    ${supervisorName}

                </option>

            `;

        })
        .join("");

}


// ==========================================
// WORK OPTIONS
// Schedule-wise filtering
// ==========================================

function getWorkOptions(scheduleId = "") {

    let filteredWorks = [];

    if (scheduleId) {

        filteredWorks =
            workList.filter(item =>
                Number(item.schedule_id) ===
                Number(scheduleId)
            );

    }

    return `

        <option value="">
            Select Work
        </option>

        ${filteredWorks.map(item => `

            <option value="${item.id}">

                ${item.work_name}

            </option>

        `).join("")}

    `;

}


// ==========================================
// ADD LOCO ROW
// One loco = One supervisor = Multiple works
// ==========================================

function addLocoRow() {

    const row =
        document.createElement("tr");

    row.innerHTML = `

        <td class="serial"></td>


        <td>

            <select class="locoDropdown">

                <option value="">
                    Select Loco
                </option>

                ${getLocoOptions()}

            </select>

        </td>


        <td>

            <select class="scheduleDropdown">

                <option value="">
                    Select Schedule
                </option>

                ${getScheduleOptions()}

            </select>

        </td>


        <td>

            <select class="supervisorDropdown">

                <option value="">
                    Select Supervisor
                </option>

                ${getSupervisorOptions()}

            </select>

        </td>


        <td>

            <div class="work-list">

                <div class="work-row">

                    <select class="workDropdown">

                        ${getWorkOptions()}

                    </select>

                    <button
                        type="button"
                        class="add-work-btn">

                        +

                    </button>

                </div>

            </div>

        </td>


        <td>

            <input
                type="text"
                class="remarks"
                placeholder="Remarks">

        </td>


        <td>

            <button
                type="button"
                class="delete-loco-btn">

                Delete

            </button>

        </td>

    `;

    workTableBody.appendChild(row);

    updateSerial();

}


// ==========================================
// SCHEDULE CHANGE
// Load only selected schedule's works
// ==========================================

workTableBody.addEventListener(
    "change",
    function (e) {

        if (
            !e.target.classList.contains(
                "scheduleDropdown"
            )
        ) {

            return;

        }

        const row =
            e.target.closest("tr");

        const scheduleId =
            e.target.value;

        const workDropdowns =
            row.querySelectorAll(
                ".workDropdown"
            );

        workDropdowns.forEach(dropdown => {

            dropdown.innerHTML =
                getWorkOptions(scheduleId);

        });

    }
);


// ==========================================
// ADD / REMOVE MULTIPLE WORKS
// ==========================================

document.addEventListener(
    "click",
    function (e) {

        // Add another work

        if (
            e.target.classList.contains(
                "add-work-btn"
            )
        ) {

            const tableRow =
                e.target.closest("tr");

            const scheduleId =
                tableRow.querySelector(
                    ".scheduleDropdown"
                ).value;

            if (!scheduleId) {

                alert(
                    "First select Schedule."
                );

                return;

            }

            const workListBox =
                e.target.closest(
                    ".work-list"
                );

            const workRow =
                document.createElement("div");

            workRow.className =
                "work-row";

            workRow.innerHTML = `

                <select class="workDropdown">

                    ${getWorkOptions(scheduleId)}

                </select>

                <button
                    type="button"
                    class="remove-work-btn">

                    ×

                </button>

            `;

            workListBox.appendChild(
                workRow
            );

        }


        // Remove selected work row

        if (
            e.target.classList.contains(
                "remove-work-btn"
            )
        ) {

            e.target
                .closest(".work-row")
                .remove();

        }


        // Delete complete loco row

        if (
            e.target.classList.contains(
                "delete-loco-btn"
            )
        ) {

            e.target
                .closest("tr")
                .remove();

            updateSerial();

        }

    }
);


// ==========================================
// SERIAL NUMBER
// ==========================================

function updateSerial() {

    const rows =
        workTableBody
            .querySelectorAll("tr");

    rows.forEach(
        (row, index) => {

            const serialCell =
                row.querySelector(
                    ".serial"
                );

            if (serialCell) {

                serialCell.textContent =
                    index + 1;

            }

        }
    );

}


// ==========================================
// RESET
// ==========================================

document
    .querySelector(".btn-reset")
    .addEventListener(
        "click",
        function () {

            location.reload();

        }
    );


// ==========================================
// ASSIGN WORK
// ==========================================

document
    .querySelector(".btn-save")
    .addEventListener(
        "click",
        async function () {

            const saveButton = this;

            const user =
                JSON.parse(
                    localStorage.getItem(
                        "user"
                    )
                );

            if (!user) {

                alert("Login Required.");

                return;

            }

            if (!assignDate.value) {

                alert(
                    "Assignment Date is required."
                );

                return;

            }

            const rows =
                workTableBody
                    .querySelectorAll("tr");

            if (rows.length === 0) {

                alert("Add Loco.");

                return;

            }

            saveButton.disabled = true;

            saveButton.textContent =
                "Saving...";

            try {

                for (const row of rows) {

                    const locoId =
                        row.querySelector(
                            ".locoDropdown"
                        ).value;

                    const scheduleId =
                        row.querySelector(
                            ".scheduleDropdown"
                        ).value;

                    const supervisorId =
                        row.querySelector(
                            ".supervisorDropdown"
                        ).value;

                    const remarks =
                        row.querySelector(
                            ".remarks"
                        ).value
                            .trim();

                    const workDropdowns =
                        row.querySelectorAll(
                            ".workDropdown"
                        );

                    const works = [];

                    workDropdowns.forEach(
                        item => {

                            if (item.value) {

                                works.push({

                                    work_master_id:
                                        Number(
                                            item.value
                                        ),

                                    remarks:
                                        remarks ||
                                        null

                                });

                            }

                        }
                    );

                    // Remove duplicate selected works

                    const uniqueWorks =
                        works.filter(
                            (work, index, array) =>
                                index ===
                                array.findIndex(
                                    item =>
                                        item
                                            .work_master_id ===
                                        work
                                            .work_master_id
                                )
                        );

                    if (
                        !locoId ||
                        !scheduleId ||
                        !supervisorId ||
                        uniqueWorks.length === 0
                    ) {

                        throw new Error(
                            "Loco, Schedule, Supervisor and Work are required."
                        );

                    }

                    const assignment = {

                        assign_date:
                            assignDate.value,

                        loco_id:
                            Number(locoId),

                        schedule_id:
                            Number(scheduleId),

                        supervisor_id:
                            Number(
                                supervisorId
                            ),

                        created_by:
                            Number(user.id),

                        works:
                            uniqueWorks

                    };

                    const res =
                        await fetch(
                            "/api/assign-work",
                            {

                                method: "POST",

                                headers: {

                                    "Content-Type":
                                        "application/json"

                                },

                                body:
                                    JSON.stringify(
                                        assignment
                                    )

                            }
                        );

                    const result =
                        await res.json();

                    if (
                        !res.ok ||
                        !result.success
                    ) {

                        throw new Error(
                            result.message ||
                            "Unable to assign work."
                        );

                    }

                }

                alert(
                    "Work Assigned Successfully."
                );

                location.reload();

            }

            catch (err) {

                console.error(
                    "Assign Work Error:",
                    err
                );

                alert(err.message);

                saveButton.disabled = false;

                saveButton.textContent =
                    "Assign Work";

            }

        }
    );