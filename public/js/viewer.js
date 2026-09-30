// =====================================================
// SBI SHED LOCO MAINTENANCE MANAGEMENT SYSTEM
// VIEWER PAGE JS
// =====================================================


// =====================================================
// ELEMENTS
// =====================================================
// ======================================
// LOGIN CHECK
// ======================================

const user =
    JSON.parse(
        localStorage.getItem("user")
    );

if (!user) {

    window.location.href =
        "/dashboard/login.html";

}

// ======================================
// USER NAME
// ======================================

const userNameElement =
    document.getElementById("userName");

if (userNameElement) {

    userNameElement.textContent =
        user.name;

}

// ======================================
// LOGOUT
// ======================================

const logoutBtn =
    document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener("click", () => {

        localStorage.removeItem("user");

        window.location.href =
            "/dashboard/login.html";

    });

}

// ======================================
// DATE & TIME
// ======================================

function updateDateTime() {

    const now = new Date();

    const dateTimeElement =
        document.getElementById(
            "currentDateTime"
        );

    if (dateTimeElement) {

        dateTimeElement.textContent =
            now.toLocaleString("en-IN");

    }

}

updateDateTime();

setInterval(updateDateTime, 1000);


// ======================================
// PAGE SPECIFIC CODE
// ======================================

// Incharge dashboard code below
// Supervisor dashboard code below
// Viewer dashboard code below

const searchType =
    document.getElementById("searchType");

const searchItem =
    document.getElementById("searchItem");

const searchItemLabel =
    document.getElementById("searchItemLabel");

const searchBtn =
    document.getElementById("searchBtn");

const viewerTableBody =
    document.getElementById("viewerTableBody");

const resultTitle =
    document.getElementById("resultTitle");

const recordCount =
    document.getElementById("recordCount");

const scheduleFormModal =
    document.getElementById("scheduleFormModal");

const scheduleFormContent =
    document.getElementById("scheduleFormContent");

const closeModalBtn =
    document.getElementById("closeModalBtn");


// =====================================================
// MASTER DATA
// =====================================================

let locoList = [];

let scheduleList = [];




let viewerData = [];
let historicalData = [];
let displayedData = [];
const locoFilterBox = document.getElementById("locoFilterBox");
const locoFilter = document.getElementById("locoFilter");
const locoFilterOptions = document.getElementById("locoFilterOptions");
const downloadResultsBtn = document.getElementById("downloadResultsBtn");
const componentSchedule = document.getElementById('componentSchedule');
const componentDateFrom = document.getElementById('componentDateFrom');
const componentDateTo = document.getElementById('componentDateTo');
let parameterRows = [];
let parameterNames = [];
let parameterLoad = null;
let parameterReady = false;
let displayedColumns = null;
const defaultTableHead = document.getElementById('viewerTableHead').innerHTML;
const parameterColumns = [
    ['Loco No.', 'locoNo'], ['Schedule Date', 'date'], ['Schedule', 'schedule'],
    ['Component / Parameter', 'parameter'], ['Section', 'section'], ['GI Value', 'gi'],
    ['Final Value', 'final'], ['Other / Observed Value', 'value'], ['Standard Range', 'standard'],
    ['Status', 'status'], ['Action Taken', 'action'], ['Staff Name', 'staff']
];
[componentSchedule, componentDateFrom, componentDateTo].forEach(input => input.addEventListener('change', clearResult));

function parameterMessage(message, error = false) {
    const element = document.getElementById('parameterHistoryMessage');
    element.textContent = message;
    element.hidden = !message || searchType.value !== 'component';
    element.classList.toggle('error', error);
}

