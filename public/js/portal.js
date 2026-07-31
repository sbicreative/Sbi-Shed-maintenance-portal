const maintenanceForm = document.getElementById("maintenanceLoginForm");
const maintenanceMessage = document.getElementById("maintenanceMessage");
const loginModal = document.getElementById("loginModal");
const openLoginBtn = document.getElementById("openLoginBtn");
const closeLoginBtn = document.getElementById("closeLoginBtn");

function openLoginModal() {
    loginModal.hidden = false;
    document.body.classList.add("modal-open");
    closeLoginBtn.focus();
}

function closeLoginModal() {
    loginModal.hidden = true;
    document.body.classList.remove("modal-open");
    openLoginBtn.focus();
}

openLoginBtn.addEventListener("click", openLoginModal);
closeLoginBtn.addEventListener("click", closeLoginModal);
loginModal.querySelector("[data-close-modal]").addEventListener("click", closeLoginModal);
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !loginModal.hidden) closeLoginModal();
});

async function loadShedSummary() {
    const count = document.getElementById("shedLocoCount");
    const status = document.getElementById("shedCountStatus");
    try {
        const response = await fetch("/api/tracking/summary");
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Live count unavailable");
        count.textContent = result.total_locos;
        status.textContent = result.last_updated
            ? `Live board updated ${new Date(result.last_updated).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`
            : "Live position board";
    } catch (error) {
        count.textContent = "--";
        status.textContent = "Live count temporarily unavailable";
    }
}

maintenanceForm.addEventListener("submit", async event => {
    event.preventDefault();
    maintenanceMessage.textContent = "Checking employee details...";
    const name = document.getElementById("maintenanceName").value.trim();
    const mobile_no_cug = document.getElementById("maintenanceMobile").value.trim();

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, mobile_no_cug })
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Login failed.");
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = data.dashboard;
    } catch (error) {
        maintenanceMessage.textContent = error.message;
    }
});

loadShedSummary();
