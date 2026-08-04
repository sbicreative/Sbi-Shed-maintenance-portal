const supabase = require("../config/supabase");

const resetDate = process.argv[2];
const confirmed = process.argv.includes("--confirm");

if (!/^\d{4}-\d{2}-\d{2}$/.test(resetDate || "")) {
    console.error("Usage: node scripts/reset-daily-demo-data.js YYYY-MM-DD [--confirm]");
    process.exit(1);
}

async function selectIds(table, column, values) {
    if (!values.length) return [];
    const { data, error } = await supabase.from(table).select("id").in(column, values);
    if (error) throw error;
    return (data || []).map(row => row.id);
}

async function removeByIds(table, ids) {
    if (!ids.length) return;
    const { error } = await supabase.from(table).delete().in("id", ids);
    if (error) throw error;
}

async function main() {
    const { data: headers, error: headerError } = await supabase
        .from("assign_work_header")
        .select("id")
        .eq("assign_date", resetDate);
    if (headerError) throw headerError;

    const headerIds = (headers || []).map(row => row.id);
    const detailIds = await selectIds("assign_work_details", "assign_header_id", headerIds);
    const distributionIds = await selectIds(
        "manpower_distribution",
        "assign_work_detail_id",
        detailIds
    );
    const formIds = await selectIds(
        "schedule_form_details",
        "manpower_distribution_id",
        distributionIds
    );

    const summary = {
        reset_date: resetDate,
        assign_work_headers: headerIds.length,
        assign_work_details: detailIds.length,
        manpower_distributions: distributionIds.length,
        schedule_form_details: formIds.length
    };
    console.log(JSON.stringify({ mode: confirmed ? "reset" : "preview", ...summary }, null, 2));

    if (!confirmed) return;

    await removeByIds("schedule_form_details", formIds);
    await removeByIds("manpower_distribution", distributionIds);
    await removeByIds("assign_work_details", detailIds);
    await removeByIds("assign_work_header", headerIds);

    const { count, error: verifyError } = await supabase
        .from("assign_work_header")
        .select("id", { count: "exact", head: true })
        .eq("assign_date", resetDate);
    if (verifyError) throw verifyError;

    console.log(JSON.stringify({ success: true, remaining_assign_work_headers: count }, null, 2));
}

main().catch(error => {
    console.error(error.message || error);
    process.exit(1);
});
