// ======================================================
// CURRENT LOGGED-IN SUPERVISOR
// ======================================================

const user =
    JSON.parse(
        localStorage.getItem("user")
    );

if (!user) {

    window.location.href =
        "/dashboard/login.html";

}

console.log("Logged-in user:", user);
console.log(
    "Supervisor ID:",
    user.supervisor_master_id
);

let availableStaff = [];
let permanentSectionStaff = [];
let unavailableStaffIds = new Set();
let temporaryLoanData = {
    loaned_in: [],
    loaned_out: [],
    staff_for_loan: [],
    destination_sections: []
};
// ======================================================
// PAGE LOAD
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setCurrentDate();

        try {

            await loadSectionStaff();
            await loadTemporaryStaffLoansSafely();
            await loadUnavailableStaff();

        }

        catch (error) {

            console.error(
                "Load Staff Error:",
                error
            );

            alert(error.message);

        }

        await loadAssignedWork();

        const dateInput =
            document.getElementById(
                "distributionDate"
            );

        if (dateInput) {
            dateInput.addEventListener(
                "change",
                handleDistributionDateChange
            );
        }

        const saveButton =
            document.getElementById(
                "saveDistributionBtn"
            );

        if (saveButton) {
            saveButton.addEventListener(
                "click",
                saveDistribution
            );
        }

        setupTemporaryStaffLoanUi();

    }
);


// ======================================================
// LOAD STAFF FOR LOGGED-IN SUPERVISOR'S SECTION
// ======================================================

async function loadSectionStaff() {

    const department =
        String(user.department || "").trim();

    const section =
        String(user.section || "").trim();

    if (!department || !section) {
        throw new Error(
            "Logged-in supervisor department/section is missing."
        );
    }

    const params =
        new URLSearchParams({
            department,
            section
        });

    const response =
        await fetch(
            `/api/employees?${params.toString()}`
        );

    if (!response.ok) {

        const errorData =
            await response.json().catch(
                () => ({})
            );

        throw new Error(
            errorData.message ||
            "Unable to load section staff."
        );

    }

    const data = await response.json();

    permanentSectionStaff =
        Array.isArray(data)
            ? data
            : [];
    availableStaff = [...permanentSectionStaff];

}

async function handleDistributionDateChange() {

    try {
        await loadTemporaryStaffLoansSafely();
        await loadUnavailableStaff();
        await loadAssignedWork();
    }

    catch (error) {
        console.error(
            "Distribution Date Change Error:",
            error
        );
        alert(error.message);
    }

}

async function loadTemporaryStaffLoansSafely() {
    try {
        await loadTemporaryStaffLoans();
        const addButton = document.getElementById("addStaffLoanBtn");
        if (addButton) {
            addButton.disabled = false;
            addButton.title = "";
        }
    } catch (error) {
        console.warn("Temporary Staff Loan is not ready:", error);
        temporaryLoanData = {
            loaned_in: [],
            loaned_out: [],
            staff_for_loan: [],
            destination_sections: []
        };
        availableStaff = [...permanentSectionStaff];
        renderTemporaryStaffLoans();
        const addButton = document.getElementById("addStaffLoanBtn");
        if (addButton) {
            addButton.disabled = true;
            addButton.title =
                "Temporary Staff Loan database setup is pending.";
        }
    }
}

async function loadTemporaryStaffLoans() {
    const params = new URLSearchParams({
        loan_date: getSelectedDate(),
        supervisor_id: user.supervisor_master_id || user.id
    });
    const response = await fetch(
        `/api/manpower-distribution/temporary-loans?${params.toString()}`
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load temporary staff loans.");
    }

    temporaryLoanData = result;
    const loanedOutIds = new Set(
        (result.loaned_out || []).map(item => Number(item.staff_id))
    );
    const incomingStaff = (result.loaned_in || []).map(item => ({
        id: Number(item.staff_id),
        name: item.staff_name,
        designation: "Temporary",
        department: user.department,
        section: item.from_section
    }));
    availableStaff = [
        ...permanentSectionStaff.filter(item =>
            !loanedOutIds.has(Number(item.id))
        ),
        ...incomingStaff
    ];
    renderTemporaryStaffLoans();
}

function renderTemporaryStaffLoans() {
    const incoming = temporaryLoanData.loaned_in || [];
    const outgoing = temporaryLoanData.loaned_out || [];
    document.getElementById("loanedInCount").textContent = incoming.length;
    document.getElementById("loanedOutCount").textContent = outgoing.length;
    renderLoanList("loanedInList", incoming, "from_section", "From");
    renderLoanList("loanedOutList", outgoing, "to_section", "To");
}

