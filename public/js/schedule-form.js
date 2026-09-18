const scheduleUser = readUser();
const scheduleStaffId =
    Number(scheduleUser?.employee_master_id);
const query = new URLSearchParams(window.location.search);
const distributionId =
    Number(query.get("assignment"));
let loadedSubmission = null;
let loadedScheduleName = "";

function readUser() {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch (error) {
        return null;
    }
}

function isStaffSession() {
    return (
        String(scheduleUser?.role || "")
            .trim()
            .toLowerCase() === "staff" &&
        scheduleStaffId &&
        distributionId
    );
}

function showFormMessage(message, isError = false) {
    const element = document.getElementById("formMessage");
    element.textContent = message;
    element.classList.toggle("error", isError);
    element.hidden = !message;
}

function safeTemplateHtml(html) {
    const documentValue = new DOMParser()
        .parseFromString(String(html || ""), "text/html");

    documentValue
        .querySelectorAll("script,iframe,object,embed,style,img")
        .forEach(element => element.remove());

    documentValue.querySelectorAll("*").forEach(element => {
        [...element.attributes].forEach(attribute => {
            const name = attribute.name.toLowerCase();
            const value = attribute.value.toLowerCase();

            if (
                name.startsWith("on") ||
                (
                    ["href", "src"].includes(name) &&
                    value.startsWith("javascript:")
                )
            ) {
                element.removeAttribute(attribute.name);
            }
        });
    });

    return documentValue.body.innerHTML;
}

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

function looksLikeMaintenanceWorkTable(table) {
    return [...table.rows].some(row => {
        const cells = [...row.cells];
        const serial = cells.find(cell => Number(cell.dataset.logicalColumn) === 0)
            ?.textContent.replace(/\s+/g, " ").trim();
        const detail = cells.find(cell => Number(cell.dataset.logicalColumn) === 1)
            ?.textContent.replace(/\s+/g, " ").trim();
        return /^(?:[A-J]|\d+)$/.test(serial || "") && String(detail || "").length > 8;
    });
}

function prepareBilingualColumns(table) {
    const columns = { action: null, name: null, remark: null };
    const width = annotateLogicalColumns(table);
    [...table.rows].slice(0, 8).forEach(row => [...row.cells].forEach(cell => {
        const index = Number(cell.dataset.logicalColumn);
        const text = cell.textContent.replace(/\s+/g, " ").trim().toLowerCase();
        if (/action taken|की गयी कार्यवाही|कार्रवाई की गयी|की गई कार्रवाई/.test(text)) {
            columns.action = index;
            cell.innerHTML = "Action Taken<br><small>की गई कार्रवाई</small>";
        } else if (/name of tcn|name of staff|टीसीएन का नाम/.test(text)) {
            columns.name = index;
            cell.innerHTML = "Name of TCN/Staff<br><small>तकनीशियन/कर्मचारी का नाम</small>";
        } else if (/sign\s*\/\s*remarks?|remarks?$|हस्ताक्षर.*टिप्पणी/.test(text)) {
            columns.remark = index;
            cell.innerHTML = "Remark<br><small>टिप्पणी</small>";
        } else if (/detail of work|description of activities|items to check|कार्य.*निरीक्षण का विवरण/.test(text)) {
            cell.innerHTML = "Work item<br><small>कार्य विवरण</small>";
        }
    }));
    if (columns.action === null && width >= 4 && looksLikeMaintenanceWorkTable(table)) {
        columns.action = 2;
        columns.name = 3;
        if (width >= 5) columns.remark = 4;
    }
    return columns;
}

function renderStaffName(cell, key, savedAnswers, attributions) {
    const attribution = attributions[key];
    const legacyName = savedAnswers[cell.dataset.legacyAnswerKey || ""];
    const name = attribution?.staff_name || legacyName || "—";
    const time = attribution?.entered_at
        ? `<small>${new Date(attribution.entered_at).toLocaleString("en-IN")}</small>`
        : "";
    cell.classList.add("staff-name-cell");
    cell.innerHTML = `<strong>${String(name).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char])}</strong>${time}`;
}

function columnContext(table, rowIndex, cellIndex) {
    const labels = [];
    for (let index = 0; index <= rowIndex; index += 1) {
        const cell = [...(table.rows[index]?.cells || [])]
            .find(item => Number(item.dataset.logicalColumn) === cellIndex);
        if (!cell) continue;
        const text = cell.textContent.replace(/\s+/g, " ").trim();
        if (text) labels.push(text);
    }
    return labels.slice(-3).join(" ");
}

