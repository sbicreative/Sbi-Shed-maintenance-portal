(function attachBilingualScheduleActivities(globalObject) {
    const activityPattern = /^(?:check(?:ing)?|inspect|examine|ensure|verify|test|clean|measure|record|replace|renew|grease|lubricate|tighten|remove|refit|fit|provide|apply|drain|refill|top\s*up|match|working|condition|status|operation)\b/i;

    function clean(value) {
        return String(value || "")
            .replace(/&amp;/g, "&")
            .replace(/\s+/g, " ")
            .trim();
    }

    function finish(subject, instruction) {
        const value = clean(subject).replace(/[.:;]+$/, "");
        return value ? `${value} ${instruction}` : "";
    }

    function translateActivity(value) {
        const text = clean(value);
        if (!text || /[\u0900-\u097f]/.test(text)) return "";

        const rules = [
            [/^check\s+and\s+ensure\s+(?:the\s+)?proper\s+functioning\s+of\s+(.+)$/i,
                match => finish(match[1], "की सही कार्यशीलता की जाँच करके सुनिश्चित करें।")],
            [/^check(?:ing)?\s+(?:the\s+)?working\s+of\s+(.+)$/i,
                match => finish(match[1], "की कार्यशीलता जाँचें।")],
            [/^working\s+(?:in|of)\s+(.+)$/i,
                match => finish(match[1], "की कार्यशीलता जाँचें।")],
            [/^(?:condition|status)\s+of\s+(.+)$/i,
                match => finish(match[1], "की स्थिति जाँचें।")],
            [/^check(?:ing)?\s+(.+?)\s+for\s+(.+)$/i,
                match => `${clean(match[1])} में ${clean(match[2])} की जाँच करें।`],
            [/^check(?:ing)?\s+(.+)$/i,
                match => finish(match[1], "की जाँच करें।")],
            [/^(?:visually\s+)?(?:inspect|examine)\s+(.+)$/i,
                match => finish(match[1], "का निरीक्षण करें।")],
            [/^ensure\s+(.+)$/i,
                match => finish(match[1], "सुनिश्चित करें।")],
            [/^verify\s+(.+)$/i,
                match => finish(match[1], "का सत्यापन करें।")],
            [/^test\s+(.+)$/i,
                match => finish(match[1], "का परीक्षण करें।")],
            [/^clean\s+(.+)$/i,
                match => finish(match[1], "को साफ करें।")],
            [/^measure\s+(.+)$/i,
                match => finish(match[1], "मापें।")],
            [/^record\s+(.+)$/i,
                match => finish(match[1], "दर्ज करें।")],
            [/^(?:replace|renew)\s+(.+)$/i,
                match => finish(match[1], "बदलें।")],
            [/^(?:grease|lubricate)\s+(.+)$/i,
                match => finish(match[1], "में lubrication करें।")],
            [/^tighten\s+(.+)$/i,
                match => finish(match[1], "को कसें।")],
            [/^remove\s+(.+)$/i,
                match => finish(match[1], "हटाएँ।")],
            [/^(?:refit|fit)\s+(.+)$/i,
                match => finish(match[1], "को सही प्रकार से लगाएँ।")],
            [/^provide\s+(.+)$/i,
                match => finish(match[1], "उपलब्ध कराएँ।")],
            [/^apply\s+(.+)$/i,
                match => finish(match[1], "लगाएँ।")],
            [/^drain\s+(.+)$/i,
                match => finish(match[1], "निकालें।")],
            [/^(?:refill|top\s*up)\s+(.+)$/i,
                match => finish(match[1], "को निर्धारित स्तर तक भरें।")],
            [/^match\s+(.+)$/i,
                match => finish(match[1], "का मिलान करें।")],
            [/^operation\s+of\s+(.+)$/i,
                match => finish(match[1], "का संचालन जाँचें।")]
        ];

        for (const [pattern, formatter] of rules) {
            const match = text.match(pattern);
            if (match) return formatter(match);
        }
        return "";
    }

    function enhance(container) {
        if (!container) return 0;
        let count = 0;
        container.querySelectorAll("td, th").forEach(cell => {
            if (cell.dataset.hindiActivity === "true") return;
            if (cell.querySelector("input, select, textarea")) return;
            const english = clean(cell.textContent);
            if (!activityPattern.test(english)) return;
            const hindi = translateActivity(english);
            if (!hindi) return;

            const line = document.createElement("div");
            line.className = "schedule-activity-hindi";
            line.lang = "hi";
            line.textContent = hindi;
            cell.appendChild(line);
            cell.dataset.hindiActivity = "true";
            count += 1;
        });
        return count;
    }

    const api = { translateActivity, enhance };
    globalObject.BilingualScheduleActivities = api;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