async function loadParameterHistory() {
    if (parameterReady) {
        const selected = componentSchedule.value;
        const names = [...new Set([...scheduleList.map(item => item.schedule_name || item.scheduleName),
            ...parameterRows.map(row => row.schedule)].filter(Boolean))].sort();
        componentSchedule.replaceChildren(new Option('Select Schedule', ''));
        names.forEach(name => componentSchedule.appendChild(new Option(name, name)));
        componentSchedule.value = selected;
        return;
    }
    if (parameterLoad) return parameterLoad;
    parameterMessage('Loading parameter history…');
    parameterLoad = (async () => {
        try {
            const response = await fetch('/api/viewer-parameters');
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load parameter history.');
            const templates = new Map(result.templates.map(template => [template.key, ViewerParameters.parseTemplate(template.html)]));
            parameterRows = result.records.flatMap(record => ViewerParameters.buildRows(record, templates.get(record.templateKey) || [], IcFormControls));
            parameterNames = [...new Set(parameterRows.map(item => item.parameter).filter(Boolean))]
                .sort((a, b) => a.localeCompare(b));
            result.records.forEach(record => {
                if (record.locoNo && !locoList.some(item => String(item.loco_no || item.locoNo) === String(record.locoNo))) {
                    locoList.push({ loco_no: record.locoNo });
                }
            });
            loadLocoFilterOptions();
            const schedules = [...new Set([
                ...scheduleList.map(item => item.schedule_name || item.scheduleName),
                ...result.records.map(record => record.schedule)
            ].filter(Boolean))].sort((a, b) => a.localeCompare(b));
            componentSchedule.replaceChildren(new Option('Select Schedule', ''));
            schedules.forEach(name => componentSchedule.appendChild(new Option(name, name)));
            parameterReady = true;
            parameterMessage(result.unavailable ? `${result.unavailable} approved form(s) have no readable historical template or assignment. Their parameter values cannot be shown.` : '');
            if (searchType.value === 'component') loadComponentDropdown();
        } catch (error) {
            parameterMessage(error.message + ' Click Search to retry.', true);
        } finally {
            parameterLoad = null;
        }
    })();
    return parameterLoad;
}

let locoOptionIndex = -1;

function loadLocoFilterOptions(query = '') {
    const locos = [...new Set(locoList.map(item => String(item.loco_no || item.locoNo || "")))]
        .filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    locoFilterOptions.replaceChildren();
    locoOptionIndex = -1;
    locoFilter.removeAttribute('aria-activedescendant');
    ["Select All Locos", ...locos.filter(value => value.includes(query.trim()))].forEach((value, index) => {
        const option = document.createElement("button");
        option.type = 'button';
        option.tabIndex = -1;
        option.id = `loco-option-${index}`;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', String(locoFilter.value === value));
        option.textContent = value;
        option.addEventListener('mousedown', event => event.preventDefault());
        option.addEventListener('click', () => selectLocoOption(value));
        locoFilterOptions.appendChild(option);
    });
}

function showLocoOptions(show, query = '') {
    locoFilterOptions.hidden = !show;
    locoFilter.setAttribute('aria-expanded', String(show));
    if (show) loadLocoFilterOptions(query);
    else locoFilter.removeAttribute('aria-activedescendant');
}

function selectLocoOption(value) {
    locoFilter.value = value;
    clearResult();
    locoFilter.focus();
    showLocoOptions(false);
}