function buildAnswerField(config, key, savedValue, label) {
    let field;

    if (config.type === "select") {
        field = document.createElement("select");
        field.className = "cell-answer ic-answer-select";
        field.innerHTML = '<option value="">Select</option>';
        config.options.forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            field.appendChild(option);
        });
    } else if (config.type === "value") {
        field = document.createElement("input");
        field.type = "text";
        field.inputMode = "decimal";
        field.className = "cell-answer ic-value-input";
        field.placeholder = "Actual value";
    } else {
        field = document.createElement("textarea");
        field.className = "cell-answer";
    }

    field.dataset.answerKey = key;
    field.dataset.fieldKind = config.kind;
    field.setAttribute("aria-label", label);
    field.value = savedValue || "";
    const handleFieldUpdate = () => {
        field.closest("tr")?.classList.remove(
            "ic-row-needs-remarks"
        );
        updateCompletion();
    };
    field.addEventListener("input", handleFieldUpdate);
    field.addEventListener("change", handleFieldUpdate);
    return field;
}

function syncStaffRemarksValue() {
    const remarks = [...document.querySelectorAll(".staff-remark-input")]
        .map(field => field.value.trim())
        .filter(Boolean);
    document.getElementById("staffRemarks").value = remarks.join("\n");
}

function refreshRemarkRowControls() {
    const rows = [...document.querySelectorAll(".staff-remark-row")];
    rows.forEach(row => {
        const removeButton = row.querySelector(".remove-remark-btn");
        removeButton.hidden = rows.length === 1;
    });
}

function addStaffRemarkRow(value = "") {
    const row = document.createElement("div");
    row.className = "staff-remark-row";

    const field = document.createElement("textarea");
    field.className = "staff-remark-input";
    field.rows = 2;
    field.placeholder = "Enter one remark";
    field.value = value;
    field.addEventListener("input", syncStaffRemarksValue);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-remark-btn";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
        row.remove();
        refreshRemarkRowControls();
        syncStaffRemarksValue();
    });

    row.append(field, removeButton);
    document.getElementById("staffRemarksList").appendChild(row);
    refreshRemarkRowControls();
    syncStaffRemarksValue();
}

