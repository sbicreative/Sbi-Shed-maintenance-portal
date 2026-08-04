document.querySelectorAll("[data-open-resource]").forEach(button => {
    button.addEventListener("click", () => {
        const resource = button.dataset.openResource;
        const nav = document.querySelector(`.nav-button[data-resource="${resource}"]`);
        if (nav) activate(nav);
        loadResource(resource);
    });
});
