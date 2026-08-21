const maintenanceForm = document.getElementById("maintenanceLoginForm");
const maintenanceMessage = document.getElementById("maintenanceMessage");
const loginModal = document.getElementById("loginModal");
const openLoginBtn = document.getElementById("openLoginBtn");
const closeLoginBtn = document.getElementById("closeLoginBtn");
const installAppBtn = document.getElementById("installAppBtn");
const installHelp = document.getElementById("installHelp");
const installHelpText = document.getElementById("installHelpText");
const closeInstallHelpBtn = document.getElementById("closeInstallHelpBtn");
let deferredInstallPrompt = null;

function showInstallHelp(message) {
    installHelpText.textContent = message;
    installHelp.hidden = false;
}

function isInstalledApp() {
    return window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;
}

window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
});

window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    showInstallHelp("SBI Shed app installed successfully.");
});

installAppBtn.addEventListener("click", async () => {
    if (isInstalledApp()) {
        showInstallHelp("SBI Shed app is already installed on this device.");
        return;
    }
    if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        return;
    }
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    showInstallHelp(isIos
        ? "iPhone/iPad: Safari Share button खोलें और ‘Add to Home Screen’ चुनें।"
        : "Browser menu (⋮) खोलें और ‘Install app’ या ‘Add to Home screen’ चुनें। Chrome में यह page HTTPS link से खोलें।");
});

closeInstallHelpBtn.addEventListener("click", () => {
    installHelp.hidden = true;
});

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

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/service-worker.js")
            .catch(error => console.warn("Portal service worker registration failed", error));
    });
}
