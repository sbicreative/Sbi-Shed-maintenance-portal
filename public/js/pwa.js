(function () {
    if (!document.querySelector('link[data-pwa-responsive]')) {
        const responsiveStyles = document.createElement("link");
        responsiveStyles.rel = "stylesheet";
        responsiveStyles.href = "/css/pwa-responsive.css";
        responsiveStyles.dataset.pwaResponsive = "true";
        document.head.appendChild(responsiveStyles);
    }
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

    function prepareResponsiveTable(table) {
        if (!table || table.dataset.mobileLayout === "single") return;

        const headers = Array.from(table.querySelectorAll("thead th"))
            .map(header => header.textContent.replace(/\s+/g, " ").trim());

        if (table.dataset.mobileLayout === "manpower") {
            table.classList.add("mobile-two-row-table", "mobile-manpower-table");
        } else if (headers.length >= 2 && headers.length <= 6) {
            table.classList.add("mobile-compact-table");
            return;
        } else {
            if (headers.length <= 1) return;
            table.classList.add("mobile-two-row-table");
        }

        table.querySelectorAll("tbody tr").forEach(row => {
            const cells = Array.from(row.children).filter(cell => cell.tagName === "TD");
            row.classList.toggle(
                "mobile-full-row",
                cells.length <= 1 || cells.some(cell => Number(cell.colSpan) > 1)
            );
            cells.forEach((cell, index) => {
                if (!cell.dataset.mobileLabel) {
                    cell.dataset.mobileLabel = headers[index] || `Column ${index + 1}`;
                }
            });
        });
    }

    function prepareResponsiveTables(root = document) {
        if (root.matches?.("table")) prepareResponsiveTable(root);
        root.querySelectorAll?.("table").forEach(prepareResponsiveTable);
    }

    document.addEventListener("DOMContentLoaded", () => {
        document.body.appendChild(banner);
        updateConnectionStatus();
        prepareResponsiveTables();

        const tableObserver = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.target.closest?.("table")) {
                    prepareResponsiveTable(mutation.target.closest("table"));
                }
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) prepareResponsiveTables(node);
                });
            });
        });
        tableObserver.observe(document.body, { childList: true, subtree: true });

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
