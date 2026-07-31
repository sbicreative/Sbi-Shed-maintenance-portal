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


// =====================================================
// DEMO COMPONENT MASTER
// Later original Component Master se replace hoga
// =====================================================

const componentList = [

    {
        group: "Electrical",
        name: "TM"
    },

    {
        group: "Electrical",
        name: "Battery"
    },

    {
        group: "Electrical",
        name: "BUR"
    },

    {
        group: "Electrical",
        name: "VCD"
    },

    {
        group: "Electrical",
        name: "Hotel Load"
    },

    {
        group: "Mechanical",
        name: "Transformer"
    },

    {
        group: "Mechanical",
        name: "Axle"
    },

    {
        group: "Mechanical",
        name: "Wheels"
    },

    {
        group: "Mechanical",
        name: "Buffer"
    },

    {
        group: "Mechanical",
        name: "Panto"
    }

];


let viewerData = [];


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

        await loadSchedules();

        await loadHistory();

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
                "Select Component";

            loadComponentDropdown();

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

    searchItem.disabled = false;

    searchItem.innerHTML = `

        <option value="">

            Select Component

        </option>

    `;


    const groups = {};


    componentList.forEach(item => {

        if (!groups[item.group]) {

            groups[item.group] = [];

        }

        groups[item.group].push(item);

    });


    Object.keys(groups).forEach(group => {

        const optgroup =
            document.createElement("optgroup");

        optgroup.label = group;


        groups[group].forEach(item => {

            const option =
                document.createElement("option");

            option.value = item.name;

            option.textContent = item.name;

            optgroup.appendChild(option);

        });


        searchItem.appendChild(optgroup);

    });

}


// =====================================================
// SEARCH BUTTON
// =====================================================

searchBtn.addEventListener(
    "click",
    function () {

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


    else if (type === "component") {

        filteredData =
            viewerData.filter(item =>

                item.component ===
                selectedItem

            );

        resultTitle.textContent =

            "Maintenance History for Component " +
            selectedItem;

    }


    renderViewerTable(filteredData);

}


// =====================================================
// RENDER TABLE
// =====================================================

function renderViewerTable(data) {

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
                        onclick="viewScheduleForm(${item.id})">

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

function viewScheduleForm(id) {

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
