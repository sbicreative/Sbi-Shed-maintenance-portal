const xlsx = require("xlsx");
const supabase = require("./config/supabase");

async function importWorkMaster() {

    console.log("\n======================================");
    console.log("WORK MASTER IMPORT STARTED");
    console.log("======================================\n");

    // ===============================
    // Read Excel
    // ===============================

    const workbook = xlsx.readFile(
        "Project Documents\\MASTER\\Work Master.xlsx"
    );

    const sheet = workbook.Sheets["Work Master"];

    if (!sheet) {

        console.log("ERROR : Sheet 'Work Master' not found.");

        return;

    }

    const rows = xlsx.utils.sheet_to_json(sheet);


    console.log("Total Excel Rows :", rows.length);

    // ===============================
    // Load Masters
    // ===============================

    const { data: departments } = await supabase
        .from("department_master")
        .select("id, department_name");

    const { data: sections } = await supabase
        .from("section_master")
        .select("id, section_name");

    const { data: schedules } = await supabase
    .from("schedule_master")
    .select(
        "id, schedule_name, department_id"
    );

    // ===============================
    // Clear Old Data
    // ===============================

    console.log("\nDeleting Old Work Master...");

    const { error: deleteError } = await supabase
        .from("work_master")
        .delete()
        .neq("id", 0);

    if (deleteError) {

        console.log(deleteError);

        return;

    }

    console.log("Old Data Deleted.\n");

    // ===============================
    // Import
    // ===============================

    let imported = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of rows) {

        const departmentName = String(row.department || "").trim();

const sectionName = String(row.section || "").trim();

const locoType = String(row.loco_type || "").trim();

const scheduleName = String(row.schedule_type || "").trim();

const workName = String(row.work_name || "").trim();

const formName = String(row.form_name || "").trim();



        // -----------------------------

        const department = departments.find(
            d => d.department_name === departmentName
        );

        const section = sections.find(
            s => s.section_name === sectionName
        );

        const schedule = schedules.find(
    s =>
        s.schedule_name === scheduleName &&
        s.department_id === department.id
);
console.log(
    departmentName,
    scheduleName,
    "=>",
    schedule?.id
);
        if (!department || !section || !schedule) {

            console.log(
                "Skipped :",
                workName,
                "(Master Not Found)"
            );

            skipped++;

            continue;

        }

        // Duplicate Check

        const { data: duplicate } = await supabase

            .from("work_master")

            .select("id")

            .eq("department_id", department.id)

            .eq("section_id", section.id)

            .eq("schedule_id", schedule.id)

            .eq("work_name", workName);

        if (duplicate.length > 0) {

            console.log(
                "Duplicate :",
                workName
            );

            skipped++;

            continue;

        }

        const { error } = await supabase

            .from("work_master")

            .insert({

                department_id: department.id,

                section_id: section.id,

                loco_type: locoType,

                schedule_id: schedule.id,

                work_name: workName,

                form_name: formName,

                status: true

            });

        if (error) {

            console.log(
                "FAILED :",
                workName
            );

            console.log(error);

            failed++;

        }

        else {

            console.log(
                "Imported :",
                workName
            );

            imported++;

        }

    }

    console.log("\n======================================");
    console.log("IMPORT COMPLETED");
    console.log("======================================");

    console.log("Total Excel Rows :", rows.length);

    console.log("Imported :", imported);

    console.log("Skipped :", skipped);

    console.log("Failed :", failed);

    console.log("======================================\n");

}


importWorkMaster();