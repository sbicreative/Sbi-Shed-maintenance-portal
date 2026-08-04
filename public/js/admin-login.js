document.getElementById("adminLoginForm").addEventListener("submit", async event => {
    event.preventDefault();
    const message = document.getElementById("adminLoginMessage");
    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    message.textContent = "Verifying secure credentials...";
    try {
        const response = await fetch("/api/admin/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: document.getElementById("adminUsername").value.trim(), password: document.getElementById("adminPassword").value })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Login failed.");
        sessionStorage.setItem("adminCsrfToken", data.csrfToken);
        window.location.replace(data.dashboard);
    } catch (error) { message.textContent = error.message; }
    finally { button.disabled = false; }
});