locoFilter.addEventListener('focus', () => { locoFilter.select(); showLocoOptions(true); });
locoFilter.addEventListener('click', () => showLocoOptions(true));
locoFilter.addEventListener('input', () => { clearResult(); showLocoOptions(true, locoFilter.value); });
document.getElementById('locoDropdownBtn').addEventListener('click', () => {
    const open = locoFilterOptions.hidden;
    locoFilter.focus();
    showLocoOptions(open);
});
document.getElementById('locoPicker').addEventListener('focusout', event => {
    if (!event.currentTarget.contains(event.relatedTarget)) showLocoOptions(false);
});
locoFilter.addEventListener('keydown', event => {
    if (event.key === 'Escape') { showLocoOptions(false); return; }
    if (event.key === 'Enter' && !locoFilterOptions.hidden && locoOptionIndex >= 0) {
        event.preventDefault();
        selectLocoOption(locoFilterOptions.children[locoOptionIndex].textContent);
        return;
    }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    if (locoFilterOptions.hidden) showLocoOptions(true);
    const options = [...locoFilterOptions.children];
    locoOptionIndex = (locoOptionIndex + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
    options.forEach((option, index) => option.classList.toggle('active', index === locoOptionIndex));
    locoFilter.setAttribute('aria-activedescendant', options[locoOptionIndex].id);
    options[locoOptionIndex].scrollIntoView({ block: 'nearest' });
});
searchItem.addEventListener("change", clearResult);

function csvCell(value) {
    let text = String(value ?? "");
    // Prevent spreadsheet applications from interpreting data as formulas.
    if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
}

downloadResultsBtn.addEventListener("click", () => {
    if (!displayedData.length) return;
    const rows = displayedColumns ? [['Sr.', ...displayedColumns.map(column => column[0])]] : [["Sr.", "Loco No.", "Date", "Schedule", "Component / Work", "Schedule Form"]];
    displayedData.forEach((item, index) => rows.push(displayedColumns ? [index + 1, ...displayedColumns.map(([, key]) => key === 'date' ? formatDate(item[key]) : item[key] || '—')] : [
        index + 1, item.locoNo, formatDate(item.date), item.schedule,
        item.component, item.formName || ""
    ]));
    const csv = "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `maintenance-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
});


// =====================================================
// PAGE LOAD
// =====================================================

window.addEventListener(
    "DOMContentLoaded",
    async function () {

        loadEmployee();

        updateDateTime();

        setInterval(
            updateDateTime,
            1000
        );

        await loadLocos();

        loadLocoFilterOptions();

        await loadSchedules();

        await loadHistory();

        await loadHistoricalRecords();

        loadLocoFilterOptions();

        if (searchType.value === 'component') await loadParameterHistory();

    }
);

async function loadHistory() {

    try {

        const response =
            await fetch("/api/loco-history");

        const result = await response.json();

        if (!response.ok || !result.success) {

            throw new Error(
                result.message ||
                "Unable to load loco history"
            );

        }

        viewerData = (result.records || []).map(item => ({
            ...item,
            date:
                item.shedRelease ||
                item.scheduleCompletion ||
                item.shedArrival,
            component: item.locoType || "-",
            formName: `${item.schedule} Schedule History`
        }));

        const existingLocos = new Set(
            locoList.map(item => String(item.loco_no || item.locoNo))
        );

        viewerData.forEach(item => {

            if (!existingLocos.has(String(item.locoNo))) {

                locoList.push({
                    loco_no: item.locoNo,
                    loco_type_master: {
                        loco_type: item.locoType
                    }
                });

                existingLocos.add(String(item.locoNo));

            }

        });

        locoList.sort((left, right) =>
            String(left.loco_no || left.locoNo).localeCompare(
                String(right.loco_no || right.locoNo),
                undefined,
                { numeric: true }
            )
        );

    }

    catch (error) {

        console.error("Loco History Error", error);

        viewerData = [];

    }

}

async function loadHistoricalRecords() {
    try {
        const response = await fetch("/api/historical-schedules");
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message);

        historicalData = (result.records || []).map(item => ({
            id: Number(item.id),
            recordSource: "archive",
            locoNo: item.loco_no,
            date: item.schedule_date,
            schedule: item.schedule_type || "Unclassified",
            component: item.department,
            formName: item.original_filename,
            remarks: item.remarks
        }));

        const existingLocos = new Set(locoList.map(item => String(item.loco_no || item.locoNo)));
        historicalData.forEach(item => {
            if (!existingLocos.has(String(item.locoNo))) {
                locoList.push({ loco_no: item.locoNo });
                existingLocos.add(String(item.locoNo));
            }
        });
    } catch (error) {
        console.error("Historical Schedule Error", error);
        historicalData = [];
    }
}


// =====================================================
// LOAD EMPLOYEE
// =====================================================

function loadEmployee() {

    try {

        const employee =
            JSON.parse(
                localStorage.getItem("employee")
            );

        if (
            employee &&
            employee.name
        ) {

            document.getElementById("userName")
                .textContent = employee.name;

        }

    }

    catch (error) {

        console.log(
            "Employee Load Error",
            error
        );

    }

}


// =====================================================
// DATE TIME
// =====================================================

function updateDateTime() {

    const dateTime =
        document.getElementById(
            "currentDateTime"
        );

    if (!dateTime) return;

    dateTime.textContent =
        new Date().toLocaleString("en-IN");

}


// =====================================================
// LOAD ORIGINAL LOCO MASTER
// =====================================================

