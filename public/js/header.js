document.addEventListener("DOMContentLoaded", async () => {

    const header = document.getElementById("common-header");

    if (!header) return;

    try {

        const response = await fetch("/components/header.html");

        header.innerHTML = await response.text();

    }

    catch (err) {

        console.error("Header Load Error :", err);

    }

});