const user = JSON.parse(localStorage.getItem("user") || "null");
const timeline = document.getElementById("timeline");
const message = document.getElementById("message");
let allowedStaffLocos = null;

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
}

function dashboardForRole() {
    const role = String(user?.role || "").toLowerCase();
    return role === "staff" ? "/dashboard/staff.html"
        : role === "supervisor" ? "/dashboard/supervisor.html"
            : "/dashboard/incharge.html";
}

async function loadRemarks() {
    message.textContent = "Loading remarks…";
    timeline.innerHTML = "";
    const params = new URLSearchParams();
    const date = document.getElementById("dateFilter").value;
    const loco = document.getElementById("locoFilter").value.trim();
    if (date) params.set("date", date);
    if (loco) params.set("loco", loco);
    try {
        const response = await fetch(`/api/repair-schedule/remarks?${params}`);
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Unable to load remarks.");
        const visibleRemarks = allowedStaffLocos
            ? (result.remarks || []).filter(item => {
                const locoNo = item.loco_master?.loco_no || item.temporary_loco_master?.loco_no || "";
                return allowedStaffLocos.has(String(locoNo).trim().toLowerCase());
            })
            : (result.remarks || []);
        message.textContent = `${visibleRemarks.length} remark${visibleRemarks.length === 1 ? "" : "s"}`;
        if (!visibleRemarks.length) {
            timeline.innerHTML = '<div class="empty">No repair schedule remarks match these filters.</div>';
            return;
        }
        const groups = visibleRemarks.reduce((map, item) => {
            const day = item.assignment_date || "No assignment date";
            if (!map.has(day)) map.set(day, []);
            map.get(day).push(item);
            return map;
        }, new Map());
        timeline.innerHTML = [...groups].map(([day, items]) => `<div class="day-group"><h2>${escapeHtml(day)}</h2>${items.map(item => {
            const locoNo = item.loco_master?.loco_no || item.temporary_loco_master?.loco_no || "Unknown loco";
            const schedule = item.schedule_master?.schedule_name || "No schedule";
            const work = item.assign_work_details?.work_master?.work_name || item.schedule_form_details?.schedule_form_master?.form_name || "General remark";
            const time = new Date(item.created_at).toLocaleString("en-IN");
            return `<article class="remark-card"><h3>Loco ${escapeHtml(locoNo)} · ${escapeHtml(schedule)}</h3><p class="meta"><span>${escapeHtml(work)}</span><span class="role">${escapeHtml(item.author_role)}</span><span>${escapeHtml(item.author_name)} · ${escapeHtml(time)}</span></p><p class="remark-text">${escapeHtml(item.remark_text)}</p></article>`;
        }).join("")}</div>`).join("");
    } catch (error) {
        message.textContent = error.message;
        timeline.innerHTML = '<div class="empty">The remarks timeline is unavailable.</div>';
    }
}

document.getElementById("filters").addEventListener("submit", event => { event.preventDefault(); loadRemarks(); });
document.getElementById("clearBtn").addEventListener("click", () => { document.getElementById("filters").reset(); loadRemarks(); });
document.getElementById("backBtn").addEventListener("click", () => { window.location.href = dashboardForRole(); });

async function authorizeRepairSchedule() {
    const role = String(user?.role || "").trim().toLowerCase();
    if (!user) {
        window.location.replace("/dashboard/login.html");
        return;
    }
    if (role === "incharge" || role === "supervisor") {
        document.body.style.visibility = "";
        document.body.classList.remove("access-pending");
        await loadRemarks();
        return;
    }
    if (role !== "staff" || !Number(user.employee_master_id)) {
        window.location.replace(dashboardForRole());
        return;
    }

    try {
        const response = await fetch(`/api/manpower-distribution/staff/${Number(user.employee_master_id)}`);
        const assignments = await response.json();
        if (!response.ok || !Array.isArray(assignments)) {
            throw new Error(assignments.message || "Unable to verify Repairs assignment.");
        }
        const locoAssignments = assignments.filter(item => {
            const header = item.work_detail?.assign_work_header || {};
            return Boolean(header.loco_master?.loco_no || header.temporary_loco_master?.loco_no);
        });
        if (!locoAssignments.length) {
            window.location.replace("/dashboard/staff.html");
            return;
        }
        allowedStaffLocos = new Set(locoAssignments.map(item => {
            const header = item.work_detail?.assign_work_header || {};
            return String(header.loco_master?.loco_no || header.temporary_loco_master?.loco_no || "").trim().toLowerCase();
        }).filter(Boolean));
        document.body.style.visibility = "";
        document.body.classList.remove("access-pending");
        await loadRemarks();
    } catch (error) {
        window.location.replace("/dashboard/staff.html");
    }
}

authorizeRepairSchedule();
