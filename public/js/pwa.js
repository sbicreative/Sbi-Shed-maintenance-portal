(function () {
    let installPrompt;
    const banner = document.createElement("div");
    banner.id = "connectionStatus";
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    Object.assign(banner.style, {
        position: "fixed", left: "50%", bottom: "12px", zIndex: "9999",
        transform: "translateX(-50%)", padding: "9px 14px", borderRadius: "999px",
        color: "#fff", background: "#8b2d23", boxShadow: "0 5px 18px rgba(0,0,0,.2)",
        font: "700 12px/1.2 system-ui, sans-serif", display: "none"
    });

    function updateConnectionStatus() {
        const offline = !navigator.onLine;
        banner.textContent = "Offline mode — showing saved information where available";
        banner.style.display = offline ? "block" : "none";
        document.documentElement.classList.toggle("is-offline", offline);
    }

    document.addEventListener("DOMContentLoaded", () => {
        document.body.appendChild(banner);
        updateConnectionStatus();

        const installButton = document.createElement("button");
        installButton.id = "installAppButton";
        installButton.type = "button";
        installButton.textContent = "Install App";
        installButton.hidden = true;
        Object.assign(installButton.style, {
            position: "fixed", right: "14px", bottom: "14px", zIndex: "9998",
            border: "0", borderRadius: "999px", padding: "11px 17px",
            color: "#fff", background: "#1f4b36", boxShadow: "0 6px 20px rgba(0,0,0,.22)",
            font: "800 13px/1 system-ui, sans-serif", cursor: "pointer"
        });
        installButton.addEventListener("click", async () => {
            if (!installPrompt) return;
            installPrompt.prompt();
            await installPrompt.userChoice;
            installPrompt = null;
            installButton.hidden = true;
        });
        document.body.appendChild(installButton);

        window.addEventListener("beforeinstallprompt", event => {
            event.preventDefault();
            installPrompt = event;
            installButton.hidden = false;
        });
        window.addEventListener("appinstalled", () => {
            installPrompt = null;
            installButton.hidden = true;
        });
    });
    window.addEventListener("online", updateConnectionStatus);
    window.addEventListener("offline", updateConnectionStatus);

    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js")
            .catch(error => console.warn("PWA service worker registration failed", error)));
    }
}());
