// Keep template coordinates aligned with schedule-form.js before reading saved answer keys.
(function (root) {
function annotateLogicalColumns(table) {
    const occupied = [];
    let width = 0;
    [...table.rows].forEach(row => {
        let column = 0;
        [...row.cells].forEach(cell => {
            while (occupied[column] > 0) column += 1;
            const span = Number(cell.colSpan) || 1;
            const rowSpan = Number(cell.rowSpan) || 1;
            cell.dataset.logicalColumn = String(column);
            if (rowSpan > 1) {
                for (let index = column; index < column + span; index += 1) {
                    occupied[index] = Math.max(occupied[index] || 0, rowSpan);
                }
            }
            column += span;
            width = Math.max(width, column);
        });
        for (let index = 0; index < occupied.length; index += 1) {
            occupied[index] = Math.max(0, (occupied[index] || 0) - 1);
        }
    });
    return width;
}

function removeSignatureRemarksColumns(container) {
    const signatureRemarksPattern =
        /(?:signature|sign|हस्ताक्षर)\s*(?:\/|&|and)?\s*(?:remarks?|टिप्पणी)/i;

    container.querySelectorAll("table").forEach(table => {
        const occupiedColumns = [];
        const layout = [...table.rows].map(row => {
            const mappedCells = [];
            let logicalColumn = 0;

            [...row.cells].forEach(cell => {
                while (occupiedColumns[logicalColumn] > 0) {
                    logicalColumn += 1;
                }

                const columnSpan = Number(cell.colSpan) || 1;
                const rowSpan = Number(cell.rowSpan) || 1;
                const start = logicalColumn;
                const end = start + columnSpan;

                mappedCells.push({ cell, start, end });

                if (rowSpan > 1) {
                    for (let column = start; column < end; column += 1) {
                        occupiedColumns[column] = Math.max(
                            occupiedColumns[column] || 0,
                            rowSpan
                        );
                    }
                }
                logicalColumn = end;
            });

            for (
                let column = 0;
                column < occupiedColumns.length;
                column += 1
            ) {
                occupiedColumns[column] = Math.max(
                    0,
                    (occupiedColumns[column] || 0) - 1
                );
            }

            return mappedCells;
        });

        let targetColumn = null;
        layout.some(rowCells =>
            rowCells.some(({ cell, start }) => {
                const label =
                    cell.textContent.replace(/\s+/g, " ").trim();
                if (!signatureRemarksPattern.test(label)) return false;
                targetColumn = start;
                return true;
            })
        );

        if (targetColumn === null) {
            const logicalWidth = Math.max(0, ...layout.flatMap(rowCells => rowCells.map(({ end }) => end)));
            const structuredWorkTable = layout.some(rowCells => {
                const serial = rowCells.find(({ start }) => start === 0)?.cell.textContent.replace(/\s+/g, " ").trim();
                const detail = rowCells.find(({ start }) => start === 1)?.cell.textContent.replace(/\s+/g, " ").trim();
                return /^(?:[A-J]|\d+)$/.test(serial || "") && String(detail || "").length > 8;
            });
            if (logicalWidth >= 5 && structuredWorkTable) targetColumn = 4;
        }

        if (targetColumn === null) return;

        layout.forEach(rowCells => {
            const mapped = rowCells.find(
                ({ start, end }) =>
                    targetColumn >= start && targetColumn < end
            );
            if (!mapped) return;

            const span = Number(mapped.cell.colSpan) || 1;
            if (span > 1) {
                mapped.cell.colSpan = span - 1;
            } else {
                mapped.cell.remove();
            }
        });
    });
}

function removeRepetitiveJeSignatureRows(container) {
    container.querySelectorAll("tr,p").forEach(element => {
        const text = element.textContent.replace(/\s+/g, " ").trim();
        if (
            text.length < 120 &&
            /(?:जू\.?\s*इंजी|जे\/एसएसई|JE\/SSE).*(?:हस्ताक्षर|signature)|(?:हस्ताक्षर|signature).*(?:जू\.?\s*इंजी|जे\/एसएसई|JE\/SSE)/i.test(text)
        ) element.remove();
    });
}

function removeScheduleSignatureRows(container) {
    container.querySelectorAll("tr").forEach(row => {
        const labels = [...row.cells]
            .map(cell => cell.textContent.replace(/\s+/g, " ").trim())
            .filter(Boolean);
        if (labels.length === 1 && /^(?:signature|हस्ताक्षर)$/i.test(labels[0])) row.remove();
    });
}

const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();

function fieldRole(text) {
    const label = clean(text).toLowerCase();
    if (/standard|specified|std\b|range|limit/.test(label)) return 'standard';
    if (/action taken|कार्रवाई|कार्यवाही/.test(label)) return 'action';
    if (/staff|tcn|technician|name|signature/.test(label)) return 'staff';
    if (/\bg\.?\s*i\b|incoming|initial/.test(label)) return 'gi';
    if (/final|outgoing|out going/.test(label)) return 'final';
    if (/actual|observed|reading|value|cab[- ]?\d/.test(label)) return 'value';
    if (/status|condition/.test(label)) return 'status';
    return '';
}

function parseTemplate(html) {
    const container = new DOMParser().parseFromString(html, 'text/html').body;
    // This document stays detached: no template markup is inserted into the viewer.
    container.querySelectorAll('script,iframe,object,embed,style,img').forEach(node => node.remove());
    removeRepetitiveJeSignatureRows(container);
    removeScheduleSignatureRows(container);
    removeSignatureRemarksColumns(container);
    const parameters = [];
    container.querySelectorAll('table').forEach((table, ti) => {
        annotateLogicalColumns(table);
        const tableRows = [...table.rows];
        const giRows = tableRows.map((row, index) => ({ row, index,
            role: fieldRole(clean(row.cells[0]?.textContent))
        })).filter(item => ['gi', 'final'].includes(item.role) && item.row.cells.length > 1);
        // Mechanical inspection forms place parameters in columns and GI/Final in rows.
        if (giRows.length) {
            const firstReading = giRows[0].index;
            const byColumn = new Map();
            tableRows.slice(0, firstReading).forEach(row => [...row.cells].forEach(cell => {
                const text = clean(cell.textContent);
                const start = Number(cell.dataset.logicalColumn);
                if (!text || start === 0) return;
                for (let col = start; col < start + (cell.colSpan || 1); col++) {
                    if (!byColumn.has(col)) byColumn.set(col, []);
                    byColumn.get(col).push(text);
                }
            }));
            const grouped = new Map();
            giRows.forEach(({ row, index: ri, role }) => [...row.cells].forEach((cell, ci) => {
                const col = Number(cell.dataset.logicalColumn);
                if (!col || clean(cell.textContent)) return;
                const context = byColumn.get(col) || [];
                if (!context.length) return;
                const standardIndex = context.findIndex((text, index) => index > 0 &&
                    (/\d/.test(text) && !/^(?:cab|comp|lp|alp)[- ]?\d?$/i.test(text) || /^std\b/i.test(text)));
                const labelParts = standardIndex < 0 ? context.slice(0, 1) : context.slice(0, standardIndex);
                const parameter = labelParts.join(' / ');
                const standard = standardIndex < 0 ? context.slice(1).join(' / ') : context[standardIndex];
                const detail = standardIndex < 0 ? '' : context.slice(standardIndex + 1).join(' / ');
                const groupKey = `${parameter}|${detail}|${col}`;
                if (!grouped.has(groupKey)) grouped.set(groupKey, { parameter, section: detail,
                    standard, fields: [] });
                grouped.get(groupKey).fields.push({ key: cell.dataset.answerKey || `t${ti}_r${ri}_c${ci}`,
                    role, label: role === 'gi' ? 'GI' : 'Final' });
            }));
            parameters.push(...grouped.values());
            return;
        }
        const headers = new Map();
        let section = '';
        [...table.rows].forEach((row, ri) => {
            const cells = [...row.cells];
            const texts = cells.map(cell => clean(cell.textContent));
            const populated = texts.filter(Boolean);
            if (populated.length === 1 && cells.length === 1) { section = populated[0]; return; }
            const isHeader = texts.some(text => /^(?:description|parameter|particular|detail of work|work item|items to check|standard|std\b)/i.test(text)) &&
                texts.some(text => fieldRole(text));
            const subHeader = populated.length > 0 && populated.every(text => fieldRole(text) || /^(?:sr\.?|s\.?n\.?|no\.?|cab[- ]?\d)$/i.test(text));
            if (isHeader || subHeader) {
                cells.forEach((cell, ci) => {
                    if (!texts[ci]) return;
                    const start = Number(cell.dataset.logicalColumn);
                    for (let col = start; col < start + (cell.colSpan || 1); col++) {
                        headers.set(col, { role: fieldRole(texts[ci]), label: texts[ci] });
                    }
                });
                return;
            }
            const labelIndex = texts.findIndex((text, ci) => text.length > 2 &&
                !/^\d+[.)]?$/.test(text) && !headers.get(Number(cells[ci].dataset.logicalColumn))?.role);
            if (labelIndex < 0) return;
            const parameter = texts[labelIndex];
            const fields = [];
            let standard = '';
            cells.forEach((cell, ci) => {
                if (ci <= labelIndex) return;
                const header = headers.get(Number(cell.dataset.logicalColumn)) || {};
                if (header.role === 'standard') { standard = texts[ci]; return; }
                if (texts[ci] || cell.dataset.attributionFor) return;
                fields.push({ key: cell.dataset.answerKey || `t${ti}_r${ri}_c${ci}`,
                    role: header.role || 'value', label: header.label || 'Value' });
            });
            if (fields.length) parameters.push({ parameter, section, standard, fields });
        });
    });
    return parameters;
}

function buildRows(record, parameters, controls) {
    const rows = [];
    for (const parameter of parameters) {
        const values = parameter.fields.map(field => ({ ...field, value: clean(record.answers[field.key]) }));
        if (!values.some(field => field.value)) continue;
        const join = role => values.filter(field => field.role === role && field.value)
            .map(field => field.value).join(' / ');
        const readings = values.filter(field => ['gi', 'final', 'value', 'status'].includes(field.role) && field.value);
        const statuses = readings.map(field => {
            if (controls.isAdverse(field.value)) return `${field.label}: Not OK`;
            if (/^(?:working|normal|ok|checked \/ found ok|available|done|no leakage|yes)$/i.test(field.value)) return `${field.label}: OK`;
            if (/^n\.?a\.?$/i.test(field.value)) return `${field.label}: N.A.`;
            // Ambiguous printed tolerances (e.g. "8.5+ 0.25") must not be guessed.
            const unambiguous = !/\d\s*\+\s*\d/.test(parameter.standard) &&
                !/\d(?:\.\d+)?\s+\d(?:\.\d+)?/.test(parameter.standard);
            const assessment = parameter.standard && unambiguous ? controls.assessMeasurement(field.value, parameter.standard) : null;
            if (assessment !== null) return `${field.label}: ${assessment ? 'Within range' : 'Out of range'}`;
            return `${field.label}: ${field.role === 'status' ? field.value : 'Not assessed'}`;
        });
        const actions = [...new Set([
            join('action'), ...values.map(field => clean(record.answers[`${field.key}__action_taken`]))
        ].filter(Boolean))];
        const staff = [...new Set(values.filter(field => field.value).map(field =>
            record.attributions[field.key]?.staff_name).filter(Boolean))];
        rows.push({ id: record.id, parameter: parameter.parameter, section: parameter.section,
            locoNo: String(record.locoNo || ''), schedule: record.schedule, date: record.date,
            gi: join('gi'), final: join('final'), value: join('value'), standard: parameter.standard,
            status: statuses.join('; ') || 'Not assessed', action: actions.join('; '),
            staff: staff.join(' / ') || join('staff') || record.staffName || '' });
    }
    return rows;
}

function filterRows(rows, { parameter, loco, schedule, from = '', to = '' }) {
    return rows.filter(row => row.parameter === parameter &&
        (loco.toLowerCase() === 'select all locos' || row.locoNo === loco) &&
        row.schedule === schedule && (!from || String(row.date || '').slice(0, 10) >= from) &&
        (!to || (row.date && String(row.date).slice(0, 10) <= to)))
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || b.id - a.id);
}

const api = { parseTemplate, buildRows, filterRows, fieldRole };
root.ViewerParameters = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