async function loadLocos() {

    try {

        const response =
            await fetch("/api/locos");

        if (!response.ok) {

            throw new Error(
                "Unable to load loco master"
            );

        }

        locoList =
            await response.json();

        console.log(
            "Loco Master Loaded",
            locoList
        );

    }

    catch (error) {

        console.error(
            "Loco Master Error",
            error
        );

        locoList = [];

    }

}


// =====================================================
// LOAD ORIGINAL SCHEDULE MASTER
// =====================================================

async function loadSchedules() {

    try {

        const response =
            await fetch("/api/schedules");

        if (!response.ok) {

            throw new Error(
                "Unable to load schedule master"
            );

        }

        scheduleList =
            await response.json();

        console.log(
            "Schedule Master Loaded",
            scheduleList
        );

    }

    catch (error) {

        console.error(
            "Schedule Master Error",
            error
        );

        scheduleList = [];

    }

}


// =====================================================
// SEARCH TYPE CHANGE
// =====================================================

searchType.addEventListener(
    "change",
    function () {

        const type =
            searchType.value;

        resetSearchItem();

        clearResult();

        locoFilterBox.hidden = type !== "schedule" && type !== "component";
        document.querySelector(".search-row").classList.toggle("has-loco-filter", !locoFilterBox.hidden);
        document.querySelector('.search-row').classList.toggle('has-component-filter', type === 'component');
        document.querySelectorAll('.component-filter').forEach(element => { element.hidden = type !== 'component'; });
        document.getElementById('parameterHistoryMessage').hidden = type !== 'component';
        locoFilter.value = "Select All Locos";
        showLocoOptions(false);
        loadLocoFilterOptions();


        if (type === "loco") {

            searchItemLabel.textContent =
                "Select Loco No.";

            loadLocoDropdown();

        }


        else if (type === "schedule") {

            searchItemLabel.textContent =
                "Select Schedule";

            loadScheduleDropdown();

        }


        else if (type === "component") {

            searchItemLabel.textContent =
                "Component / Parameter";

            loadComponentDropdown();
            loadParameterHistory();

        }

        else if (type === "archive") {

            searchItemLabel.textContent =
                "Select Archived Loco No.";

            loadArchiveLocoDropdown();

        }


        else {

            searchItemLabel.textContent =
                "Select Item";

        }

    }
);


// =====================================================
// RESET SEARCH ITEM
// =====================================================

function resetSearchItem() {

    searchItem.innerHTML = `

        <option value="">

            Select Item

        </option>

    `;

    searchItem.disabled = true;

}

function loadArchiveLocoDropdown() {
    const locos = [...new Set(historicalData.map(item => String(item.locoNo)))].sort(
        (left, right) => left.localeCompare(right, undefined, { numeric: true })
    );
    searchItem.disabled = false;
    searchItem.innerHTML = '<option value="">Select Archived Loco No.</option>';
    locos.forEach(locoNo => {
        const option = document.createElement("option");
        option.value = locoNo;
        option.textContent = locoNo;
        searchItem.appendChild(option);
    });
}


// =====================================================
// LOAD LOCO DROPDOWN
// =====================================================

function loadLocoDropdown() {

    searchItem.disabled = false;

    searchItem.innerHTML = `

        <option value="">

            Select Loco No.

        </option>

    `;


    locoList.forEach(item => {

        const locoNo =
            item.loco_no || item.locoNo;

        if (!locoNo) return;


        searchItem.innerHTML += `

            <option value="${locoNo}">

                ${locoNo}

            </option>

        `;

    });

}


// =====================================================
// LOAD SCHEDULE DROPDOWN
// =====================================================

function loadScheduleDropdown() {

    searchItem.disabled = false;

    searchItem.innerHTML = `

        <option value="">

            Select Schedule

        </option>

    `;


    scheduleList.forEach(item => {

        const scheduleName =
            item.schedule_name ||
            item.scheduleName;

        if (!scheduleName) return;


        searchItem.innerHTML += `

            <option value="${scheduleName}">

                ${scheduleName}

            </option>

        `;

    });

}


// =====================================================
// LOAD COMPONENT DROPDOWN
// =====================================================

function loadComponentDropdown() {
    searchItem.disabled = !parameterReady;
    searchItem.replaceChildren(new Option(parameterReady ? 'Select Component / Parameter' : 'Loading Parameters…', ''));
    parameterNames.forEach(name => searchItem.appendChild(new Option(name, name)));
}

