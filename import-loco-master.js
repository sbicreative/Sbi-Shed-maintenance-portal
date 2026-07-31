const xlsx = require("xlsx");
const supabase = require("./config/supabase");

const excelPath =
    "project documents\\MASTER\\Loco master.xlsx";

const sheetMapping = {
    "Alco": "Alco",
    "MG ALCO": "MG",
    "hhp": "HHP",
    "Wag9hc": "WAG9",
    "wag12b": "WAG12",
    "wap7": "WAP7"
};

async function importLocos() {

    try {

        console.log("Reading Excel...");

        const workbook = xlsx.readFile(excelPath);

        // Get loco types from Supabase

        const { data: locoTypes, error: typeError } =
            await supabase
                .from("loco_type_master")
                .select("id,loco_type");

        if (typeError) {
            throw typeError;
        }

        console.log("Loco Types:", locoTypes);

        const typeMap = {};

        locoTypes.forEach(type => {

            typeMap[type.loco_type.toUpperCase()] = type.id;

        });

        const locos = [];

        for (const [sheetName, broadType] of Object.entries(sheetMapping)) {

            const sheet = workbook.Sheets[sheetName];

            if (!sheet) {

                console.log("Sheet not found:", sheetName);

                continue;

            }

            const rows = xlsx.utils.sheet_to_json(
                sheet,
                { header: 1 }
            );

            let startRow;

            if (
                sheetName === "Alco" ||
                sheetName === "MG ALCO" ||
                sheetName === "hhp"
            ) {

                startRow = 2;

            } else {

                startRow = 1;

            }

            const typeId =
                typeMap[broadType.toUpperCase()];

            if (!typeId) {

                throw new Error(
                    `Loco Type not found: ${broadType}`
                );

            }

            for (let i = startRow; i < rows.length; i++) {

                const locoNo = rows[i][1];

                if (
                    locoNo === undefined ||
                    locoNo === null ||
                    String(locoNo).trim() === ""
                ) {

                    continue;

                }

                locos.push({

                    loco_no: String(locoNo).trim(),

                    loco_type_id: typeId,

                    status: "Active"

                });

            }

            console.log(
                `${broadType} loaded`
            );

        }

        console.log(
            "TOTAL LOCOS FOUND:",
            locos.length
        );

        if (locos.length !== 285) {

            throw new Error(
                `Expected 285 locos but found ${locos.length}`
            );

        }

        // Remove existing loco master data

        console.log(
            "Clearing existing loco_master..."
        );

        const { error: deleteError } =
            await supabase
                .from("loco_master")
                .delete()
                .neq("id", 0);

        if (deleteError) {
            throw deleteError;
        }

        // Insert loco data

        console.log(
            "Importing locos..."
        );

        const { error: insertError } =
            await supabase
                .from("loco_master")
                .insert(locos);

        if (insertError) {
            throw insertError;
        }

        console.log(
            "================================"
        );

        console.log(
            "LOCO MASTER IMPORT SUCCESSFUL"
        );

        console.log(
            "TOTAL IMPORTED:",
            locos.length
        );

        console.log(
            "================================"
        );

    }

    catch (error) {

        console.error(
            "IMPORT ERROR:",
            error
        );

    }

}

importLocos();