function renderLoanList(elementId, rows, sectionKey, prefix) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.innerHTML = rows.length
        ? rows.map(item => `
            <div class="staff-loan-person">
                <strong>${escapeHtml(item.staff_name)}</strong>
                <span>${prefix}: ${escapeHtml(item[sectionKey])}</span>
            </div>
        `).join("")
        : '<p class="staff-loan-empty">No staff for the selected date.</p>';
}

function setupTemporaryStaffLoanUi() {
    document.querySelectorAll("[data-loan-tab]").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll("[data-loan-tab]").forEach(item => {
                const active = item === tab;
                item.classList.toggle("active", active);
                item.setAttribute("aria-selected", String(active));
            });
            document.getElementById("loanedInPanel").hidden =
                tab.dataset.loanTab !== "in";
            document.getElementById("loanedOutPanel").hidden =
                tab.dataset.loanTab !== "out";
        });
    });
    document.getElementById("addStaffLoanBtn")
        ?.addEventListener("click", openStaffLoanModal);
    document.getElementById("closeStaffLoanBtn")
        ?.addEventListener("click", closeStaffLoanModal);
    document.getElementById("cancelStaffLoanBtn")
        ?.addEventListener("click", closeStaffLoanModal);
    document.getElementById("staffLoanModal")
        ?.addEventListener("click", event => {
            if (event.target.id === "staffLoanModal") closeStaffLoanModal();
        });
    document.getElementById("staffLoanForm")
        ?.addEventListener("submit", saveTemporaryStaffLoan);
}

function openStaffLoanModal() {
    const staffSelect = document.getElementById("loanStaffSelect");
    const sectionSelect = document.getElementById("loanToSectionSelect");
    staffSelect.innerHTML = '<option value="">Select Staff</option>' +
        (temporaryLoanData.staff_for_loan || []).map(item =>
            `<option value="${item.id}">${escapeHtml(item.name)}</option>`
        ).join("");
    sectionSelect.innerHTML = '<option value="">Select Section</option>' +
        (temporaryLoanData.destination_sections || []).map(section =>
            `<option value="${escapeHtml(section)}">${escapeHtml(section)}</option>`
        ).join("");
    document.getElementById("staffLoanDate").textContent = getSelectedDate();
    const message = document.getElementById("staffLoanMessage");
    message.hidden = true;
    message.textContent = "";
    document.getElementById("staffLoanModal").hidden = false;
}

function closeStaffLoanModal() {
    document.getElementById("staffLoanModal").hidden = true;
    document.getElementById("staffLoanForm")?.reset();
}

async function saveTemporaryStaffLoan(event) {
    event.preventDefault();
    const submitButton = event.submitter;
    const message = document.getElementById("staffLoanMessage");
    submitButton.disabled = true;
    message.hidden = true;
    try {
        const response = await fetch("/api/manpower-distribution/temporary-loans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                loan_date: getSelectedDate(),
                supervisor_id: user.supervisor_master_id || user.id,
                staff_id: Number(document.getElementById("loanStaffSelect").value),
                to_section: document.getElementById("loanToSectionSelect").value
            })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) {
            throw new Error(result.message || "Unable to save temporary staff loan.");
        }
        closeStaffLoanModal();
        await loadTemporaryStaffLoans();
        refreshStaffAvailability();
    } catch (error) {
        message.textContent = error.message;
        message.hidden = false;
    } finally {
        submitButton.disabled = false;
    }
}

function getSelectedDate() {

    return document.getElementById(
        "distributionDate"
    )?.value || "";

}

async function loadUnavailableStaff() {

    const assignDate = getSelectedDate();

    if (!assignDate) {
        unavailableStaffIds = new Set();
        refreshStaffAvailability();
        return;
    }

    const params =
        new URLSearchParams({
            assign_date: assignDate,
            supervisor_id:
                user.supervisor_master_id || user.id
        });

    const response =
        await fetch(
            `/api/manpower-distribution/unavailable-staff?${params.toString()}`
        );

    const result =
        await response.json().catch(
            () => ({})
        );

    if (!response.ok || !result.success) {
        throw new Error(
            result.message ||
            "Unable to load staff availability."
        );
    }

    unavailableStaffIds =
        new Set(
            (result.staff_ids || [])
                .map(Number)
                .filter(Boolean)
        );

    refreshStaffAvailability();

}


// ======================================================
// SET CURRENT DATE
// ======================================================

function setCurrentDate() {

    const dateInput =
        document.getElementById(
            "distributionDate"
        );

    if (!dateInput) return;

    const now = new Date();

    const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
    ].join("-");

    dateInput.value = today;

}


