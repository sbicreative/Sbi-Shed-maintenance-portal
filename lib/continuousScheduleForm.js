function mergeLockedAnswers(existingAnswers, incomingAnswers, attributions, author) {
    const merged = { ...(existingAnswers || {}) };
    const nextAttributions = { ...(attributions || {}) };
    const now = author.timestamp || new Date().toISOString();

    for (const [key, rawValue] of Object.entries(incomingAnswers || {})) {
        const value = String(rawValue ?? "").trim();
        const locked = String(merged[key] ?? "").trim() && nextAttributions[key];
        if (locked) continue;
        if (!value) {
            if (!author.lock_new) merged[key] = "";
            continue;
        }
        merged[key] = value;
        if (author.lock_new) {
            nextAttributions[key] = {
                staff_id: Number(author.staff_id),
                staff_name: String(author.staff_name || "Staff"),
                entered_at: now
            };
        }
    }

    return { answers: merged, attributions: nextAttributions };
}

function completionState(answerKeys, answers) {
    const keys = [...new Set((answerKeys || []).filter(Boolean))];
    const filled = keys.filter(key => String(answers?.[key] ?? "").trim()).length;
    return { filled, total: keys.length, complete: keys.length > 0 && filled === keys.length };
}

module.exports = { mergeLockedAnswers, completionState };
