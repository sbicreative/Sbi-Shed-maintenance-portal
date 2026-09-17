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
    loadTodaysActivity();
    setInterval(loadTodaysActivity, 30000);
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
