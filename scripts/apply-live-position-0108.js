const { createClient } = require("@supabase/supabase-js");

const db = createClient(
    "https://cgbnuyltwqdazyejottk.supabase.co",
    "sb_publishable_QA6Obxmmpy7GT9NOWtwHIQ_yNs91LID"
);

const positionPlan = {
    "LINE 8 ADI": ["40258", "13462", "13292", "40177", "40322", "40323"],
    "LINE 8 KLL": ["12374"],
    "LINE 7 ADI": ["50002", "11131", "12344", "40420"],
    "LINE 7 KLL": ["12708"],
    "LINE 6 ADI": ["50001", "12366", "50007"],
    "LINE 6 KLL": ["80002", "13526"],
    "NEW WASH HOUSE 2": ["32720"],
    "LINE 5 ADI": ["12252", "40182", "40190", "32718", "11540"],
    "LINE 5 KLL": [],
    "NEW WASH HOUSE 1": [],
    "LINE 4 ADI": ["12321", "50004", "36174", "36164", "36152"],
    "LINE 4 KLL": ["13454", "80001", "80000"],
    "LINE 3 ADI": ["13516", "12534", "11563"],
    "LINE 3 KLL": [],
    "OLD WASH HOUSE 2": ["12364", "60534", "12245"],
    "LINE 2 ADI": ["50006", "40324", "40167", "50005", "39561", "12413"],
    "LINE 2 KLL": ["38855"],
    "OLD WASH HOUSE 1": ["39564", "40178"],
    "LINE 1 ADI": [],
    "LINE 1 KLL": ["12230"],
    "LINE 0 ADI": ["42086", "30502", "27021", "22561"],
    "LINE 0 KLL": [],
    "E1 ADI": ["37889", "39420", "60531"],
    "E1 KLL": ["60503"],
    "E2 ADI": ["30083", "11125", "43567"],
    "E2 KLL": ["60592", "60517"]
};

async function main() {
    const plannedLocos = Object.values(positionPlan).flat();
    const duplicate = plannedLocos.find(
        (loco, index) => plannedLocos.indexOf(loco) !== index
    );
    if (duplicate) {
        throw new Error(`Duplicate loco in import plan: ${duplicate}`);
    }
    if (Object.keys(positionPlan).length !== 26) {
        throw new Error("Import plan must contain exactly 26 locations.");
    }

    const { data: oldRecords, error: readError } = await db
        .from("loco_positions")
        .select("*")
        .order("updated_at", { ascending: false });
    if (readError) throw readError;

    const typeByLoco = new Map(
        (oldRecords || []).map(item => [
            String(item.loco_no),
            item.loco_type || "-"
        ])
    );
    const statusByLoco = new Map(
        (oldRecords || []).map(item => [
            String(item.loco_no),
            item.status || "Stable"
        ])
    );
    const newRecords = Object.entries(positionPlan).flatMap(
        ([position, locos]) => locos.map(loco_no => ({
            loco_no,
            loco_type: typeByLoco.get(loco_no) || "-",
            status: statusByLoco.get(loco_no) || "Stable",
            position,
            updated_by: "ADMIN ML - 01/08 photo"
        }))
    );

    const oldLocoNumbers = (oldRecords || []).map(item => item.loco_no);
    if (oldLocoNumbers.length) {
        const { error: deleteError } = await db
            .from("loco_positions")
            .delete()
            .in("loco_no", oldLocoNumbers);
        if (deleteError) throw deleteError;
    }

    const { error: insertError } = await db
        .from("loco_positions")
        .insert(newRecords);
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
        .order("id");
    if (verifyError) throw verifyError;

    const actual = verification || [];
    const mismatches = newRecords.filter(expected =>
        !actual.some(item =>
            String(item.loco_no) === expected.loco_no &&
            item.position === expected.position
        )
    );
    if (actual.length !== newRecords.length || mismatches.length) {
        throw new Error(
            `Verification failed: expected ${newRecords.length}, found ${actual.length}, mismatches ${mismatches.length}.`
        );
    }

    console.log(JSON.stringify({
        success: true,
        previous_records: (oldRecords || []).length,
        inserted_records: newRecords.length,
        locations: Object.keys(positionPlan).length,
        duplicate_locos: 0,
        mismatches: 0
    }, null, 2));
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