function loadStaffRemarkRows(value) {
    const list = document.getElementById("staffRemarksList");
    list.replaceChildren();
    const remarks = String(value || "")
        .split(/\r?\n/)
        .map(item => item.trim())
        .filter(Boolean);
    (remarks.length ? remarks : [""]).forEach(addStaffRemarkRow);
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

function createAnswerFields(savedAnswers = {}, attributions = {}, scheduleName = "") {
    const tables = document.querySelectorAll(
        "#templateContainer table"
    );

    tables.forEach((table, tableIndex) => {
        const columns = prepareBilingualColumns(table);
        [...table.rows].forEach((row, rowIndex) => {
            [...row.cells].forEach((cell, cellIndex) => {
                const logicalCellIndex = Number(cell.dataset.logicalColumn ?? cellIndex);
                const plainText =
                    cell.textContent.replace(/\s+/g, " ").trim();

                if (plainText) return;

                const explicitAttributionKey = cell.dataset.attributionFor;
                if (explicitAttributionKey) {
                    renderStaffName(cell, explicitAttributionKey, savedAnswers, attributions);
                    return;
                }

                if (columns.name !== null && logicalCellIndex === columns.name) {
                    const actionCellIndex = [...row.cells]
                        .findIndex(item => Number(item.dataset.logicalColumn) === columns.action);
                    const actionKey = `t${tableIndex}_r${rowIndex}_c${actionCellIndex}`;
                    cell.dataset.legacyAnswerKey = `t${tableIndex}_r${rowIndex}_c${cellIndex}`;
                    renderStaffName(cell, actionKey, savedAnswers, attributions);
                    return;
                }

                const key = cell.dataset.answerKey ||
                    `t${tableIndex}_r${rowIndex}_c${cellIndex}`;
                const required = cell.dataset.requiredAnswer !== undefined
                    ? cell.dataset.requiredAnswer === "true"
                    : !(columns.remark !== null && logicalCellIndex === columns.remark);
                const label = `Answer row ${rowIndex + 1}, column ${cellIndex + 1}`;
                const usesTypedControls = window.IcFormControls
                    ?.isTypedSchedule(scheduleName);
                const explicitType = cell.dataset.adminFieldType;
                const explicitConfig = explicitType === "value"
                    ? { type: "value", kind: "value" }
                    : explicitType === "yes_no"
                        ? { type: "select", kind: "choice", options: ["Yes", "No"] }
                        : explicitType === "remarks"
                            ? { type: "text", kind: "remarks" }
                            : null;
                const config = explicitConfig || (usesTypedControls
                    ? window.IcFormControls.classify(
                        row.textContent,
                        columnContext(table, rowIndex, logicalCellIndex)
                    )
                    : { type: "text", kind: "text" });
                const field = buildAnswerField(
                    config,
                    key,
                    savedAnswers[key],
                    label
                );
                field.dataset.requiredAnswer = String(required);
                if (
                    ["TEXTAREA", "SELECT"].includes(field.tagName) &&
                    (
                        (columns.action !== null && logicalCellIndex === columns.action) ||
                        (columns.action === null && (columns.remark === null || logicalCellIndex !== columns.remark))
                    )
                ) {
                    field.dataset.bulkOkEligible = "true";
                }
                const attribution = attributions[key];
                if (attribution && field.value.trim()) {
                    field.readOnly = true;
                    field.disabled = field.tagName === "SELECT";
                    field.classList.add("attributed-answer");
                    field.title = `Entered by ${attribution.staff_name} on ${new Date(attribution.entered_at).toLocaleString("en-IN")}`;
                    const credit = document.createElement("small");
                    credit.className = "answer-credit";
                    credit.textContent = field.title;
                    cell.replaceChildren(field, credit);
                } else {
                    cell.replaceChildren(field);
                }
            });
        });
    });

    updateCompletion();
}

function scheduleSectionHeading(row) {
    const text = [...row.cells]
        .map(cell => cell.textContent.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join(" ");
    const letter = text.match(/^\(?([A-J])\)?(?:[.):-]|\s)\s*(.+)$/);
    if (letter) return `${letter[1].toUpperCase()} — ${letter[2]}`;
    const numbered = text.match(/^(\d+)\.0\s+(.+)$/);
    return numbered ? `${numbered[1]} — ${numbered[2]}` : "";
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

function normalizePointANumbering(sectionRows, sectionTitle) {
    if (!/^A\s+—/i.test(sectionTitle)) return;
    let number = 1;
    sectionRows.forEach(row => {
        if (scheduleSectionHeading(row)) return;
        const cells = [...row.cells];
        if (cells.length < 2) return;
        const detail = cells.slice(1)
            .map(cell => cell.textContent.replace(/\s+/g, " ").trim())
            .filter(Boolean)
            .join(" ");
        if (
            detail.length < 5 ||
            /^(?:check list|description|standard value|actual value|cab[- ]?1|cab[- ]?2|function test|axle no|sn\b|क्र\.?\s*सं)/i.test(detail)
        ) return;
        const firstCell = cells[0];
        const firstText = firstCell.textContent.replace(/\s+/g, " ").trim();
        if (firstText && !/^\d+$/.test(firstText)) return;
        firstCell.replaceChildren(String(number++));
        firstCell.classList.add("schedule-row-number");
    });
}

function initializeScheduleSections(container) {
    container.querySelectorAll("table").forEach((table, tableIndex) => {
        const rows = [...table.rows];
        const headingIndexes = rows
            .map((row, index) => ({ index, title: scheduleSectionHeading(row) }))
            .filter(item => item.title);
        const sections = headingIndexes.length
            ? headingIndexes.map((item, index) => ({
                title: item.title,
                start: item.index,
                end: headingIndexes[index + 1]?.index ?? rows.length
            }))
            : [{
                title: tableIndex === 0 ? "Schedule checks" : `Schedule checks ${tableIndex + 1}`,
                start: Math.min(1, rows.length),
                end: rows.length
            }];
        if (!rows.length) return;

        const commonRows = headingIndexes.length
            ? rows.slice(0, headingIndexes[0].index)
            : rows.slice(0, Math.min(1, rows.length));
        const list = document.createElement("div");
        list.className = "schedule-section-list";
        list.setAttribute("aria-label", "Schedule sections");

        sections.forEach((section, sectionIndex) => {
            const card = document.createElement("div");
            card.className = "schedule-section-card";
            const content = document.createElement("div");
            content.className = "schedule-section-content";
            content.hidden = true;
            const toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = "schedule-section-toggle";
            toggle.setAttribute("aria-expanded", "false");
            toggle.innerHTML = `<span>${section.title.replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character])}</span><b>＋</b>`;
            const markAll = document.createElement("button");
            markAll.type = "button";
            markAll.className = "mark-section-ok";
            markAll.textContent = "Select All";
            markAll.hidden = true;
            const sectionRows = rows.slice(section.start, section.end);
            normalizePointANumbering(sectionRows, section.title);
            const sectionTable = table.cloneNode(false);
            [...table.children]
                .filter(child => ["CAPTION", "COLGROUP"].includes(child.tagName))
                .forEach(child => sectionTable.appendChild(child.cloneNode(true)));
            const sectionBody = document.createElement("tbody");
            commonRows.forEach(row => sectionBody.appendChild(row.cloneNode(true)));
            sectionRows.forEach(row => {
                row.hidden = false;
                sectionBody.appendChild(row);
            });
            sectionTable.appendChild(sectionBody);
            content.appendChild(sectionTable);
            const eligibleFields = () => sectionRows
                .flatMap(row => [...row.querySelectorAll('[data-bulk-ok-eligible="true"]')])
                .filter(field => !field.disabled && !field.readOnly);
            markAll.disabled = eligibleFields().length === 0;
            toggle.addEventListener("click", () => {
                const opening = !card.classList.contains("open");
                card.classList.toggle("open", opening);
                content.hidden = !opening;
                toggle.setAttribute("aria-expanded", String(opening));
                toggle.querySelector("b").textContent = opening ? "−" : "＋";
                markAll.hidden = !opening;
            });
            markAll.addEventListener("click", () => {
                eligibleFields().forEach(field => {
                    if (field.value.trim()) return;
                    if (
                        field.tagName === "SELECT" &&
                        ![...field.options].some(option => option.value === "Checked / Found OK")
                    ) {
                        field.add(new Option("Checked / Found OK", "Checked / Found OK"));
                    }
                    field.value = "Checked / Found OK";
                    field.dispatchEvent(new Event("input", { bubbles: true }));
                });
                updateCompletion();
            });
            card.append(toggle, markAll);
            list.append(card, content);
        });

        table.before(list);
        table.remove();
    });
}

function validateIcExceptions() {
    if (!window.IcFormControls?.isTypedSchedule(
        loadedScheduleName
    )) {
        return true;
    }

    document.querySelectorAll(".ic-row-needs-remarks")
        .forEach(row => row.classList.remove(
            "ic-row-needs-remarks"
        ));

    const generalRemarks = document.getElementById(
        "staffRemarks"
    )?.value.trim();
    const adverseField = [...document.querySelectorAll(
        ".ic-answer-select[data-answer-key]"
    )].find(field => {
        if (!window.IcFormControls.isAdverse(field.value)) return false;
        const row = field.closest("tr");
        const remarks = [...(row?.querySelectorAll(
            'textarea[data-answer-key], input[data-answer-key][data-field-kind="remarks"]'
        ) || [])];
        if (remarks.length) {
            return !remarks.some(item => item.value.trim());
        }
        return !generalRemarks;
    });

    if (!adverseField) return true;
    showFormMessage(
        "Please enter remarks for every defect, missing item or negative result.",
        true
    );
    adverseField.focus();
    adverseField.closest("tr")?.classList.add("ic-row-needs-remarks");
    return false;
}

function collectAnswers() {
    const answers = {};

    document.querySelectorAll("[data-answer-key]")
        .forEach(field => {
            answers[field.dataset.answerKey] =
                field.value.trim();
        });

    return answers;
}

function updateCompletion() {
    const fields = [
        ...document.querySelectorAll('[data-answer-key][data-required-answer="true"]')
    ];
    const filled = fields.filter(
        field => field.value.trim()
    ).length;

    document.getElementById("completionText").textContent =
        `${filled} of ${fields.length} fields filled`;
}

function setReadOnly(readOnly) {
    document.querySelectorAll(
        "[data-answer-key], #staffRemarks, #supervisorSelect, " +
        ".staff-remark-input, #addStaffRemarkBtn, .remove-remark-btn, " +
        ".mark-section-ok"
    ).forEach(field => {
        field.disabled = readOnly;
    });

    document.getElementById("saveDraftBtn").disabled = readOnly;
    document.getElementById("submitFormBtn").disabled = readOnly;
    document.getElementById("submitIncompleteBtn").disabled = readOnly;
}

async function loadSupervisors(section, selectedId) {
    const response = await fetch(
        `/api/supervisors/section/${encodeURIComponent(section)}`
    );
    const supervisors = await response.json();

    if (!response.ok) {
        throw new Error(
            supervisors.message ||
            "Unable to load Supervisors."
        );
    }

    const select =
        document.getElementById("supervisorSelect");
    select.innerHTML =
        '<option value="">Select Supervisor</option>';

    supervisors.forEach(supervisor => {
        const option = document.createElement("option");
        option.value = supervisor.id;
        option.textContent =
            `${supervisor.name} (${supervisor.designation || "Supervisor"})`;
        option.selected =
            Number(supervisor.id) === Number(selectedId);
        select.appendChild(option);
    });
}

async function loadScheduleForm() {
    try {
        const response = await fetch(
            `/api/schedule-forms/assignment/${distributionId}/staff/${scheduleStaffId}`
        );
        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Unable to load schedule form."
            );
        }

        const { assignment, template, submission, can_edit: canEdit } = result;
        const header =
            assignment.detail.assign_work_header || {};

        loadedScheduleName =
            header.schedule_master?.schedule_name || "";

        loadedSubmission = submission;

        const locoNo =
            header.loco_master?.loco_no ||
            header.temporary_loco_master?.loco_no || "-";
        const locoClass =
            header.loco_master?.loco_type_master?.loco_type ||
            header.temporary_loco_master?.loco_type || "-";
        const scheduleName =
            header.schedule_master?.schedule_name || "-";
        const scheduleDate =
            header.assign_date ||
            assignment.distribution.assigned_date || "-";

        document.getElementById("staffName").textContent =
            assignment.employee.name;
        document.getElementById("locoNo").textContent = locoNo;
        document.getElementById("locoClass").textContent = locoClass;
        document.getElementById("scheduleName").textContent = scheduleName;
        document.getElementById("workName").textContent =
            assignment.detail.work_master?.work_name || "-";
        document.getElementById("assignDate").textContent = scheduleDate;
        document.getElementById("formTitle").textContent =
            template.form_name;
        document.getElementById("sourceFile").textContent =
            template.source_file_name || "";
        document.getElementById("formStatus").textContent =
            submission?.status || "New";

        await loadSupervisors(
            assignment.employee.section,
            submission?.submitted_to_supervisor_id ||
                assignment.distribution.assigned_by
        );

        const html =
            template.template_schema?.document_html || "";

        const isPdf =
            template.template_schema?.source_type === "pdf";

        if (!html && !isPdf) {
            throw new Error(
                "This source is registered, but its fillable web template is not configured yet."
            );
        }

        const container =
            document.getElementById("templateContainer");
        const templateContent = isPdf
            ? `<object class="schedule-pdf-reference"
                    data="/api/schedule-forms/template/${template.id}/source"
                    type="application/pdf">
                    <p>PDF preview unavailable.
                        <a href="/api/schedule-forms/template/${template.id}/source"
                            target="_blank" rel="noopener">Open source PDF</a>
                    </p>
                </object>`
            : safeTemplateHtml(html);

        container.innerHTML = `
            <div class="form-document-header">
                <img src="../images/IR-logo.jpeg"
                    alt="Indian Railways logo">
                <div class="form-document-title">
                    <strong>LOCOMOTIVE SHED, SABARMATI</strong>
                    <span>${template.form_name}</span>
                </div>
                <img src="../images/SBI-logo.jpeg"
                    alt="SBI Shed logo">
            </div>
            <div class="schedule-document-meta" aria-label="Assigned schedule details">
                <div><span>Loco No.</span><strong id="documentLocoNo"></strong></div>
                <div><span>Loco Class</span><strong id="documentLocoClass"></strong></div>
                <div><span>Date of Schedule</span><strong id="documentScheduleDate"></strong></div>
                <div><span>Schedule</span><strong id="documentScheduleName"></strong></div>
            </div>
            ${templateContent}
        `;
        document.getElementById("documentLocoNo").textContent = locoNo;
        document.getElementById("documentLocoClass").textContent = locoClass;
        document.getElementById("documentScheduleDate").textContent = scheduleDate;
        document.getElementById("documentScheduleName").textContent = scheduleName;
        if (!isPdf) {
            removeRepetitiveJeSignatureRows(container);
            removeSignatureRemarksColumns(container);
            createAnswerFields(
                submission?.form_answers || {},
                submission?.answer_attributions || {},
                loadedScheduleName
            );
            window.BilingualScheduleActivities?.enhance(
                container
            );
            initializeScheduleSections(container);
        } else {
            updateCompletion();
        }

        loadStaffRemarkRows(submission?.staff_remarks || "");

        setReadOnly(
            !canEdit ||
            [
                "Submitted Incomplete",
                "Supervisor Review",
                "Submitted Complete",
                "Forwarded to Incharge",
                "Returned to Supervisor",
                "Approved"
            ]
                .includes(submission?.status)
        );
        if (!canEdit) {
            showFormMessage("View only — only the active Lead Staff can fill or submit this form.");
        }
    } catch (error) {
        document.getElementById("templateContainer").textContent =
            error.message;
        showFormMessage(error.message, true);
        setReadOnly(true);
    }
}

