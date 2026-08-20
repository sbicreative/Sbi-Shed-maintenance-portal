const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const bilingual = require("../public/js/bilingual-schedule-activities");

const projectRoot = path.resolve(__dirname, "..");
const sourceRoots = [
    path.join(projectRoot, "Project Documents", "MASTER", "El schedule form"),
    path.join(projectRoot, "Project Documents", "MASTER", "ML schedule form")
];
const outputPath = path.join(
    projectRoot,
    "public",
    "js",
    "schedule-hindi-translations.js"
);

const actionPattern = /\b(check|chek|inspect|inspection|ensure|clean|replace|condition|working|leakage|fitment|operation|tightness|test|testing|measure|record|remove|refit|renew|examine|verify|lubricat|greas|drain|apply|provide|energize|take|feel|carry out|press|read off)\b/i;
const commonUppercaseWords = new Set([
    "CHECK", "CHEK", "CLEAN", "RECORD", "INSPECTION", "SYSTEM",
    "DETAIL", "WORK", "ITEMS", "FOLLOWING", "OPERATION", "CONDITION"
]);
const technicalNames = [
    "Trolex", "Siemens", "Cerberus", "Medha", "BHEL", "AAL",
    "Knorr", "Faiveley", "Schunk", "Stemmann", "WAG9", "WAP7"
];
const verifiedCorrections = new Map([
    [
        "Check the proper functioning of all the gauges of the driver desk BP: (i) Normal (ii) with 7.5 mm hole BP should not drop below 4 kg/cm 2 in 60 second. FP: (i) Normal (ii) with 5.5 mm hole FP should not drop below 4.5 kg/cm 2 in 60 second. MR: (i) Mainline MR leakage without application of SA-9 Direct Brake (ii) Mainline MR leakage with application of SA-9 Direct Brake",
        "ड्राइवर डेस्क के सभी गेजों की सही कार्यप्रणाली जाँचें। BP: (i) सामान्य स्थिति (ii) 7.5 mm छेद के साथ BP 60 सेकंड में 4 kg/cm 2 से नीचे नहीं गिरना चाहिए। FP: (i) सामान्य स्थिति (ii) 5.5 mm छेद के साथ FP 60 सेकंड में 4.5 kg/cm 2 से नीचे नहीं गिरना चाहिए। MR: (i) SA-9 Direct Brake लगाए बिना मेनलाइन MR रिसाव (ii) SA-9 Direct Brake लगाकर मेनलाइन MR रिसाव।"
    ]
]);

function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const fullPath = path.join(directory, entry.name);
        return entry.isDirectory() ? walk(fullPath) : [fullPath];
    });
}

function cleanHtmlText(value) {
    return String(value || "")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, " ")
        .trim();
}

function shouldTranslate(text) {
    if (!text || /[\u0900-\u097f]/.test(text) || !/[A-Za-z]{3}/.test(text)) {
        return false;
    }
    return Boolean(bilingual.translateActivity(text)) || actionPattern.test(text);
}

function protectTechnicalText(text) {
    const tokens = [];
    const technicalPattern = new RegExp(
        `\\b(?:${technicalNames.join("|")}|` +
        `\\d+(?:\\.\\d+)?\\s*(?:kg\\s*\\/\\s*cm\\s*(?:2|²)|m\\s*\\/\\s*s|kmph|kPa|bar|mm|cm|mV|kV|V|A|LPM|RPM)|` +
        `[A-Z]{2,}[A-Z0-9./&-]*|[A-Z]{1,4}-\\d+[A-Z0-9./-]*)\\b`,
        "g"
    );
    const protectedText = text.replace(
        technicalPattern,
        token => {
            if (commonUppercaseWords.has(token)) return token;
            const marker = `ZXQ${tokens.length}QXZ`;
            tokens.push(token);
            return marker;
        }
    );
    return { protectedText, tokens };
}

function restoreTechnicalText(text, tokens) {
    return tokens.reduce(
        (value, token, index) => value.replace(
            new RegExp(`ZXQ\\s*${index}\\s*QXZ`, "gi"),
            token
        ),
        text
    );
}

async function translate(text) {
    const { protectedText, tokens } = protectTechnicalText(text);
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "en");
    url.searchParams.set("tl", "hi");
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", protectedText);
    const response = await fetch(url, {
        headers: { "User-Agent": "SBI-Shed-Translation-Generator/1.0" }
    });
    if (!response.ok) {
        throw new Error(`Translation failed (${response.status}) for: ${text}`);
    }
    const payload = await response.json();
    const translated = (payload[0] || []).map(part => part[0] || "").join("");
    return restoreTechnicalText(translated, tokens).trim();
}

async function main() {
    const files = sourceRoots.flatMap(walk)
        .filter(file => /\.docx$/i.test(file) && !path.basename(file).startsWith("~$"));
    const instructions = new Set();

    for (const file of files) {
        const result = await mammoth.convertToHtml({ path: file });
        for (const match of result.value.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)) {
            const text = cleanHtmlText(match[1]);
            if (shouldTranslate(text)) instructions.add(text);
        }
    }

    const entries = [...instructions].sort((left, right) => left.localeCompare(right));
    const translations = {};
    let cursor = 0;
    const workers = Array.from({ length: 6 }, async () => {
        while (cursor < entries.length) {
            const index = cursor++;
            const english = entries[index];
            translations[english] = await translate(english);
            process.stdout.write(`\rTranslated ${index + 1}/${entries.length}`);
        }
    });
    await Promise.all(workers);
    for (const [english, hindi] of verifiedCorrections) {
        if (Object.prototype.hasOwnProperty.call(translations, english)) {
            translations[english] = hindi;
        }
    }

    const ordered = Object.fromEntries(entries.map(english => [english, translations[english]]));
    const source = `(function attachScheduleHindiTranslations(globalObject) {\n` +
        `    const translations = ${JSON.stringify(ordered, null, 4)};\n` +
        `    globalObject.ScheduleHindiTranslations = translations;\n` +
        `    if (typeof module !== "undefined" && module.exports) module.exports = translations;\n` +
        `})(typeof window !== "undefined" ? window : globalThis);\n`;
    fs.writeFileSync(outputPath, source, "utf8");
    process.stdout.write(`\nWrote ${entries.length} translations to ${outputPath}\n`);
}

main().catch(error => {
    console.error("\n" + error.message);
    process.exit(1);
});
