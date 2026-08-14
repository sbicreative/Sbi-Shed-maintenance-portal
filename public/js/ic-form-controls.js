(function attachIcFormControls(globalObject) {
    const adverseValues = new Set([
        "Defect Found",
        "Not Done",
        "Not Working",
        "Leakage Found",
        "Missing",
        "No",
        "Abnormal"
    ]);

    function normalize(value) {
        return String(value || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function isIcSchedule(scheduleName) {
        return String(scheduleName || "")
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "") === "IC";
    }

    function isTypedSchedule(scheduleName) {
        const raw = String(scheduleName || "").trim();
        const normalized = raw
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");
        if (!normalized) return false;
        return normalized !== "ICO" &&
            !/commissioning/i.test(raw);
    }

    function classify(rowText, columnText) {
        const row = normalize(rowText);
        const column = normalize(columnText);

        if (/sign|remark|technician|name of tcn|attended by/.test(column)) {
            return { type: "text", kind: "remarks" };
        }

        if (
            /actual value|cab[- ]?1|cab[- ]?2|observed/.test(column) &&
            /(voltage|current|pressure|time|temperature|temp\.?|clearance|diameter|wear|thickness|force|air delivery|capacitance|resistance|energy|total km|millivolt|mv\b|amp\b|kg\/cm|mm\b|sec\b|ppm\b|rpm\b)/.test(row)
        ) {
            return { type: "value", kind: "measurement" };
        }

        if (/(voltage|current|pressure|time taken|temperature|clearance|diameter|thickness|force|air delivery|capacitance|resistance|energy consumed|energy regenerated|total km|millivolt|measure|record .*value|setting)/.test(row)) {
            return { type: "value", kind: "measurement" };
        }

        if (/yes\s*\/\s*no|yes or no/.test(row)) {
            return {
                type: "select",
                kind: "yes-no",
                options: ["Yes", "No", "N.A."]
            };
        }

        if (/available|availability|missing|all intact|present/.test(row)) {
            return {
                type: "select",
                kind: "availability",
                options: ["Available", "Missing", "N.A."]
            };
        }

        if (/leakage|leak proof|no leak/.test(row)) {
            return {
                type: "select",
                kind: "leakage",
                options: ["No Leakage", "Leakage Found", "N.A."]
            };
        }

        if (/working|functioning|operation|operate correctly|normal position/.test(row)) {
            return {
                type: "select",
                kind: "working",
                options: ["Working", "Not Working", "N.A."]
            };
        }

        if (/(clean|greas|lubricat|replace|renew|top up|refill|drain|tighten|calibrat|blow|change|remove|fit |provide|apply )/.test(row)) {
            return {
                type: "select",
                kind: "action",
                options: ["Done", "Not Done", "N.A."]
            };
        }

        return {
            type: "select",
            kind: "inspection",
            options: ["Checked OK", "Defect Found", "N.A."]
        };
    }

    function isAdverse(value) {
        return adverseValues.has(String(value || "").trim());
    }

    const api = {
        isIcSchedule,
        isTypedSchedule,
        classify,
        isAdverse
    };
    globalObject.IcFormControls = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
