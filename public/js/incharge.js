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

function actingChargeIsCurrent() {
    if (!user?.acting_charge) return true;
    const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata"
    });
    return today >= String(user.charge_handover?.start_date || "") &&
        today <= String(user.charge_handover?.end_date || "");
}

function enforceActingChargeWindow() {
    if (actingChargeIsCurrent()) return true;
    const restoredUser = {
        ...user,
        role: user.permanent_role || "supervisor"
    };
    delete restoredUser.acting_charge;
    delete restoredUser.acting_for_incharge_id;
    delete restoredUser.charge_handover;
    localStorage.setItem("user", JSON.stringify(restoredUser));
    window.location.replace("/dashboard/supervisor.html");
    return false;
}

enforceActingChargeWindow();

function todayInIndia() {
    return new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata"
    });
}

async function setupChargeHandover() {
    const form = document.getElementById("chargeHandoverForm");
    const badge = document.getElementById("chargeStatusBadge");
    const notice = document.getElementById("actingChargeNotice");
    const message = document.getElementById("chargeHandoverMessage");
    if (!form) return;

    if (user.acting_charge) {
        badge.textContent = "Acting Incharge";
        notice.textContent =
            `You are working as Acting Incharge from ` +
            `${user.charge_handover?.start_date || "-"} to ` +
            `${user.charge_handover?.end_date || "-"}.`;
        notice.hidden = false;
        form.hidden = true;
        return;
    }

    const today = todayInIndia();
    document.getElementById("chargeStartDate").value = today;
    document.getElementById("chargeEndDate").value = today;

    try {
        const response = await fetch(
            `/api/charge-handover/candidates/${user.supervisor_master_id}`
        );
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Unable to load Acting Incharge list."
            );
        }
        const select = document.getElementById("actingInchargeSelect");
        select.innerHTML = '<option value="">Select Supervisor</option>' +
            (result.candidates || []).map(item => `
                <option value="${item.id}">
                    ${escapeChargeText(item.name)} — ${escapeChargeText(item.section)}
                </option>
            `).join("");
        form.addEventListener("submit", saveChargeHandover);
    } catch (error) {
        message.textContent =
            "Charge Handover database setup is pending.";
        message.hidden = false;
        form.querySelectorAll("input,select,button")
            .forEach(field => field.disabled = true);
        console.warn("Charge Handover is not ready:", error);
    }
}

async function saveChargeHandover(event) {
    event.preventDefault();
    const button = document.getElementById("saveChargeHandoverBtn");
    const message = document.getElementById("chargeHandoverMessage");
    button.disabled = true;
    message.hidden = true;
    try {
        const response = await fetch("/api/charge-handover", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                permanent_incharge_id: user.supervisor_master_id,
                acting_incharge_id: Number(
                    document.getElementById("actingInchargeSelect").value
                ),
                start_date: document.getElementById("chargeStartDate").value,
                end_date: document.getElementById("chargeEndDate").value,
                reason: document.getElementById("chargeReason").value.trim()
            })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) {
            throw new Error(result.message || "Unable to hand over charge.");
        }
        message.textContent = result.message;
        message.style.color = "#166534";
        message.hidden = false;
        event.target.reset();
    } catch (error) {
        message.textContent = error.message;
        message.style.color = "#b91c1c";
        message.hidden = false;
    } finally {
        button.disabled = false;
    }
}

function escapeChargeText(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ======================================
// PAGE SPECIFIC CODE
// ======================================

// Incharge dashboard code below
// Supervisor dashboard code below
// Viewer dashboard code below

document.addEventListener("DOMContentLoaded", () => {
    loadDashboardSummary();
    setupChargeHandover();
    setInterval(loadDashboardSummary, 30000);
    setInterval(enforceActingChargeWindow, 60000);
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
