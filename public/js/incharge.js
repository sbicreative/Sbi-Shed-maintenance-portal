// =============================================
// SBI SHED LOCO APP
// INCHARGE DASHBOARD
// =============================================
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

async function loadDashboardSummary() {
    const now = new Date();
    const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
    ].join("-");

    try {
        const [trackingResponse, workResponse] = await Promise.all([
            fetch("/api/tracking/summary"),
            fetch(`/api/assign-work/summary?assign_date=${today}`)
        ]);
        const [tracking, work] = await Promise.all([
            trackingResponse.json(),
            workResponse.json()
        ]);

        if (!trackingResponse.ok || !workResponse.ok) {
            throw new Error(
                tracking.message || work.message ||
                "Unable to load dashboard summary."
            );
        }

        document.getElementById("totalLocos").textContent =
            tracking.total_locos ?? 0;
        document.getElementById("workingLocos").textContent =
            work.working_locos ?? 0;
    } catch (error) {
        console.error("Dashboard Summary Error:", error);
    }
}

async function loadIncompleteFormsSummary() {
    const reviewerId = Number(user.supervisor_master_id || user.id);
    if (!reviewerId) return;
    try {
        const response = await fetch(`/api/schedule-forms/incomplete-summary/incharge/${reviewerId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        document.getElementById("incompleteForms").textContent = result.count ?? 0;
        document.getElementById("incompleteSchedules").textContent =
            result.schedule_names?.join(", ") || "-";
    } catch (error) { console.error("Incomplete Forms Summary:", error); }
}

function escapeActivityValue(value) {
    return String(value ?? "-")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function loadTodaysActivity() {
    const activityTable = document.getElementById("activityTable");
    if (!activityTable || !user?.id) return;
    const now = new Date();
    const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
    ].join("-");

    try {
        const response = await fetch(`/api/assign-work/today?assign_date=${today}&created_by=${Number(user.id)}`);
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Unable to load today's activity.");
        if (!result.data.length) {
            activityTable.innerHTML = '<tr><td colspan="4">No Record Found</td></tr>';
            return;
        }
        activityTable.innerHTML = result.data.map(item => `
            <tr>
                <td>${escapeActivityValue(item.loco_no)}</td>
                <td>${escapeActivityValue(item.schedule_name)}</td>
                <td>${escapeActivityValue(item.work_name)}</td>
                <td>${escapeActivityValue(item.supervisor_name)}</td>
            </tr>`).join("");
    } catch (error) {
        console.error("Today's Activity Error:", error);
        activityTable.innerHTML = '<tr><td colspan="4">Unable to load records</td></tr>';
    }
}


// ======================================
// PAGE SPECIFIC CODE
// ======================================

// Incharge dashboard code below
// Supervisor dashboard code below
// Viewer dashboard code below

document.addEventListener("DOMContentLoaded", () => {
    loadDashboardSummary();
    loadTodaysActivity();
    loadIncompleteFormsSummary();
    setInterval(loadDashboardSummary, 30000);
    setInterval(loadTodaysActivity, 30000);
    setInterval(loadIncompleteFormsSummary, 30000);
    const user =
    JSON.parse(
        localStorage.getItem("user")
    );

if (user) {

    document.getElementById("userName")
        .textContent = user.name;

}

    console.log("Incharge Dashboard Loaded");

    // =========================================
    // LOGOUT
    // =========================================

    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {

        logoutBtn.addEventListener("click", () => {

            if (confirm("Do you want to Logout?")) {

                localStorage.removeItem("employee");

                window.location.href = "/dashboard/login.html";

            }

        });

    }

    // =========================================
    // DASHBOARD BUTTON
    // =========================================

    const dashboardBtn = document.getElementById("dashboardBtn");

    if (dashboardBtn) {

        dashboardBtn.addEventListener("click", () => {

            window.location.href = "/dashboard/incharge.html";

        });

    }

});
