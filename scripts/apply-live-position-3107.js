const { createClient } = require("@supabase/supabase-js");

const db = createClient(
    "https://cgbnuyltwqdazyejottk.supabase.co",
    "sb_publishable_QA6Obxmmpy7GT9NOWtwHIQ_yNs91LID"
);

const positionPlan = {
    "LINE 8 ADI": ["13462", "40258", "49322", "40177", "13292"],
    "LINE 8 KLL": ["40322", "12374"],
    "LINE 7 ADI": ["50002", "40420", "12344", "11131"],
    "LINE 7 KLL": ["12708"],
    "LINE 6 ADI": ["50007", "12366", "50001"],
    "LINE 6 KLL": ["80002", "13526"],
    "NEW WASH HOUSE 2": ["32720"],
    "LINE 5 ADI": ["40182", "12252", "11540", "32718", "40190"],
    "LINE 5 KLL": [],
    "NEW WASH HOUSE 1": [],
    "LINE 4 ADI": ["50004", "12321", "36152", "36164", "36174"],
    "LINE 4 KLL": ["13454", "80001", "50000"],
    "LINE 3 ADI": ["12245", "11563", "12534", "13516"],
    "LINE 3 KLL": ["60503"],
    "OLD WASH HOUSE 2": ["60571", "40167"],
    "LINE 2 ADI": ["39512", "11125", "49321", "50006", "12413", "39524", "50025"],
    "LINE 2 KLL": ["36855"],
    "OLD WASH HOUSE 1": ["40178", "12364"],
    "LINE 1 ADI": [],
    "LINE 1 KLL": [],
    "LINE 0 ADI": ["22501", "28021", "37603", "30758"],
    "LINE 0 KLL": [],
    "E1 ADI": ["6531", "43969", "30502", "42086"],
    "E1 KLL": ["60531", "60517"],
    "E2 ADI": ["38651", "39377"],
    "E2 KLL": ["60592"]
};

async function main() {
    const plannedLocos = Object.values(positionPlan).flat();
    const duplicate = plannedLocos.find((loco, index) => plannedLocos.indexOf(loco) !== index);
    if (duplicate) throw new Error(`Duplicate loco in import plan: ${duplicate}`);
    if (Object.keys(positionPlan).length !== 26) throw new Error("Import plan must contain exactly 26 locations.");

    const { data: oldRecords, error: readError } = await db
        .from("loco_positions")
        .select("*")
        .order("updated_at", { ascending: false });
    if (readError) throw readError;

    const typeByLoco = new Map((oldRecords || []).map(item => [String(item.loco_no), item.loco_type || "-"]));
    const newRecords = Object.entries(positionPlan).flatMap(([position, locos]) =>
        locos.map(loco_no => ({
            loco_no,
            loco_type: typeByLoco.get(loco_no) || "-",
            status: "Stable",
            position,
            updated_by: "ADMIN ML"
        }))
    );

    const oldLocoNumbers = (oldRecords || []).map(item => item.loco_no);
    if (oldLocoNumbers.length) {
        const { error: deleteError } = await db.from("loco_positions").delete().in("loco_no", oldLocoNumbers);
        if (deleteError) throw deleteError;
    }

    const { error: insertError } = await db.from("loco_positions").insert(newRecords);
    if (insertError) {
        const restoreRecords = (oldRecords || []).map(({ id, ...record }) => record);
        const { error: restoreError } = restoreRecords.length
            ? await db.from("loco_positions").insert(restoreRecords)
            : { error: null };
        throw new Error(restoreError
            ? `New insert failed (${insertError.message}); rollback also failed (${restoreError.message}).`
            : `New insert failed; previous ${restoreRecords.length} records restored. ${insertError.message}`);
    }

    const { data: verification, error: verifyError } = await db
        .from("loco_positions")
        .select("loco_no,position")
        .order("updated_at", { ascending: false });
    if (verifyError) throw verifyError;

    const actual = verification || [];
    const mismatches = newRecords.filter(expected =>
        !actual.some(item => String(item.loco_no) === expected.loco_no && item.position === expected.position)
    );
    if (actual.length !== newRecords.length || mismatches.length) {
        throw new Error(`Verification failed: expected ${newRecords.length}, found ${actual.length}, mismatches ${mismatches.length}.`);
    }

    console.log(JSON.stringify({
        success: true,
        previous_records: (oldRecords || []).length,
        inserted_records: newRecords.length,
        locations: Object.keys(positionPlan).length,
        duplicate_locos: 0
    }, null, 2));
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
