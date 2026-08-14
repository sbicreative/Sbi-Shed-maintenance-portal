(function () {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const role = String(user?.role || "").trim().toLowerCase();
    const authorId = Number(user?.supervisor_master_id || user?.id);

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[char]);
    }

    function addRow(list) {
        list.insertAdjacentHTML("beforeend", `
            <div class="dashboard-remark-row">
                <textarea class="dashboard-remark-input" rows="2" placeholder="Enter remark"></textarea>
                <button type="button" class="dashboard-remove-remark" aria-label="Remove remark">×</button>
            </div>`);
    }

    async function loadOptions(select, message) {
        const response = await fetch(`/api/repair-schedule/assignment-options?role=${encodeURIComponent(role)}&author_id=${authorId}`);
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Unable to load assigned work.");
        select.innerHTML = '<option value="">Select assigned loco / work</option>' +
            result.assignments.map(item => {
                const header = item.assign_work_header || {};
                const loco = header.loco_master?.loco_no || header.temporary_loco_master?.loco_no || "-";
                const schedule = header.schedule_master?.schedule_name || "-";
                const work = item.work_master?.work_name || "-";
                return `<option value="${Number(item.id)}">Loco ${escapeHtml(loco)} · ${escapeHtml(schedule)} · ${escapeHtml(work)}</option>`;
            }).join("");
        message.textContent = result.assignments.length ? "" : "No assigned work is available for remarks.";
    }

    document.addEventListener("DOMContentLoaded", () => {
        const form = document.getElementById("dashboardRemarkForm");
        if (!form || !["incharge", "supervisor"].includes(role) || !authorId) return;
        const select = document.getElementById("dashboardRemarkAssignment");
        const list = document.getElementById("dashboardRemarkRows");
        const message = document.getElementById("dashboardRemarkMessage");
        document.getElementById("dashboardAddRemark").addEventListener("click", () => addRow(list));
        list.addEventListener("click", event => {
            const button = event.target.closest(".dashboard-remove-remark");
            if (!button) return;
            if (list.querySelectorAll(".dashboard-remark-row").length === 1) {
                list.querySelector(".dashboard-remark-input").value = "";
            } else button.closest(".dashboard-remark-row").remove();
        });
        form.addEventListener("submit", async event => {
            event.preventDefault();
            const remarks = Array.from(list.querySelectorAll(".dashboard-remark-input"))
                .map(input => input.value.trim()).filter(Boolean);
            if (!select.value || !remarks.length) {
                message.textContent = "Select assigned work and enter at least one remark.";
                return;
            }
            const save = form.querySelector("button[type=submit]");
            save.disabled = true;
            try {
                const response = await fetch("/api/repair-schedule/remarks", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ assign_work_detail_id: Number(select.value), author_id: authorId, author_name: user.name, author_role: role, remarks })
                });
                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.message || "Unable to save remarks.");
                list.innerHTML = ""; addRow(list);
                message.textContent = `${result.count} remark${result.count === 1 ? "" : "s"} added.`;
                window.dispatchEvent(new CustomEvent("repair-remarks-updated"));
            } catch (error) { message.textContent = error.message; }
            finally { save.disabled = false; }
        });
        addRow(list);
        loadOptions(select, message).catch(error => { message.textContent = error.message; });
    });
}());
