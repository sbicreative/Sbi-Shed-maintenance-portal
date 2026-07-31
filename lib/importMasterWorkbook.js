const xlsx = require("xlsx");
const supabase = require("../config/supabase");
const {
    cleanText,
    identityKey,
    normalizePfNumber
} = require("./masterIdentity");

const PF_HEADERS = new Set([
    "pf", "pfno", "pfnumber", "providentfundno", "providentfundnumber"
]);

function headerKey(value) {
    return cleanText(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findHeader(headers, candidates) {
    return headers.find(header => candidates.has(headerKey(header)));
}

function loadWorkbook(filePath, fields) {
    const workbook = xlsx.readFile(filePath, { raw: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "", raw: false });
    const headers = Object.keys(rows[0] || {});
    const pfHeader = findHeader(headers, PF_HEADERS);

    if (!pfHeader) {
        throw new Error(
            `${filePath}: PF Number column is required. Accepted headings: PF, PF No, PF Number.`
        );
    }

    return rows
        .map((row, index) => ({
            excelRow: index + 2,
            record: {
                ...Object.fromEntries(
                    Object.entries(fields).map(([target, source]) => [
                        target,
                        cleanText(row[source])
                    ])
                ),
                pf_no: normalizePfNumber(row[pfHeader])
            }
        }))
        .filter(({ record }) => record.name || record.pf_no);
}

function validateRows(rows, filePath) {
    const errors = [];
    const pfRows = new Map();

    for (const { excelRow, record } of rows) {
        if (!record.name) errors.push(`Row ${excelRow}: Name is blank.`);
        if (!record.department) errors.push(`Row ${excelRow}: Department is blank.`);
        if (!record.section) errors.push(`Row ${excelRow}: Section is blank.`);

        if (record.pf_no) {
            const seen = pfRows.get(record.pf_no) || [];
            seen.push(excelRow);
            pfRows.set(record.pf_no, seen);
        }
    }

    for (const [pfNo, excelRows] of pfRows) {
        if (excelRows.length > 1) {
            errors.push(`Duplicate PF ${pfNo} in rows ${excelRows.join(", ")}.`);
        }
    }

    if (errors.length) {
        throw new Error(`${filePath} validation failed:\n- ${errors.join("\n- ")}`);
    }
}

async function fetchRows(table) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw error;
    return data || [];
}

function buildPlan(sourceRows, currentRows) {
    const byPf = new Map();
    const byIdentity = new Map();

    for (const row of currentRows) {
        const pfNo = normalizePfNumber(row.pf_no);
        if (pfNo) {
            const list = byPf.get(pfNo) || [];
            list.push(row);
            byPf.set(pfNo, list);
        }

        const key = identityKey(row);
        const list = byIdentity.get(key) || [];
        list.push(row);
        byIdentity.set(key, list);
    }

    return sourceRows.map(item => {
        const pfMatches = byPf.get(item.record.pf_no) || [];
        if (pfMatches.length > 1) {
            throw new Error(`Database has duplicate PF ${item.record.pf_no}.`);
        }
        if (pfMatches.length === 1) {
            return { ...item, action: "update-by-pf", id: pfMatches[0].id };
        }

        const identityMatches = byIdentity.get(identityKey(item.record)) || [];
        if (identityMatches.length > 1) {
            throw new Error(
                `Row ${item.excelRow}: multiple legacy rows match name/department/section; PF ${item.record.pf_no} was not applied.`
            );
        }
        if (identityMatches.length === 1) {
            return { ...item, action: "backfill-pf", id: identityMatches[0].id };
        }

        return { ...item, action: "insert" };
    });
}

async function checkCrossMasterDuplicates(table, plan) {
    const otherTable = table === "employee_master"
        ? "supervisor_master"
        : "employee_master";
    const otherRows = await fetchRows(otherTable);
    const otherPfs = new Set(otherRows.map(row => normalizePfNumber(row.pf_no)).filter(Boolean));
    const collisions = plan.filter(item => otherPfs.has(item.record.pf_no));

    if (collisions.length) {
        throw new Error(
            `PF already exists in ${otherTable}: ${collisions.map(item => item.record.pf_no).join(", ")}`
        );
    }
}

async function applyPlan(table, plan) {
    for (const item of plan) {
        let query;
        if (item.action === "insert") {
            query = supabase.from(table).insert(item.record);
        } else {
            query = supabase.from(table).update(item.record).eq("id", item.id);
        }
        const { error } = await query;
        if (error) throw new Error(`Row ${item.excelRow}: ${error.message}`);
    }
}

async function importMasterWorkbook({ filePath, table, fields, apply = false }) {
    const sourceRows = loadWorkbook(filePath, fields);
    validateRows(sourceRows, filePath);
    const skippedRows = sourceRows.filter(item => !item.record.pf_no);
    const mappableRows = sourceRows.filter(item => item.record.pf_no);
    const currentRows = await fetchRows(table);
    const plan = buildPlan(mappableRows, currentRows);
    await checkCrossMasterDuplicates(table, plan);

    const summary = plan.reduce((result, item) => {
        result[item.action] = (result[item.action] || 0) + 1;
        return result;
    }, {
        total: sourceRows.length,
        mapped: plan.length,
        skippedBlankPf: skippedRows.length
    });

    console.log(JSON.stringify({ table, filePath, mode: apply ? "apply" : "dry-run", summary }, null, 2));
    if (skippedRows.length) {
        console.log(
            `Skipped blank PF rows: ${skippedRows.map(item => item.excelRow).join(", ")}`
        );
    }

    if (!apply) {
        console.log("No database changes made. Re-run with --apply after reviewing the audit.");
        return summary;
    }

    await applyPlan(table, plan);
    console.log(`Import completed without deleting existing ${table} rows.`);
    return summary;
}

module.exports = {
    buildPlan,
    importMasterWorkbook,
    loadWorkbook,
    validateRows
};
