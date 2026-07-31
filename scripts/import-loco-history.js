const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const sourcePath = process.argv[2];
if (!sourcePath) {
    throw new Error("Usage: node scripts/import-loco-history.js <workbook.xlsx>");
}

const workbook = XLSX.readFile(sourcePath, { cellDates: false });
const sheetConfig = [
    { name: "wag9hc", expectedType: null },
    { name: "wagp7", expectedType: "WAP7" }
];

function pad(value) {
    return String(value).padStart(2, "0");
}

function localDateTime(value) {
    if (typeof value !== "number") return null;
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}T${pad(parsed.H)}:${pad(parsed.M)}:${pad(Math.round(parsed.S))}`;
}

function text(value) {
    if (value === null || value === undefined || value === "") return null;
    return String(value).trim() || null;
}

const records = [];
for (const config of sheetConfig) {
    const sheet = workbook.Sheets[config.name];
    if (!sheet) throw new Error(`Required sheet not found: ${config.name}`);
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
    for (let index = 1; index < rows.length; index += 1) {
        const row = rows[index];
        if (!row || row.every(value => value === null || value === "")) continue;
        const locoNo = text(row[0]);
        const locoType = text(row[1]);
        const schedule = text(row[3]);
        const shedArrival = localDateTime(row[4]);
        const shedRelease = localDateTime(row[5]);
        if (!locoNo || !locoType || !schedule || !shedArrival || !shedRelease) {
            throw new Error(`Required history value missing in ${config.name} row ${index + 1}`);
        }
        if (config.expectedType && locoType !== config.expectedType) {
            throw new Error(`Unexpected type ${locoType} in ${config.name} row ${index + 1}`);
        }

        const isConfirmed30502Ib =
            locoNo === "30502" && schedule === "IB" && shedRelease.startsWith("2026-04-22");

        records.push({
            id: records.length + 1,
            locoNo,
            locoType,
            arrivedAs: text(row[2]),
            schedule,
            shedArrival,
            scheduleCompletion: isConfirmed30502Ib ? "2026-04-16T00:00:00" : null,
            shedRelease,
            month: localDateTime(row[7]),
            shedOutTrainNo: text(row[9]),
            remarks: text(row[10]),
            source: { sheet: config.name, row: index + 1 },
            documents: isConfirmed30502Ib
                ? [
                    { department: "Electrical", label: "IB Electrical - 24 pages", url: "/uploads/30502/30502-IB-2026-04-16-electrical.pdf" },
                    { department: "Mechanical", label: "IB Mechanical - 18 pages", url: "/uploads/30502/30502-IB-2026-04-16-mechanical.pdf" }
                ]
                : []
        });
    }
}

records.push({
    id: records.length + 1,
    locoNo: "30502",
    locoType: "WAP7",
    arrivedAs: null,
    schedule: "Commissioning (IC-O)",
    shedArrival: null,
    scheduleCompletion: "2026-01-20T00:00:00",
    shedRelease: null,
    month: "2026-01-01T00:00:00",
    shedOutTrainNo: null,
    remarks: null,
    source: { sheet: null, row: null },
    documents: [
        { department: "Commissioning", label: "IC-O Commissioning - 43 pages", url: "/uploads/30502/30502-commissioning-IC-O-2026-01-20.pdf" }
    ]
});

const outputDir = path.join(__dirname, "..", "data");
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, "loco-history.json");
fs.writeFileSync(outputPath, `${JSON.stringify({ importedAt: new Date().toISOString(), sourceFile: path.basename(sourcePath), records }, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, recordCount: records.length }, null, 2));
