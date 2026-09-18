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

function showEmptyWorkRow() {
    workTableBody.innerHTML = `
        <tr class="empty-work-row" aria-label="No loco selected">
            <td data-mobile-label="S.No."><span class="empty-work-box"></span></td>
            <td data-mobile-label="Loco No."><span class="empty-work-box"></span></td>
            <td data-mobile-label="Schedule"><span class="empty-work-box"></span></td>
            <td data-mobile-label="Assign Work"><span class="empty-work-box"></span></td>
            <td data-mobile-label="Supervisor"><span class="empty-work-box"></span></td>
            <td data-mobile-label="Remarks"><span class="empty-work-box"></span></td>
            <td data-mobile-label="Action"><span class="empty-work-box"></span></td>
        </tr>
    `;
}


// ==========================================
// MASTER LISTS
// ==========================================

let locoList = [];

let scheduleList = [];

let workList = [];

let supervisorList = [];

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


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

        const normalizedDepartment = String(user.department || "")
            .trim().toLowerCase();
        const normalizedSection = String(user.section || "")
            .trim().toLowerCase();
        const departmentId = normalizedDepartment === "electrical"
            ? 1
            : normalizedDepartment === "mechanical"
                ? 2
                : null;

        scheduleList = allSchedules.filter(item => {
            const sectionName = String(
                item.section_master?.section_name || ""
            ).trim().toLowerCase();
            return Number(item.department_id) === departmentId &&
                (!item.section_id || sectionName === normalizedSection);
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
            showEmptyWorkRow();
            return;

        }

        try {

            const [masterRes, trackingRes] = await Promise.all([
                fetch("/api/locos"),
                fetch("/api/tracking/locos")
            ]);
            const [masterData, trackingData] = await Promise.all([
                masterRes.json(),
                trackingRes.json()
            ]);

            if (!masterRes.ok || !trackingRes.ok) {

                throw new Error(
                    masterData.message || trackingData.message ||
                    "Unable to load locos currently in the shed."
                );

            }

            const masterByNumber = new Map(
                masterData.map(item => [
                    String(item.loco_no).trim().toUpperCase(),
                    item
                ])
            );

            locoList = trackingData.locos
                .map(item => {
                    const master = masterByNumber.get(
                        String(item.loco_no).trim().toUpperCase()
                    );
                    const trackingType = String(item.loco_type || "").trim();
                    return {
                        ...item,
                        loco_type: trackingType && trackingType !== "-"
                            ? trackingType
                            : master?.loco_type_master?.loco_type || "-",
                        source: master ? "master" : "temporary",
                        id: master?.id || null
                    };
                })
                .filter(item => {
                    if (locoType.value === "External") {
                        return item.source === "temporary";
                    }
                    return (
                        item.source === "master" &&
                        String(item.loco_type).trim().toLowerCase() ===
                        String(locoType.value).trim().toLowerCase()
                    );
                });

            if (locoList.length === 0) {

                alert(
                    "No loco of selected type is currently available in shed."
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

            <option value="${item.source}:${item.id || encodeURIComponent(item.loco_no)}">

                ${escapeHtml(item.loco_no)} — ${escapeHtml(item.position || "Position not set")}${item.source === "temporary" ? " (Other Shed)" : ""}

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

function isRepairsWork(workMasterId) {
    return String(workList.find(item => Number(item.id) === Number(workMasterId))?.work_name || "")
        .trim().toLowerCase() === "repairs";
}

async function loadRepairRemarkOptions(workRow) {
    const container = workRow.querySelector(".repair-remark-selector");
    const workSelect = workRow.querySelector(".workDropdown");
    if (!container || !workSelect?.checked || !isRepairsWork(workSelect.value)) {
        if (container) container.innerHTML = "";
        return;
    }

    const assignmentRow = workRow.closest("tr.assignment-row");
    const locoValue = assignmentRow.querySelector(".locoDropdown").value;
    const selectedLoco = locoList.find(item =>
        `${item.source}:${item.id || encodeURIComponent(item.loco_no)}` === locoValue
    );
    if (!selectedLoco) {
        container.innerHTML = '<small class="repair-remark-help">First select Loco.</small>';
        return;
    }

    container.innerHTML = '<small class="repair-remark-help">Loading pending repair remarks…</small>';
    try {
        const currentUser = JSON.parse(localStorage.getItem("user") || "null");
        const departmentId = String(currentUser?.department || "").trim().toLowerCase() === "electrical"
            ? 1
            : String(currentUser?.department || "").trim().toLowerCase() === "mechanical"
                ? 2
                : null;
        if (!departmentId) throw new Error("Logged-in department is required.");
        const params = new URLSearchParams(selectedLoco.source === "master"
            ? { loco_id: selectedLoco.id, department_id: departmentId }
            : { loco_no: selectedLoco.loco_no, department_id: departmentId });
        const response = await fetch(`/api/assign-work/repair-remarks?${params}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Unable to load repair remarks.");
        const remarks = Array.isArray(payload.remarks) ? payload.remarks : [];
        container.innerHTML = remarks.length ? `
            <label>Select Repair Remarks (multiple allowed)</label>
            <select class="repairRemarkDropdown" multiple size="${Math.min(Math.max(remarks.length, 3), 6)}" required>
                ${remarks.map(item => {
                    const date = item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : "-";
                    return `<option value="${Number(item.id)}">${escapeHtml(item.remark_text)} — ${escapeHtml(item.author_name)} (${escapeHtml(item.author_role)}), ${escapeHtml(date)}</option>`;
                }).join("")}
            </select>
            <small class="repair-remark-help">Tap remarks to select one or more repair items.</small>` :
            '<small class="repair-remark-help">No pending repair remarks for this loco.</small>';
    } catch (error) {
        container.innerHTML = `<small class="repair-remark-help repair-remark-error">${escapeHtml(error.message)}</small>`;
    }
}


// ==========================================
// ADD LOCO ROW
// One loco = One supervisor = Multiple works
// ==========================================

function locoRemarksMarkup() {
    return `<div class="loco-remarks">
        <div class="remark-input-list">
            <div class="remark-input-row">
                <input type="text" class="remarks" aria-label="Loco remark" placeholder="Enter loco remark">
                <button type="button" class="add-remark-btn" aria-label="Add another loco remark">+</button>
            </div>
        </div>
    </div>`;
}

function renderWorkPicker(row) {
    const scheduleId = row.querySelector(".scheduleDropdown").value;
    const works = workList.filter(item => Number(item.schedule_id) === Number(scheduleId));
    row.querySelector(".work-list").innerHTML = !scheduleId
        ? '<span class="work-selection-hint">Select Schedule first.</span>'
        : `<details class="work-picker">
            <summary>Select works <span class="work-selection-count">0 selected</span></summary>
            <div class="work-picker-actions">
                <label><input type="checkbox" class="select-all-works"> Select All</label>
            </div>
            <div class="work-picker-options">${works.map(item => `
                <div class="work-row">
                    <label class="work-option"><input type="checkbox" class="workDropdown" value="${Number(item.id)}">
                        <span>${escapeHtml(item.work_name)}</span></label>
                    <div class="repair-remark-selector"></div>
                </div>`).join("") || '<p>No works for this schedule.</p>'}
            </div>
        </details>
        <ul class="selected-work-list" aria-live="polite"></ul>`;
}

function updateWorkSelection(row) {
    const choices = [...row.querySelectorAll(".workDropdown")];
    const selected = choices.filter(input => input.checked);
    const count = row.querySelector(".work-selection-count");
    if (count) count.textContent = `${selected.length} selected`;
    const all = row.querySelector(".select-all-works");
    if (all) {
        all.checked = choices.length > 0 && selected.length === choices.length;
        all.indeterminate = selected.length > 0 && selected.length < choices.length;
    }
    const list = row.querySelector(".selected-work-list");
    if (list) list.innerHTML = selected.map(input =>
        `<li>${escapeHtml(workList.find(item => Number(item.id) === Number(input.value))?.work_name || "")}</li>`
    ).join("");
}

function addLocoRow() {
    workTableBody.querySelector(".empty-work-row")?.remove();
    const row = document.createElement("tr");
    row.className = "assignment-row";
    row.innerHTML = `
        <td class="serial" data-mobile-label="S.No."></td>
        <td data-mobile-label="Loco No."><select class="locoDropdown" aria-label="Loco">
            <option value="">Select Loco</option>${getLocoOptions()}</select></td>
        <td data-mobile-label="Schedule"><select class="scheduleDropdown" aria-label="Schedule">
            <option value="">Select Schedule</option>${getScheduleOptions()}</select></td>
        <td data-mobile-label="Assign Work"><div class="work-list"></div></td>
        <td data-mobile-label="Supervisor"><select class="supervisorDropdown" aria-label="Supervisor">
            <option value="">Select Supervisor</option>${getSupervisorOptions()}</select></td>
        <td data-mobile-label="Remarks">${locoRemarksMarkup()}</td>
        <td data-mobile-label="Action"><button type="button" class="delete-loco-btn">Delete</button></td>`;
    workTableBody.appendChild(row);
    renderWorkPicker(row);
    updateSerial();
}

workTableBody.addEventListener("change", async event => {
    const row = event.target.closest("tr.assignment-row");
    if (!row) return;
    if (event.target.classList.contains("scheduleDropdown")) {
        renderWorkPicker(row);
    } else if (event.target.classList.contains("select-all-works")) {
        const selected = event.target.checked;
        row.querySelectorAll(".workDropdown").forEach(input => { input.checked = selected; });
        updateWorkSelection(row);
        for (const workRow of row.querySelectorAll(".work-row")) await loadRepairRemarkOptions(workRow);
    } else if (event.target.classList.contains("workDropdown")) {
        updateWorkSelection(row);
        await loadRepairRemarkOptions(event.target.closest(".work-row"));
    } else if (event.target.classList.contains("locoDropdown")) {
        for (const workRow of row.querySelectorAll(".work-row")) await loadRepairRemarkOptions(workRow);
    }
});

workTableBody.addEventListener("click", event => {
    if (event.target.closest(".add-remark-btn")) {
        const list = event.target.closest(".loco-remarks").querySelector(".remark-input-list");
        list.insertAdjacentHTML("beforeend", `<div class="remark-input-row">
            <input type="text" class="remarks" aria-label="Loco remark" placeholder="Enter loco remark">
            <button type="button" class="remove-remark-btn" aria-label="Remove remark">×</button>
        </div>`);
        list.lastElementChild.querySelector("input").focus();
    }
    if (event.target.closest(".remove-remark-btn")) event.target.closest(".remark-input-row").remove();
    if (event.target.closest(".delete-loco-btn")) {
        event.target.closest("tr").remove();
        updateSerial();
    }
});

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
                    .querySelectorAll("tr.assignment-row");

            if (rows.length === 0) {

                alert("Add Loco.");

                return;

            }

            saveButton.disabled = true;

            saveButton.textContent =
                "Saving...";

            try {

                // Validate the full batch before saving the first loco.
                const assignmentKeys = new Set();
                for (const row of rows) {
                    const values = [".locoDropdown", ".scheduleDropdown", ".supervisorDropdown"]
                        .map(selector => row.querySelector(selector).value);
                    const selected = [...row.querySelectorAll(".workDropdown:checked")];
                    if (values.some(value => !value) || !selected.length) {
                        throw new Error("Loco, Schedule, Supervisor and Work are required.");
                    }
                    const key = JSON.stringify(values);
                    if (assignmentKeys.has(key)) {
                        throw new Error("Use one row for the same loco, schedule and supervisor. Select all its works together.");
                    }
                    assignmentKeys.add(key);
                    for (const work of selected) {
                        if (isRepairsWork(work.value) && !work.closest(".work-row")
                            .querySelector(".repairRemarkDropdown")?.selectedOptions.length) {
                            throw new Error("For Repairs, select pending repair remarks or uncheck Repairs.");
                        }
                    }
                }

                for (const row of rows) {

                    const locoValue = row.querySelector(
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

                    const workDropdowns =
                        row.querySelectorAll(
                            ".workDropdown:checked"
                        );

                    const works = [];

                    workDropdowns.forEach(
                        item => {

                            if (item.value) {

                                const repairRemarkIds = Array.from(
                                    item.closest(".work-row").querySelector(".repairRemarkDropdown")?.selectedOptions || []
                                ).map(option => Number(option.value)).filter(Number.isInteger);

                                works.push({

                                    work_master_id:
                                        Number(
                                            item.value
                                        ),


                                    repair_remark_ids:
                                        repairRemarkIds

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
                        !locoValue ||
                        !scheduleId ||
                        !supervisorId ||
                        uniqueWorks.length === 0
                    ) {

                        throw new Error(
                            "Loco, Schedule, Supervisor and Work are required."
                        );

                    }

                    const selectedLoco = locoList.find(item =>
                        `${item.source}:${item.id || encodeURIComponent(item.loco_no)}` === locoValue
                    );

                    if (!selectedLoco) {
                        throw new Error("Selected loco is no longer available in shed.");
                    }

                    const assignment = {

                        assign_date:
                            assignDate.value,

                        loco_id: selectedLoco.source === "master"
                            ? Number(selectedLoco.id)
                            : null,

                        temporary_loco: selectedLoco.source === "temporary"
                            ? {
                                loco_no: selectedLoco.loco_no,
                                loco_type: selectedLoco.loco_type,
                                position: selectedLoco.position,
                                status: selectedLoco.status,
                                updated_at: selectedLoco.updated_at
                            }
                            : null,

                        schedule_id:
                            Number(scheduleId),

                        supervisor_id:
                            Number(
                                supervisorId
                            ),

                        created_by:
                            Number(user.id),

                        author_name:
                            user.name || "Incharge",

                        loco_remarks: [...new Set(Array.from(row.querySelectorAll(".loco-remarks .remarks"))
                            .map(input => input.value.trim()).filter(Boolean))],

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
