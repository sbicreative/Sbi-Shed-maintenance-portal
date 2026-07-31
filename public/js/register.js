// ===========================================
// SBI SHED REGISTER (V2.0)
// ===========================================

const form = document.getElementById("registerForm");

const department = document.getElementById("department");
const section = document.getElementById("section");
const designation = document.getElementById("designation");

// ===========================================
// Load Departments
// ===========================================

window.addEventListener("DOMContentLoaded", async () => {

    await loadDepartments();

});

async function loadDepartments() {

    try {

        const res = await fetch("/api/departments");
        const data = await res.json();

        department.innerHTML =
            '<option value="">Select Department</option>';

        data.forEach(item => {

            department.innerHTML += `
    <option value="${item.id}">
        ${item.department_name}
    </option>
`;

        });

    } catch (err) {

        console.log(err);

    }

}

// ===========================================
// Department Changed
// ===========================================

department.addEventListener("change", async () => {

    await loadSections();
    await loadDesignations();

});

// ===========================================
// Load Sections
// ===========================================

async function loadSections() {

    section.innerHTML =
        '<option>Loading...</option>';

    try {

        const res = await fetch(
            `/api/sections/${department.value}`
        );

        const data = await res.json();

        section.innerHTML =
            '<option value="">Select Section</option>';

        data.forEach(item => {

            section.innerHTML += `
                <option value="${item.section_name}">
                    ${item.section_name}
                </option>
            `;

        });

    } catch (err) {

        console.log(err);

    }

}

// ===========================================
// Load Designations
// ===========================================

async function loadDesignations() {

    designation.innerHTML =
        '<option>Loading...</option>';

    try {

        const res = await fetch(
            `/api/designations/${department.value}`
        );

        const data = await res.json();

        designation.innerHTML =
            '<option value="">Select Designation</option>';

        data.forEach(item => {

            designation.innerHTML += `
                <option value="${item.designation_name}">
                    ${item.designation_name}
                </option>
            `;

        });

    } catch (err) {

        console.log(err);

    }

}

// ===========================================
// Register
// ===========================================

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const employee = {

        name: document.getElementById("name").value.trim(),

        mobile_no_cug:
            document.getElementById("mobile").value.trim(),

        pf_no:
            document.getElementById("pf_no").value.trim(),

        department:
department.options[department.selectedIndex].text,

section:
section.options[section.selectedIndex].text,

designation:
designation.options[designation.selectedIndex].text,

        role:
            document.getElementById("role").value

    };

    try {

        const res = await fetch("/api/auth/register", {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify(employee)

        });

        const result = await res.json();

        alert(result.message);

        if (result.success) {

            form.reset();

            window.location.href = "login.html";

        }

    } catch (err) {

        console.log(err);

        alert("Registration Failed.");

    }

});