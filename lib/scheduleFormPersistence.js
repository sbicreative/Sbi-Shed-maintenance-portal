const ARCHIVE_BUCKET = "approved-schedule-forms";

async function supportsSplitStorage(db) {
    const { error } = await db.from('schedule_form_details')
        .select('field_metadata,archive_storage_path,archive_format,archived_at').limit(0);
    if (!error) return true;
    if (['42703', 'PGRST204'].includes(error.code)) return false;
    throw error;
}

const adversePattern = /(?:not\s*ok|not\s*working|defect|missing|out[ -]?of[ -]?range|different|abnormal|failed?|leak(?:age)?|damaged?|broken|loose|short|open circuit)/i;
const routinePositivePattern = /^(?:checked\s*ok|ok|working|found\s*ok|normal|available|provided|yes|on|off|na|n\/a)$/i;
const searchableKindPattern = /^(?:measurement|value|numeric|number|reading)$/i;
const actionKindPattern = /^(?:action-taken|action_taken|action)$/i;
const remarksKindPattern = /^(?:remarks?|tcn|staff-remarks)$/i;

function clean(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
}

function numericValue(value) {
    const text = clean(value).replace(/,/g, "");
    if (!text || !/[-+]?\d/.test(text)) return null;
    const match = text.match(/[-+]?(?:\d+(?:\.\d+)?|\.\d+)/);
    return match ? Number(match[0]) : null;
}

function normalizedMetadata(fieldMetadata) {
    if (!fieldMetadata || typeof fieldMetadata !== "object" || Array.isArray(fieldMetadata)) return {};
    return Object.fromEntries(Object.entries(fieldMetadata).map(([key, value]) => [
        String(key),
        value && typeof value === "object" && !Array.isArray(value) ? value : {}
    ]));
}

function retentionReason(value, metadata = {}) {
    const text = clean(value);
    if (!text) return null;
    const kind = clean(metadata.kind || metadata.field_kind).toLowerCase();
    const label = clean(metadata.label || metadata.parameter_name);
    const validationState = clean(metadata.validation_state).toLowerCase();
    const number = numericValue(text);

    if (actionKindPattern.test(kind) || /action taken|की गई कार्रवाई/i.test(label)) return "action_taken";
    if (remarksKindPattern.test(kind) || /remarks?|tcn|टिप्पणी|तकनीशियन/i.test(label)) return "remarks";
    if (searchableKindPattern.test(kind) || metadata.is_measurement === true) return "measurement";
    if (number !== null && (metadata.standard_value || metadata.min_value != null || metadata.max_value != null)) return "measurement";
    if (validationState === "invalid" || validationState === "out-of-range") return "exception";
    if (adversePattern.test(text)) return "exception";
    if (metadata.expected_value && clean(metadata.expected_value).toLowerCase() !== text.toLowerCase()) return "exception";
    if (routinePositivePattern.test(text)) return null;
    return metadata.searchable === true ? "important_value" : null;
}

function splitScheduleAnswers(formAnswers, fieldMetadata) {
    const answers = formAnswers && typeof formAnswers === "object" && !Array.isArray(formAnswers)
        ? formAnswers
        : {};
    const metadataByKey = normalizedMetadata(fieldMetadata);
    const structuredAnswers = {};
    const records = [];

    Object.entries(answers).forEach(([answerKey, rawValue]) => {
        const value = clean(rawValue);
        const metadata = metadataByKey[answerKey] || {};
        const reason = retentionReason(value, metadata);
        if (!reason) return;
        structuredAnswers[answerKey] = rawValue;
        records.push({
            answer_key: answerKey,
            parameter_name: clean(metadata.label) || answerKey,
            section_name: clean(metadata.section) || null,
            field_kind: clean(metadata.kind || metadata.field_kind) || "text",
            retention_reason: reason,
            text_value: value,
            numeric_value: numericValue(value),
            unit: clean(metadata.unit) || null,
            standard_value: clean(metadata.standard_value) || null,
            validation_state: clean(metadata.validation_state) || null,
            metadata
        });
    });

    return { structuredAnswers, records };
}

function archivePath(formId) {
    return `approved/${Number(formId)}/schedule-form.json`;
}

module.exports = {
    supportsSplitStorage,
    ARCHIVE_BUCKET,
    archivePath,
    numericValue,
    retentionReason,
    splitScheduleAnswers
};
