// ===========================================
// SBI SHED - ASSIGNED WORK
// ===========================================

const loco = document.getElementById("loco");
const schedule = document.getElementById("schedule");
const assignDate = document.getElementById("assignDate");

const workTableBody =
    document.getElementById("workTableBody");

const addWorkBtn =
    document.getElementById("addWorkBtn");

const assignWorkForm =
    document.getElementById("assignWorkForm");

    

// ===========================================
// ADD WORK ROW
// ===========================================

addWorkBtn.addEventListener("click", function () {

    addWorkRow();

});


function addWorkRow() {

    const row = document.createElement("tr");

    row.innerHTML = `

        <td>

            <select class="work-select" required>

                <option value="">
                    Select Work
                </option>

            </select>

        </td>

        <td>

            <select class="supervisor-select">

                <option value="">
                    Select Supervisor
                </option>

            </select>

        </td>

        <td>

            <input
                type="text"
                class="remarks"
                placeholder="Remarks"
            >

        </td>

        <td>

            <button
                type="button"
                class="remove-work-btn"
            >

                Remove

            </button>

        </td>

    `;

    workTableBody.appendChild(row);

    loadWorkList(row);

    row
        .querySelector(".remove-work-btn")
        .addEventListener("click", function () {

            row.remove();

        });

}


// ===========================================
// LOAD WORK MASTER
// ===========================================

async function loadWorkList(row) {

    try {

        const res = await fetch("/api/work-master");

        const data = await res.json();

        const workSelect =
            row.querySelector(".work-select");

        workSelect.innerHTML = `

            <option value="">
                Select Work
            </option>

        `;

        data.forEach(item => {

            workSelect.innerHTML += `

                <option value="${item.id}">

                    ${item.work_name}

                </option>

            `;

        });

    }

    catch (err) {

        console.log(err);

    }

}


// ===========================================
// SAVE ASSIGNED WORK
// ===========================================

assignWorkForm.addEventListener(
    "submit",
    async function (e) {

        e.preventDefault();

        const rows =
            workTableBody.querySelectorAll("tr");

        const works = [];

        rows.forEach(row => {

            const workMasterId =
                row.querySelector(
                    ".work-select"
                ).value;

            const supervisorId =
                row.querySelector(
                    ".supervisor-select"
                ).value;

            const remarks =
                row.querySelector(
                    ".remarks"
                ).value;

            if (workMasterId) {

                works.push({

                    work_master_id:
                        workMasterId,

                    supervisor_id:
                        supervisorId || null,

                    remarks:
                        remarks || null

                });

            }

        });


        // ===================================
        // Logged In Incharge
        // ===================================

        const employee = JSON.parse(

            localStorage.getItem("employee")

        );


        if (!employee) {

            alert("Login Required.");

            window.location.href = "login.html";

            return;

        }


        // ===================================
        // Assignment Object
        // ===================================

        const assignment = {

            assign_date:
                assignDate.value,

            loco_id:
                loco.value,

            schedule_id:
                schedule.value,

            created_by:
                employee.id,

            works:
                works

        };


        // ===================================
        // SAVE
        // ===================================

        try {

            const res = await fetch(

                "/api/assign-work",

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(assignment)

                }

            );

            const result = await res.json();

            alert(result.message);


            if (result.success) {

                assignWorkForm.reset();

                workTableBody.innerHTML = "";

                addWorkRow();

            }

        }

        catch (err) {

            console.log(err);

            alert("Unable to assign work.");

        }

    }

);


// ===========================================
// INITIAL WORK ROW
// ===========================================

addWorkRow();