async function saveForm(action) {
    const isSubmit = action !== "draft";
    syncStaffRemarksValue();

    if (isSubmit && !validateIcExceptions()) {
        return;
    }

    if (
        isSubmit &&
        !confirm(
            action === "submit_incomplete"
                ? "Submit incomplete form to Supervisor for continuation review?"
                : "Submit completed form for review?"
        )
    ) {
        return;
    }

    const draftButton =
        document.getElementById("saveDraftBtn");
    const submitButton =
        document.getElementById("submitFormBtn");
    const incompleteButton = document.getElementById("submitIncompleteBtn");
    const draftLabel = draftButton.textContent;
    const submitLabel = submitButton.textContent;

    draftButton.disabled = true;
    submitButton.disabled = true;
    incompleteButton.disabled = true;
    if (isSubmit) {
        submitButton.textContent = "Submitting...";
        showFormMessage(
            "Submitting schedule form. Please wait..."
        );
    } else {
        draftButton.textContent = "Saving...";
        showFormMessage("Saving draft. Please wait...");
    }

    try {
        const response = await fetch(
            `/api/schedule-forms/assignment/${distributionId}/staff/${scheduleStaffId}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    action,
                    form_answers: collectAnswers(),
                    answer_keys: [...document.querySelectorAll("[data-answer-key]")]
                        .filter(field => field.dataset.requiredAnswer === "true")
                        .map(field => field.dataset.answerKey),
                    supervisor_id:
                        Number(
                            document.getElementById(
                                "supervisorSelect"
                            ).value
                        ) || null,
                    staff_remarks:
                        document.getElementById("staffRemarks")
                            .value.trim(),
                    author_name:
                        scheduleUser?.name || "Staff"
                })
            }
        );
        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Unable to save schedule form."
            );
        }

        loadedSubmission = result.submission;
        document.getElementById("formStatus").textContent =
            result.submission.status;
        showFormMessage(result.message);

        if (isSubmit) {
            setReadOnly(true);
            submitButton.textContent = "Submitted";

            window.setTimeout(() => {
                window.location.href =
                    "/dashboard/staff.html";
            }, 1200);
        } else {
            draftButton.disabled = false;
            submitButton.disabled = false;
            incompleteButton.disabled = false;
            draftButton.textContent = draftLabel;
            submitButton.textContent = submitLabel;
        }
    } catch (error) {
        draftButton.disabled = false;
        submitButton.disabled = false;
        incompleteButton.disabled = false;
        draftButton.textContent = draftLabel;
        submitButton.textContent = submitLabel;
        showFormMessage(error.message, true);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (!isStaffSession()) {
        window.location.replace("/dashboard/login.html");
        return;
    }

    document.getElementById("dashboardBtn").addEventListener(
        "click",
        () => {
            window.location.href = "/dashboard/staff.html";
        }
    );

    document.getElementById("saveDraftBtn").addEventListener(
        "click",
        () => saveForm("draft")
    );

    document.getElementById("addStaffRemarkBtn").addEventListener(
        "click",
        () => addStaffRemarkRow()
    );

    document.getElementById("submitFormBtn").addEventListener(
        "click",
        () => saveForm("submit_complete")
    );
    document.getElementById("submitIncompleteBtn").addEventListener(
        "click",
        () => saveForm("submit_incomplete")
    );

    loadScheduleForm();
});
