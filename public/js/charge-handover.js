
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
                    ${escapeChargeText(item.name)} â€” ${escapeChargeText(item.section)}
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

document.addEventListener("DOMContentLoaded", setupChargeHandover);
setInterval(enforceActingChargeWindow, 60000);