// =====================================================
// SEARCH BUTTON
// =====================================================

searchBtn.addEventListener(
    "click",
    async function () {

        if (searchType.value === 'component' && !parameterReady) {
            await loadParameterHistory();
            return;
        }

        const type =
            searchType.value;

        const selectedItem =
            searchItem.value;


        if (!type) {

            alert(
                "Please select Search Type."
            );

            return;

        }


        if (!selectedItem) {

            alert(
                "Please select search item."
            );

            return;

        }


        searchViewerData(
            type,
            selectedItem
        );

    }
);


// =====================================================
// SEARCH VIEWER DATA
// =====================================================

function searchViewerData(
    type,
    selectedItem
) {

    if (type === 'component') {
        const loco = locoFilter.value.trim();
        const schedule = componentSchedule.value;
        const from = componentDateFrom.value;
        const to = componentDateTo.value;
        if (!loco || !schedule) {
            clearResult();
            alert('Please select Loco No. (or Select All Locos) and Schedule.');
            return;
        }
        if ((!from && to) || (from && to && from > to) ||
            !componentDateFrom.checkValidity() || !componentDateTo.checkValidity()) {
            clearResult();
            alert('Please enter a valid schedule date or date range, with From on or before To.');
            return;
        }
        const data = ViewerParameters.filterRows(parameterRows, {
            parameter: selectedItem, loco, schedule, from, to: to || from
        });
        resultTitle.textContent = `${selectedItem} — ${loco} — ${schedule} — ${from ? from + (to && to !== from ? ' to ' + to : '') : 'All dates (newest first)'}`;
        renderParameterTable(data);
        return;
    }

    let filteredData = [];


    if (type === "loco") {

        filteredData =
            viewerData.filter(item =>

                String(item.locoNo) ===
                String(selectedItem)

            );

        resultTitle.textContent =

            "Maintenance History of Loco " +
            selectedItem;

    }


    else if (type === "schedule") {

        filteredData =
            viewerData.filter(item =>

                item.schedule ===
                selectedItem

            );

        resultTitle.textContent =

            "Maintenance History for Schedule " +
            selectedItem;

    }


    else if (type === "archive") {

        filteredData = historicalData.filter(item =>
            String(item.locoNo) === String(selectedItem)
        );

        resultTitle.textContent =
            "Old Schedule Forms of Loco " + selectedItem;

    }


    if (type === "schedule") {
        const selectedLoco = locoFilter.value.trim();
        if (!selectedLoco) {
            clearResult();
            alert("Please select a loco number or Select All Locos.");
            locoFilter.focus();
            return;
        }
        if (selectedLoco.toLowerCase() !== "select all locos") {
            filteredData = filteredData.filter(item => String(item.locoNo) === selectedLoco);
            resultTitle.textContent += " — Loco " + selectedLoco;
        } else {
            resultTitle.textContent += " — All Locos";
        }
    }

    renderViewerTable(filteredData);

}


// =====================================================
// RENDER TABLE
// =====================================================