// ======================================================
// LOAD ASSIGNED WORK OF LOGGED-IN SUPERVISOR
// ======================================================

async function loadAssignedWork() {

    const tbody =
        document.getElementById(
            "distributionTableBody"
        );

    if (!tbody) {

        console.error(
            "distributionTableBody not found."
        );

        return;

    }

    tbody.innerHTML = `

        <tr>

            <td colspan="8">
                Loading assigned work...
            </td>

        </tr>

    `;

    try {

        const params =
            new URLSearchParams({
                assign_date: getSelectedDate()
            });

        const response =
            await fetch(
                `/api/supervisors/assigned-work/${user.supervisor_master_id}?${params.toString()}`
            );

        if (!response.ok) {

            throw new Error(
                `Unable to load assigned work. Status: ${response.status}`
            );

        }

        const data =
            await response.json();

        tbody.innerHTML = "";

        if (
            !Array.isArray(data) ||
            data.length === 0
        ) {

            tbody.innerHTML = `
                <tr class="empty-assigned-work-row" aria-label="No assigned work found">
                    <td><span class="empty-column-label">S.No.</span><span class="empty-column-box"></span></td>
                    <td><span class="empty-column-label">Loco No.</span><span class="empty-column-box"></span></td>
                    <td><span class="empty-column-label">Schedule</span><span class="empty-column-box"></span></td>
                    <td><span class="empty-column-label">Assigned Work</span><span class="empty-column-box"></span></td>
                    <td><span class="empty-column-label">Man Power Distribution</span><span class="empty-column-box"></span></td>
                    <td><span class="empty-column-label">Remarks</span><span class="empty-column-box"></span></td>
                    <td><span class="empty-column-label">Assigned By</span><span class="empty-column-box"></span></td>
                    <td><span class="empty-column-label">Status</span><span class="empty-column-box"></span></td>
                </tr>
            `;

            return;

        }

        data.forEach(
            (item, index) => {

                const header =
                    item.assign_work_header || {};

                const work =
                    item.work_master || {};

                const row =
                    document.createElement("tr");

                row.dataset.detailId =
                    item.id;

                row.dataset.headerId =
                    header.id || "";

                row.innerHTML = `

                    <td>
                        ${index + 1}
                    </td>

                    <td>
                        ${header.loco_master?.loco_no ||
                        header.temporary_loco_master?.loco_no || "-"}
                    </td>

                    <td>
                        ${header.schedule_id || "-"}
                    </td>

                    <td>
                        ${work.work_name || "-"}
                    </td>

                    <td>
                        <div
                            class="manpower-picker"
                            data-detail-id="${item.id}">

                            <div class="staff-select-list">
                            </div>

                            <button
                                type="button"
                                class="btn-add-manpower">

                                + Add Staff

                            </button>

                        </div>
                    </td>

                    <td>

                        <input
                            type="text"
                            class="distribution-remarks"
                            placeholder="Enter remarks">

                    </td>

                    <td>
                        Incharge
                    </td>

                    <td>
                        ${item.status || "Pending"}
                    </td>

                `;

                tbody.appendChild(row);

            }
        );

        addManpowerButtonEvents();

        document
            .querySelectorAll(
                ".manpower-picker"
            )
            .forEach(addStaffSelect);

        refreshStaffAvailability();

    }

    catch (error) {

        console.error(
            "Load Assigned Work Error:",
            error
        );

        tbody.innerHTML = `

            <tr>

                <td colspan="8">
                    Unable to load assigned work
                </td>

            </tr>

        `;

    }

}


// ======================================================
// ADD STAFF BUTTON EVENTS
// ======================================================

function addManpowerButtonEvents() {

    const buttons =
        document.querySelectorAll(
            ".btn-add-manpower"
        );

    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const picker =
                    button.closest(
                        ".manpower-picker"
                    );

                addStaffSelect(picker);

            }
        );

    });

}


// ======================================================
// STAFF DROPDOWN ROWS
// ======================================================

