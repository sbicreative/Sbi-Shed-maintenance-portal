const xlsx = require("xlsx");
const supabase = require("./config/supabase");

async function importScheduleMaster() {

    console.log("Reading Excel...");

    const workbook = xlsx.readFile("Project Documents\\MASTER\\Schedule Types.xlsx");

    const sheets = ["Electric", "HHP", "Alco", "MG"];

    let schedules = [];

    sheets.forEach(sheetName => {

        const sheet = workbook.Sheets[sheetName];

        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        rows.slice(1).forEach(row => {

            if (!row[1]) return;

            schedules.push({
                loco_type: sheetName,
                schedule_type: String(row[1]).trim()
            });

        });

    });

    console.log("TOTAL SCHEDULES :", schedules.length);

    console.log("Clearing old data...");

    await supabase
        .from("schedule_master")
        .delete()
        .neq("id", 0);

    console.log("Importing...");

    const { error } = await supabase
        .from("schedule_master")
        .insert(schedules);

    if (error) {
        console.log(error);
        return;
    }

    console.log("==============================");
    console.log("SCHEDULE MASTER IMPORT SUCCESS");
    console.log("TOTAL :", schedules.length);
    console.log("==============================");

}

importScheduleMaster();