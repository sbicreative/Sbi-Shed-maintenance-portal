function cleanText(value) {
    return String(value ?? "").trim();
}

function normalizePfNumber(value) {
    const raw = cleanText(value).toUpperCase();

    if (!raw) return "";

    const withoutExcelDecimal = /^\d+\.0+$/.test(raw)
        ? raw.replace(/\.0+$/, "")
        : raw;

    return withoutExcelDecimal.replace(/[^A-Z0-9]/g, "");
}

function normalizeMobileNumber(value) {
    const digits = cleanText(value).replace(/\D/g, "");

    if (digits.length <= 10) return digits;

    return digits.slice(-10);
}

function normalizeName(value) {
    return cleanText(value)
        .toLowerCase()
        .replace(/\b(?:shri|sh|mr|ms|mrs)\.?\b/g, "")
        .replace(/\b(?:in[\s-]*charge|supervisor)\b/g, "")
        .replace(/[^a-z0-9]/g, "");
}

function normalizeText(value) {
    return cleanText(value).toLowerCase();
}

function identityKey(record) {
    return [
        normalizeName(record.name),
        normalizeText(record.department),
        normalizeText(record.section)
    ].join("|");
}

module.exports = {
    cleanText,
    identityKey,
    normalizeMobileNumber,
    normalizeName,
    normalizePfNumber,
    normalizeText
};
