const db = require("../config/supabase");

const mappings = [
    { section: "EL", schedule: "TI-3 PHASE", work: "TI SCHEDULE" },
    { section: "EL", schedule: "TI CONVENTIONAL", work: "TI CONVENTIONAL SCHEDULE" },
    { section: "ML", schedule: "TI-3 PHASE", work: "TI SCHEDULE" },
    { section: "ML", schedule: "TI CONVENTIONAL", work: "TI CONVENTIONAL SCHEDULE" }
];

async function main() {
    const { data: schedules, error: scheduleError } = await db
        .from("schedule_master")
        .select("id,department_id,section_id,schedule_name,section_master(section_name)")
        .in("schedule_name", ["TI-3 PHASE", "TI CONVENTIONAL"]);
    if (scheduleError) throw scheduleError;

    const { data: existing, error: workError } = await db
        .from("work_master")
        .select("id,section_id,schedule_id,work_name");
    if (workError) throw workError;

    const rows = mappings.flatMap(mapping => {
        const schedule = (schedules || []).find(item =>
            item.section_master?.section_name === mapping.section &&
            item.schedule_name === mapping.schedule
        );
        if (!schedule) {
            throw new Error(
                `Schedule mapping not found: ${mapping.section} ${mapping.schedule}`
            );
        }
        const found = (existing || []).some(item =>
            Number(item.section_id) === Number(schedule.section_id) &&
            Number(item.schedule_id) === Number(schedule.id) &&
            String(item.work_name).trim().toUpperCase() === mapping.work
        );
        return found ? [] : [{
            department_id: schedule.department_id,
            section_id: schedule.section_id,
            schedule_id: schedule.id,
            work_name: mapping.work,
            status: "true"
        }];
    });

    if (rows.length) {
        const { error } = await db.from("work_master").insert(rows);
        if (error) throw error;
    }

    console.log(JSON.stringify({
        success: true,
        inserted_work_rows: rows.length,
        mappings: mappings.length
    }, null, 2));
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