function addStaffSelect(picker) {

    if (!picker) return;

    const list =
        picker.querySelector(
            ".staff-select-list"
        );

    if (!list) return;

    if (availableStaff.length === 0) {

        list.innerHTML = `
            <span class="no-staff-message">
                No staff found for
                ${escapeHtml(user.department)} /
                ${escapeHtml(user.section)}
            </span>
        `;

        const addButton =
            picker.querySelector(
                ".btn-add-manpower"
            );

        if (addButton) {
            addButton.disabled = true;
        }

        return;

    }

    const currentRows =
        list.querySelectorAll(
            ".staff-select-row"
        );

    if (currentRows.length >= 50) {
        alert(
            "Maximum 50 staff can be assigned to one work."
        );
        return;
    }

    const row =
        document.createElement("div");

    row.className = "staff-select-row";

    const options =
        availableStaff
            .map(staff => `
                <option value="${staff.id}">
                    ${escapeHtml(staff.name)}
                    ${staff.designation
                        ? ` (${escapeHtml(staff.designation)})`
                        : ""}
                </option>
            `)
            .join("");

    row.innerHTML = `
        <label class="lead-staff-choice" title="Only Lead Staff can fill the schedule form">
            <input type="radio" name="lead-${picker.dataset.detailId}" class="lead-staff-radio">
            Lead
        </label>
        <select class="staff-select">
            <option value="">
                Select ${escapeHtml(user.section)} Staff
            </option>
            ${options}
        </select>

        <button
            type="button"
            class="btn-remove-staff"
            title="Remove staff">
            Remove
        </button>
    `;

    row.querySelector(
        ".btn-remove-staff"
    ).addEventListener(
        "click",
        () => {
            row.remove();
            refreshStaffAvailability();
        }
    );

    row.querySelector(
        ".staff-select"
    ).addEventListener(
        "change",
        refreshStaffAvailability
    );

    list.appendChild(row);
    if (currentRows.length === 0) {
        row.querySelector(".lead-staff-radio").checked = true;
    }
    refreshStaffAvailability();

}

function refreshStaffAvailability() {

    const selects =
        Array.from(
            document.querySelectorAll(
                ".staff-select"
            )
        );

    const selectedCounts = new Map();

    selects.forEach(select => {
        const staffId = Number(select.value);

        if (staffId) {
            selectedCounts.set(
                staffId,
                (selectedCounts.get(staffId) || 0) + 1
            );
        }
    });

    selects.forEach(select => {

        const ownStaffId = Number(select.value);

        Array.from(select.options).forEach(option => {

            const staffId = Number(option.value);

            if (!staffId) return;

            const unavailable =
                unavailableStaffIds.has(staffId);

            option.disabled =
                unavailable &&
                ownStaffId !== staffId;

            option.hidden =
                unavailable &&
                ownStaffId !== staffId;

        });

    });

}


// ======================================================
// SAVE DISTRIBUTION
// ======================================================

async function saveDistribution() {

    const saveButton =
        document.getElementById(
            "saveDistributionBtn"
        );

    const assignments = [];
    const allSelectedStaffIds = [];

    const pickers =
        document.querySelectorAll(
            ".manpower-picker"
        );

    for (const picker of pickers) {

        const detailId =
            Number(picker.dataset.detailId);

        const row =
            picker.closest("tr");

        const remarks =
            row
                ?.querySelector(
                    ".distribution-remarks"
                )
                ?.value
                .trim() || "";

        const staffRows = Array.from(picker.querySelectorAll(".staff-select-row"))
            .map(staffRow => ({
                staffId: Number(staffRow.querySelector(".staff-select")?.value),
                isLead: Boolean(staffRow.querySelector(".lead-staff-radio")?.checked)
            }))
            .filter(item => item.staffId);
        const selectedIds = staffRows.map(item => item.staffId);

        if (
            new Set(selectedIds).size !==
            selectedIds.length
        ) {
            alert(
                "Same staff cannot be selected twice for one work."
            );
            return;
        }

        allSelectedStaffIds.push(
            ...selectedIds
        );

        if (selectedIds.length && staffRows.filter(item => item.isLead).length !== 1) {
            alert("Please select exactly one Lead Staff for each assigned work.");
            return;
        }

        staffRows.sort((left, right) => Number(right.isLead) - Number(left.isLead));
        staffRows.forEach(({ staffId, isLead }) => {
            assignments.push({
                assign_work_detail_id:
                    detailId,
                staff_id: staffId,
                    assigned_by:
                        user.supervisor_master_id ||
                        user.id,

                    author_name:
                        user.name || "Supervisor",
                is_lead: isLead,
                remarks
            });
        });

    }

    if (assignments.length === 0) {
        alert(
            "Please select at least one staff member."
        );
        return;
    }

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
    }

    try {

        for (const assignment of assignments) {

            const response =
                await fetch(
                    "/api/manpower-distribution",
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
                await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    "Unable to save manpower distribution."
                );
            }

        }

        alert(
            "Manpower distribution saved successfully."
        );

        await loadUnavailableStaff();
        await loadAssignedWork();

    }

    catch (error) {

        console.error(
            "Save Distribution Error:",
            error
        );

        alert(error.message);

    }

    finally {

        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent =
                "Save Distribution";
        }

    }

}


function escapeHtml(value) {

    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}
