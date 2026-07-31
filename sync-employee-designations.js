const xlsx = require("xlsx");
const supabase = require("./config/supabase");

function clean(value) {
    return String(value || "")
        .trim()
        .replace(/^["']+\s*/, "")
        .trim();
}

function employeeKey(employee) {
    return [
        clean(employee.department).toLowerCase(),
        clean(employee.section).toLowerCase(),
        clean(employee.name).toLowerCase()
    ].join("|");
}

async function syncEmployeeDesignations() {
    const workbook = xlsx.readFile(
        "Project Documents\\MASTER\\Employee Master.xlsx"
    );

    const sheet =
        workbook.Sheets[workbook.SheetNames[0]];

    const rows = xlsx.utils.sheet_to_json(
        sheet,
        { defval: "" }
    );

    const designationByEmployee = new Map();

    rows.forEach(row => {
        const employee = {
            department: clean(row.Department),
            section: clean(row.Section),
            name: clean(row.Name),
            designation: clean(row.Designation)
        };

        if (
            employee.department &&
            employee.section &&
            employee.name &&
            employee.designation
        ) {
            designationByEmployee.set(
                employeeKey(employee),
                employee.designation
            );
        }
    });

    const { data: employees, error } =
        await supabase
            .from("employee_master")
            .select(
                "id,name,department,section,designation"
            );

    if (error) throw error;

    let updated = 0;
    let unchanged = 0;
    let notMatched = 0;

    for (const employee of employees || []) {
        const designation =
            designationByEmployee.get(
                employeeKey(employee)
            );

        if (!designation) {
            notMatched += 1;
            continue;
        }

        if (
            clean(employee.designation) ===
            designation
        ) {
            unchanged += 1;
            continue;
        }

        const { error: updateError } =
            await supabase
                .from("employee_master")
                .update({ designation })
                .eq("id", employee.id);

        if (updateError) {
            throw new Error(
                `Employee ID ${employee.id}: ${updateError.message}`
            );
        }

        updated += 1;
    }

    console.log({
        excelEmployees: designationByEmployee.size,
        supabaseEmployees: (employees || []).length,
        updated,
        unchanged,
        notMatched
    });
}

syncEmployeeDesignations()
    .then(() => {
        console.log(
            "Employee designations synced successfully."
        );
    })
    .catch(error => {
        console.error(
            "Designation sync failed:",
            error.message
        );
        process.exitCode = 1;
    });
