const fs = require("fs");
const path = require("path");
const supabase = require("../config/supabase");

const sourceRoot = process.argv[2];
const confirmed = process.argv.includes("--confirm");
const bucket = "old-schedule-forms";

if (!sourceRoot || !fs.existsSync(sourceRoot)) {
    console.error("Usage: node scripts/import-old-schedule-forms.js <folder> [--confirm]");
    process.exit(1);
}

function walk(folder) {
    return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
        const fullPath = path.join(folder, entry.name);
        return entry.isDirectory() ? walk(fullPath) : [fullPath];
    });
}

function parseFile(filePath) {
    const relative = path.relative(sourceRoot, filePath);
    const parts = relative.split(path.sep);
    const department = /^electrical$/i.test(parts[0]) ? "Electrical" : "Mechanical";
    const locoNo = parts.find(part => /^\d{5}$/.test(part)) ||
        (path.basename(filePath).match(/\b\d{5}\b/) || [""])[0];
    const filename = path.basename(filePath);
    const dateMatch = filename.match(/(20\d{2})[._-](\d{2})[._-]+(\d{2})/);
    const scheduleDate = dateMatch
        ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
        : null;
    const normalized = filename.toUpperCase();
    const schedulePatterns = ["IC-UF", "IC-O", "IOH", "TOH", "TI", "IA", "IB", "IC"];
    const scheduleType = schedulePatterns.find(value =>
        new RegExp(`(^|[^A-Z])${value.replace("-", "[- ]")}([^A-Z]|$)`).test(normalized)
    ) || null;
    const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const storagePath = `${department.toLowerCase()}/${locoNo || "unknown"}/${safeName}`;

    return {
        filePath,
        loco_no: locoNo,
        department,
        schedule_date: scheduleDate,
        schedule_type: scheduleType,
        original_filename: filename,
        storage_path: storagePath,
        file_size_bytes: fs.statSync(filePath).size,
        remarks: /CHECKED?\s*POINT/i.test(filename) ? "TOH checked-point document" : null
    };
}

async function main() {
    const records = walk(sourceRoot)
        .filter(file => path.extname(file).toLowerCase() === ".pdf")
        .map(parseFile);

    const summary = records.reduce((result, record) => {
        result.total += 1;
        result.departments[record.department] = (result.departments[record.department] || 0) + 1;
        result.locos.add(record.loco_no);
        if (!record.schedule_date) result.missing_date += 1;
        if (!record.schedule_type) result.missing_schedule += 1;
        return result;
    }, { total: 0, departments: {}, locos: new Set(), missing_date: 0, missing_schedule: 0 });

    console.log(JSON.stringify({
        mode: confirmed ? "import" : "preview",
        total_files: summary.total,
        departments: summary.departments,
        locos: [...summary.locos].sort(),
        missing_date: summary.missing_date,
        missing_schedule: summary.missing_schedule
    }, null, 2));

    if (!confirmed) return;

    let imported = 0;
    for (const record of records) {
        const bytes = fs.readFileSync(record.filePath);
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(record.storage_path, bytes, {
                contentType: "application/pdf",
                upsert: true
            });
        if (uploadError) throw new Error(`${record.original_filename}: ${uploadError.message}`);

        const metadata = { ...record };
        delete metadata.filePath;
        const { error: metadataError } = await supabase
            .from("historical_schedule_records")
            .upsert(metadata, { onConflict: "storage_path" });
        if (metadataError) throw new Error(`${record.original_filename}: ${metadataError.message}`);

        imported += 1;
        console.log(`[${imported}/${records.length}] ${record.storage_path}`);
    }

    console.log(JSON.stringify({ success: true, imported }, null, 2));
}

main().catch(error => {
    console.error(error.message || error);
    process.exit(1);
});

