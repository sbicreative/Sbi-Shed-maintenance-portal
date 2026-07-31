document.addEventListener("DOMContentLoaded", async () => {

    const header = document.getElementById("common-header");

    if (!header) return;

    const response = await fetch("/components/header.html");

    const html = await response.text();

    header.innerHTML = html;

});