function renderViewerTable(data) {

    displayedColumns = null;
    document.getElementById('viewerTableHead').innerHTML = defaultTableHead;

    displayedData = data.slice();
    downloadResultsBtn.disabled = displayedData.length === 0;

    viewerTableBody.innerHTML = "";


    recordCount.textContent =

        data.length +
        (
            data.length === 1
                ? " Record"
                : " Records"
        );


    if (data.length === 0) {

        viewerTableBody.innerHTML = `

            <tr class="no-record-row">

                <td colspan="6">

                    No approved maintenance
                    record found.

                </td>

            </tr>

        `;

        return;

    }


    data.forEach(
        (item, index) => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>

                    ${index + 1}

                </td>


                <td>

                    <span class="loco-number">

                        ${item.locoNo}

                    </span>

                </td>


                <td>

                    ${formatDate(item.date)}

                </td>


                <td>

                    <span class="schedule-badge">

                        ${item.schedule}

                    </span>

                </td>


                <td>

                    <span class="component-badge">

                        ${item.component}

                    </span>

                </td>


                <td>

                    <button
                        class="view-form-btn"
                        onclick="viewScheduleForm(${item.id}, '${item.recordSource || "current"}')">

                        View Form

                    </button>

                </td>

            `;


            viewerTableBody.appendChild(row);

        }
    );

}


// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(dateValue) {

    if (!dateValue) return "-";

    const date =
        new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString(
        "en-IN"
    );

}


// =====================================================
// VIEW SCHEDULE FORM
// =====================================================

function viewScheduleForm(id, recordSource) {

    if (recordSource === "archive") {
        window.open(`/api/historical-schedules/${id}/view`, "_blank", "noopener");
        return;
    }

    const item =
        viewerData.find(
            record => record.id === id
        );


    if (!item) return;


    const documents = (item.documents || []).map(document => `

        <p>

            <a href="${document.url}" target="_blank" rel="noopener">

                ${document.label}

            </a>

        </p>

    `).join("");

    scheduleFormContent.innerHTML = `

        <div class="common-card">

            <h3>

                ${item.formName}

            </h3>

            <br>


            <p>

                <strong>Loco No. :</strong>

                ${item.locoNo}

            </p>


            <p>

                <strong>Date :</strong>

                ${formatDate(item.date)}

            </p>


            <p>

                <strong>Schedule :</strong>

                ${item.schedule}

            </p>


            <p>

                <strong>Loco Type :</strong>

                ${item.component}

            </p>

            <p><strong>Shed Arrival :</strong> ${formatDateTime(item.shedArrival)}</p>

            <p><strong>Schedule Completion :</strong> ${formatDateTime(item.scheduleCompletion)}</p>

            <p><strong>Shed Release :</strong> ${formatDateTime(item.shedRelease)}</p>

            <p><strong>Arrived As :</strong> ${item.arrivedAs || "-"}</p>

            <p><strong>Shed Out Train No. :</strong> ${item.shedOutTrainNo || "-"}</p>

            <p><strong>Remarks :</strong> ${item.remarks || "-"}</p>


            <br>


            <p>

                ${documents || "No schedule document attached."}

            </p>

        </div>

    `;


    scheduleFormModal
        .classList.add("show");

}


// =====================================================
// CLOSE MODAL
// =====================================================

closeModalBtn.addEventListener(
    "click",
    closeScheduleForm
);


function closeScheduleForm() {

    scheduleFormModal
        .classList.remove("show");

}


// =====================================================
// CLOSE MODAL ON OUTSIDE CLICK
// =====================================================

scheduleFormModal.addEventListener(
    "click",
    function (event) {

        if (
            event.target ===
            scheduleFormModal
        ) {

            closeScheduleForm();

        }

    }
);


// =====================================================
// CLEAR RESULT
// =====================================================

function clearResult() {

    displayedColumns = null;
    document.getElementById('viewerTableHead').innerHTML = defaultTableHead;

    displayedData = [];
    downloadResultsBtn.disabled = true;

    resultTitle.textContent =

        "Select search criteria to view records.";


    recordCount.textContent =
        "0 Records";


    viewerTableBody.innerHTML = `

        <tr class="no-record-row">

            <td colspan="6">

                Select search criteria to view
                maintenance history.

            </td>

        </tr>

    `;

}

function formatDateTime(dateValue) {

    if (!dateValue) return "-";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("en-IN");

}

function renderParameterTable(data) {
    displayedData = data.slice();
    displayedColumns = parameterColumns;
    downloadResultsBtn.disabled = !data.length;
    recordCount.textContent = `${data.length} Record${data.length === 1 ? '' : 's'}`;
    const head = document.getElementById('viewerTableHead');
    head.replaceChildren();
    ['Sr.', ...parameterColumns.map(column => column[0])].forEach(label => {
        const cell = document.createElement('th');
        cell.textContent = label;
        head.appendChild(cell);
    });
    viewerTableBody.replaceChildren();
    if (!data.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = parameterColumns.length + 1;
        cell.textContent = 'No approved parameter entries found for these filters.';
        row.appendChild(cell);
        viewerTableBody.appendChild(row);
    }
    data.forEach((item, index) => {
        const row = document.createElement('tr');
        [index + 1, ...parameterColumns.map(([, key]) => key === 'date' ? formatDate(item[key]) : item[key] || '—')].forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
        });
        viewerTableBody.appendChild(row);
    });
}
