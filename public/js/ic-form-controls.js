(function attachIcFormControls(globalObject) {
    const adverseValues = new Set([
        "Defect Found",
        "Not Done",
        "Not Working",
        "Leakage Found",
        "Missing",
        "No",
        "Abnormal",
        "Not OK",
        "Not Ok",
        "NOT OK"
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
        const result = String(value || "").trim();
        return adverseValues.has(result) || /^not\s+ok$/i.test(result);
    }

    function assessMeasurement(actualValue, standardValue) {
        const actual = Number(String(actualValue || "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/)?.[0]);
        if (!Number.isFinite(actual)) return null;
        const standard = String(standardValue || "")
            .replace(/,/g, "")
            .replace(/[–—]/g, "-")
            .replace(/(\d)\s*-\s*(\d)/g, "$1 to $2")
            .replace(/≤/g, "<=")
            .replace(/≥/g, ">=")
            .trim();
        const numbers = [...standard.matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
        if (!numbers.length) return null;
        const tolerance = standard.match(/(-?\d+(?:\.\d+)?)\s*(?:±|\+\/-)\s*(\d+(?:\.\d+)?)/);
        if (tolerance) return Math.abs(actual - Number(tolerance[1])) <= Number(tolerance[2]);
        if (/\b(?:between|from)\b/i.test(standard) || /\d\s*(?:-|to)\s*-?\d/i.test(standard)) {
            const low = Math.min(numbers[0], numbers[1]);
            const high = Math.max(numbers[0], numbers[1]);
            return actual >= low && actual <= high;
        }
        if (/<=|less than|not more than|maximum|max\.?\b/i.test(standard)) return actual <= numbers[0];
        if (/<|below/i.test(standard)) return actual < numbers[0];
        if (/>=|at least|not less than|minimum|min\.?\b/i.test(standard)) return actual >= numbers[0];
        if (/>|above|more than/i.test(standard)) return actual > numbers[0];
        return Math.abs(actual - numbers[0]) < 1e-9;
    }

    const api = {
        isIcSchedule,
        isTypedSchedule,
        classify,
        isAdverse,
        assessMeasurement
    };
    globalObject.IcFormControls = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
