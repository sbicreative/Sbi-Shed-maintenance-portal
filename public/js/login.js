document.getElementById("loginForm").addEventListener("submit", async function (e) {

    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const mobile_no_cug = document.getElementById("mobile").value.trim();

    if (!name || !mobile_no_cug) {

        alert("Please enter Name and Mobile Number.");

        return;

    }

    try {

        const response = await fetch("/api/auth/login", {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

                name,

                mobile_no_cug

            })

        });

        const data = await response.json();

        console.log(data);
        if (!data.success) {

            alert(data.message);

            return;

        }
        // Save Current User



        localStorage.setItem("user", JSON.stringify(data.user));

        // The server selects the dashboard after verifying the role
        // and resolving the relevant master-table mapping.
        window.location.href = data.dashboard;
    }

    catch (error) {

        console.error(error);

        alert("Server Error");

    }

});
