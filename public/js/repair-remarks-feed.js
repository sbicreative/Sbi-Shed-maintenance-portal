(function () {
    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function locoNumber(item) {
        return item.loco_master?.loco_no ||
            item.temporary_loco_master?.loco_no || "-";
    }

    async function loadRepairRemarksFeed() {
        const feed = document.getElementById("repairRemarksFeed");
        const count = document.getElementById("repairRemarksCount");
        const role = document.body.dataset.dashboardRole;
        if (!feed || !role) return;

        const user = JSON.parse(localStorage.getItem("user") || "null");
        const department = String(user?.department || "").trim();
        if (!department) {
            feed.innerHTML = '<p class="remarks-feed-empty error">Department is not available for this login.</p>';
            return;
        }

        try {
            const response = await fetch(
                `/api/repair-schedule/remarks?viewer_role=${encodeURIComponent(role)}&department=${encodeURIComponent(department)}`
            );
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || "Unable to load repair remarks.");
            }

            const allowedLocos = role === "staff"
                ? (window.assignedRepairLocoNumbers || new Set())
                : null;
            const visibleRemarks = (result.remarks || []).filter(item =>
                !allowedLocos || allowedLocos.has(String(locoNumber(item)).trim().toLowerCase())
            );
            const remarks = visibleRemarks.slice(0, 8);
            if (count) count.textContent = visibleRemarks.length;
            if (!remarks.length) {
                feed.innerHTML = '<p class="remarks-feed-empty">No new cross-role repair remarks.</p>';
                return;
            }

            feed.innerHTML = remarks.map(item => `
                <article class="remarks-feed-item">
                    <div class="remarks-feed-heading">
                        <strong>Loco ${escapeHtml(locoNumber(item))}</strong>
                        <span>${escapeHtml(item.author_role)}</span>
                    </div>
                    <p>${escapeHtml(item.remark_text)}</p>
                    <small>
                        ${escapeHtml(item.author_name)} ·
                        ${escapeHtml(item.assignment_date || "No assignment date")} ·
                        ${escapeHtml(new Date(item.created_at).toLocaleString("en-IN"))}
                    </small>
                </article>
            `).join("");
        } catch (error) {
            feed.innerHTML = `<p class="remarks-feed-empty error">${escapeHtml(error.message)}</p>`;
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        if (document.body.dataset.dashboardRole === "staff") {
            window.addEventListener("assigned-repair-locos-ready", loadRepairRemarksFeed);
        } else {
            loadRepairRemarksFeed();
        }
        window.setInterval(loadRepairRemarksFeed, 30000);
        window.addEventListener("repair-remarks-updated", loadRepairRemarksFeed);
    });
}());
