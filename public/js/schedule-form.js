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
    const columns = { serial: null, work: null, action: null, name: null, remark: null, nameRemark: null };
    const width = annotateLogicalColumns(table);
    [...table.rows].slice(0, 8).forEach(row => [...row.cells].forEach(cell => {
        const index = Number(cell.dataset.logicalColumn);
        const text = cell.textContent.replace(/\s+/g, " ").trim().toLowerCase();
        if (/^(?:sr\.?\s*no\.?|s\.?\s*no\.?|sn|क्र\.?\s*सं|क्रसं)/.test(text)) {
            columns.serial = index;
        } else if (/action taken|की गयी कार्यवाही|कार्रवाई की गयी|की गई कार्रवाई/.test(text)) {
            columns.action = index;
            cell.innerHTML = "Action Taken<br><small>की गई कार्रवाई</small>";
        } else if ((/name of tcn|name of staff|टीसीएन का नाम|तकनीशियन का नाम/.test(text)) && /remark|टिप्पणी/.test(text)) {
            columns.nameRemark = index;
            cell.innerHTML = "Name of TCN / Remarks<br><small>तकनीशियन का नाम / टिप्पणी</small>";
        } else if (/name of tcn|name of staff|टीसीएन का नाम/.test(text)) {
            columns.name = index;
            cell.innerHTML = "Name of TCN/Staff<br><small>तकनीशियन/कर्मचारी का नाम</small>";
        } else if (/sign\s*\/\s*remarks?|remarks?(?:,.*)?$|हस्ताक्षर.*टिप्पणी/.test(text)) {
            columns.remark = index;
            cell.innerHTML = "Remarks / TCN Name<br><small>टिप्पणी / तकनीशियन का नाम</small>";
        } else if (/detail of work|description of activities|items to check|कार्य.*निरीक्षण का विवरण/.test(text)) {
            columns.work = index;
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

function isIncomingOutgoingInspection() {
    const text = document.getElementById("templateContainer")
        ?.textContent.replace(/\s+/g, " ") || "";
    return /incoming\s*\/\s*out\s*going inspection/i.test(text) ||
        (/inspection wing electrical/i.test(text) && /vigilance control device/i.test(text));
}

function isIncomingStructuralRow(row) {
    const text = row.textContent.replace(/\s+/g, " ").trim();
    if (!text) return false;
    return Boolean(
        scheduleSectionHeading(row) ||
        /^(?:जाँच की सूची\s*)?check list$/i.test(text) ||
        /while loco is energised/i.test(text) ||
        /vcd becomes active/i.test(text) ||
        /^(?:i{1,3}|iv|v)\)\s/i.test(text) ||
        /check following led indication/i.test(text) ||
        /^(?:sn\s+)?indication\s+status of indication/i.test(text) ||
        /from 60 to 68|after 76|^std\s+observed/i.test(text) ||
        /^(?:starting\s+stable\s*){2}$/i.test(text) ||
        /^(?:description|विवरण).*standard value.*actual value/i.test(text) ||
        /^(?:fault code\s+error log\s+action taken)$/i.test(text)
    );
}

function isScheduleShiftGrid(table) {
    const text = table.textContent.replace(/\s+/g, " ").trim();
    return /upper deck/i.test(text) && /under truck/i.test(text) && /date\s*\/\s*shift/i.test(text);
}

function prepareCustomerFeedbackTable(table) {
    if (table.dataset.multipleFeedbackReady) return;
    table.dataset.multipleFeedbackReady = "true";
    const rows = [...table.rows];
    const entryRow = rows.find((row, index) =>
        index > 0 && [...row.cells].every(cell =>
            !cell.textContent.replace(/\s+/g, " ").trim()
        )
    );
    if (entryRow) {
        for (let index = 0; index < 5; index += 1) {
            const extraRow = entryRow.cloneNode(true);
            extraRow.hidden = true;
            extraRow.dataset.feedbackExtraHidden = "true";
            entryRow.parentElement.appendChild(extraRow);
        }
    }
    [...table.rows].slice(2).forEach((row, index) => {
        const serialCell = row.cells[0];
        if (serialCell) serialCell.textContent = String(index + 1);
    });
    const caption = table.caption || table.createCaption();
    caption.innerHTML = '<button class="add-customer-feedback-row" type="button">+ Add Customer Feedback</button>';
}

function prepareIncomingPointATable(table) {
    if (table.dataset.pointAReady) return;
    table.dataset.pointAReady = "true";
    const rows = [...table.rows];
    rows.flatMap(row => [...row.cells])
        .filter(cell => /^(?:वास्तविक\s+मान\s*)?actual\s+value$/i.test(
            cell.textContent.replace(/\s+/g, " ").trim()
        ))
        .forEach(cell => cell.classList.add("point-a-actual-column-hidden"));
    let point = 0;
    let started = false;
    rows.forEach(row => {
        const cells = [...row.cells];
        const detail = cells[1]?.textContent.replace(/\s+/g, " ").trim();
        if (/battery voltage/i.test(detail || "")) started = true;
        if (!started || !detail || !cells[2]?.textContent.replace(/\s+/g, " ").trim()) return;
        point += 1;
        row.dataset.incomingPointA = String(point);
        cells[3]?.classList.add("point-a-actual-column-hidden");
    });
}

function moveGaugePressureRowsIntoPointA(container, savedAnswers = {}) {
    const tables = [...container.querySelectorAll("table")];
    const pointATable = tables.find(table =>
        /incoming \(when loco is energised\)/i.test(table.textContent) &&
        /battery voltage/i.test(table.textContent)
    );
    const gaugeTable = tables.find(table =>
        /gauges and pressure switches/i.test(table.textContent)
    );
    if (!pointATable || !gaugeTable || pointATable === gaugeTable) return;

    const gaugeRows = [...gaugeTable.rows];
    const headingIndex = gaugeRows.findIndex(row =>
        /^B\s*(?:[.):-]|—)/i.test(
            row.textContent.replace(/\s+/g, " ").trim()
        )
    );
    const candidates = gaugeRows.slice(Math.max(0, headingIndex + 1))
        .filter(row => {
            const cells = [...row.cells];
            const serial = cells[0]?.textContent.replace(/\s+/g, " ").trim();
            const detail = cells.slice(1).map(cell =>
                cell.textContent.replace(/\s+/g, " ").trim()
            ).join(" ");
            return /^\d+$/.test(serial || "") && detail.length > 3;
        })
        .slice(0, 12);
    if (!candidates.length) return;

    const targetBody = pointATable.tBodies[0] || pointATable.createTBody();
    candidates.forEach((row, index) => {
        const sourceCells = [...row.cells];
        const sourceFields = [...row.querySelectorAll("[data-answer-key]")];
        const normalizedRow = document.createElement("tr");
        normalizedRow.dataset.incomingPointA = String(23 + index);
        normalizedRow.dataset.movedFromGaugePressure = "true";
        const serialCell = document.createElement("td");
        serialCell.textContent = String(23 + index);
        const workCell = document.createElement("td");
        workCell.innerHTML = sourceCells[1]?.innerHTML || "";
        const standardCell = document.createElement("td");
        standardCell.innerHTML = sourceCells[2]?.innerHTML || "";
        normalizedRow.append(serialCell, workCell, standardCell);
        for (let fieldIndex = 0; fieldIndex < 3; fieldIndex += 1) {
            const valueCell = document.createElement("td");
            if (fieldIndex === 0) {
                valueCell.classList.add("point-a-actual-column-hidden");
            }
            const existingField = sourceFields[fieldIndex];
            if (existingField) valueCell.appendChild(existingField);
            normalizedRow.appendChild(valueCell);
        }
        const remarksCell = document.createElement("td");
        const sourceKey = sourceFields[0]?.dataset.answerKey || `gauge_${index + 1}`;
        const remarksKey = `${sourceKey}__staff_remarks`;
        const remarksField = buildAnswerField(
            { type: "text", kind: "remarks" },
            remarksKey,
            savedAnswers[remarksKey],
            "Remarks / TCN Name"
        );
        remarksField.dataset.requiredAnswer = "false";
        remarksCell.appendChild(remarksField);
        normalizedRow.appendChild(remarksCell);
        row.replaceWith(normalizedRow);
        row = normalizedRow;
        row.dataset.movedFromGaugePressure = "true";
        targetBody.appendChild(row);
    });
}

function renderStaffName(cell, key, savedAnswers, attributions) {
    const attribution = attributions[key];
    const legacyName = savedAnswers[cell.dataset.legacyAnswerKey || ""];
    const name = attribution?.staff_name || legacyName || scheduleUser?.name || "—";
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
        updateAnswerAssessment(field);
        updateCompletion();
    };
    field.addEventListener("input", handleFieldUpdate);
    field.addEventListener("change", handleFieldUpdate);
    return field;
}

function standardValueForField(field) {
    if (field?.dataset.standardValueOverride) {
        return field.dataset.standardValueOverride;
    }
    const cell = field.closest("td,th");
    const row = cell?.closest("tr");
    if (!cell || !row) return "";
    const targetColumn = Number(cell.dataset.logicalColumn);
    const candidates = [...row.cells]
        .filter(item => Number(item.dataset.logicalColumn) < targetColumn)
        .map(item => item.textContent.replace(/\s+/g, " ").trim())
        .filter(text => /\d/.test(text));
    return candidates.at(-1) || "";
}

function preparePointNineDualValues(table, savedAnswers = {}) {
    const row = table.querySelector('tr[data-incoming-point-a="9"]');
    if (!row || row.dataset.dualValuesReady === "true") return;
    row.dataset.dualValuesReady = "true";
    const valueFields = [...row.querySelectorAll('input.ic-value-input[data-answer-key]')]
        .filter(field => !field.closest(".point-a-actual-column-hidden"));
    valueFields.forEach((field, cabIndex) => {
        const cell = field.closest("td,th");
        if (!cell) return;
        const baseKey = field.dataset.answerKey;
        const group = document.createElement("div");
        group.className = "point-a-dual-values";
        [
            { suffix: "cut_out", label: "Cut-out", standard: "10.0 ± 0.20" },
            { suffix: "cut_in", label: "Cut-in", standard: "8.0 ± 0.20" }
        ].forEach(item => {
            const label = document.createElement("label");
            label.textContent = item.label;
            const key = `${baseKey}__${item.suffix}`;
            const input = buildAnswerField(
                { type: "value", kind: "value" },
                key,
                savedAnswers[key],
                `${item.label} value, Cab-${cabIndex + 1}`
            );
            input.dataset.standardValueOverride = item.standard;
            input.dataset.requiredAnswer = field.dataset.requiredAnswer || "true";
            label.appendChild(input);
            group.appendChild(label);
        });
        cell.replaceChildren(group);
    });
}

function prepareSingleCabValueRows(table) {
    [17, 23, 24, 25].forEach(point => {
        const row = table.querySelector(`tr[data-incoming-point-a="${point}"]`);
        if (!row || row.dataset.singleValueReady === "true") return;
        const cells = [...row.cells];
        const hiddenActualIndex = cells.findIndex(cell =>
            cell.classList.contains("point-a-actual-column-hidden")
        );
        const remarksIndex = cells.findIndex(cell =>
            cell.querySelector('[data-field-kind="remarks"]')
        );
        const firstCell = cells[hiddenActualIndex + 1];
        const secondCell = cells[hiddenActualIndex + 2];
        if (!firstCell || !secondCell || remarksIndex <= hiddenActualIndex + 1) return;
        row.dataset.singleValueReady = "true";
        if (!firstCell.querySelector("[data-answer-key]")) {
            const field = secondCell.querySelector("[data-answer-key]");
            if (field) firstCell.appendChild(field);
        }
        firstCell.colSpan = (Number(firstCell.colSpan) || 1) +
            (Number(secondCell.colSpan) || 1);
        secondCell.remove();
    });
}

function pointACabCells(row) {
    const cells = [...row.cells];
    const hiddenActualIndex = cells.findIndex(cell =>
        cell.classList.contains("point-a-actual-column-hidden")
    );
    return hiddenActualIndex < 0
        ? []
        : [cells[hiddenActualIndex + 1], cells[hiddenActualIndex + 2]].filter(Boolean);
}

function preparePointTwentySevenToTwentyNine(table, savedAnswers = {}) {
    const point27 = table.querySelector('tr[data-incoming-point-a="27"]');
    if (point27 && point27.dataset.customInputReady !== "true") {
        point27.dataset.customInputReady = "true";
        const [firstCell, secondCell] = pointACabCells(point27);
        if (firstCell && secondCell) {
            const key = "point_a_27_checked_status";
            const field = buildAnswerField(
                { type: "select", kind: "inspection", options: ["Checked OK", "Not OK", "N.A."] },
                key,
                savedAnswers[key],
                "Point 27 inspection result"
            );
            field.dataset.requiredAnswer = "true";
            firstCell.replaceChildren(field);
            firstCell.colSpan = (Number(firstCell.colSpan) || 1) +
                (Number(secondCell.colSpan) || 1);
            secondCell.remove();
        }
    }

    const point28 = table.querySelector('tr[data-incoming-point-a="28"]');
    if (point28 && point28.dataset.customInputReady !== "true") {
        point28.dataset.customInputReady = "true";
        pointACabCells(point28).forEach((cell, index) => {
            const unit = `SR-${index + 1}`;
            const key = `point_a_28_${unit.toLowerCase().replace("-", "_")}_level`;
            const label = document.createElement("label");
            label.className = "point-a-unit-result";
            label.append(document.createTextNode(unit));
            const field = buildAnswerField(
                { type: "select", kind: "inspection", options: ["Level OK", "Level Not OK", "N.A."] },
                key,
                savedAnswers[key],
                `${unit} oil level`
            );
            field.dataset.requiredAnswer = "true";
            label.appendChild(field);
            cell.replaceChildren(label);
        });
    }

    const point29 = table.querySelector('tr[data-incoming-point-a="29"]');
    if (point29 && point29.dataset.customInputReady !== "true") {
        point29.dataset.customInputReady = "true";
        const [firstCell, secondCell] = pointACabCells(point29);
        if (firstCell && secondCell) {
            const axleTable = document.createElement("table");
            axleTable.className = "axle-current-grid";
            const headerRow = axleTable.insertRow();
            const valueRow = axleTable.insertRow();
            for (let index = 1; index <= 4; index += 1) {
                const header = document.createElement("th");
                header.textContent = `Axle no. ${index}`;
                headerRow.appendChild(header);
                const valueCell = valueRow.insertCell();
                const key = `point_a_29_axle_${index}`;
                const field = buildAnswerField(
                    { type: "value", kind: "value" },
                    key,
                    savedAnswers[key],
                    `Earth return current, axle ${index}`
                );
                field.dataset.requiredAnswer = "true";
                valueCell.appendChild(field);
            }
            firstCell.replaceChildren(axleTable);
            firstCell.colSpan = (Number(firstCell.colSpan) || 1) +
                (Number(secondCell.colSpan) || 1);
            secondCell.remove();
        }
    }
}

function preparePointThirtyFunctionTest(table, savedAnswers = {}) {
    const row = table.querySelector('tr[data-incoming-point-a="30"]');
    if (!row || row.dataset.functionTestReady === "true") return;
    const cells = [...row.cells];
    const workCell = cells[1];
    const standardCell = cells[2];
    const [firstCabCell, secondCabCell] = pointACabCells(row);
    if (!workCell || !standardCell || !firstCabCell || !secondCabCell) return;
    row.dataset.functionTestReady = "true";
    const items = [
        ["Test function Earth Fault", "—"],
        ["Control ckt Positive", "Positive PCLH + Earth (89.7)"],
        ["Control ckt Negative", "Negative PCLH + Earth"],
        ["Harmonic Filter", "Earth Link (89.6)"],
        ["Aux. Ckt.", "Earth + 1117 IN HB2 (89.2)"],
        ["415/110", "HB1 Earth + 1218 (89.5)"]
    ];
    const makeList = (className, values) => {
        const list = document.createElement("div");
        list.className = className;
        values.forEach(value => {
            const line = document.createElement("div");
            line.textContent = value;
            list.appendChild(line);
        });
        return list;
    };
    workCell.replaceChildren(
        makeList("point-a-function-list", items.map(item => item[0]))
    );
    standardCell.replaceChildren(
        makeList("point-a-function-list", items.map(item => item[1]))
    );
    const valueList = document.createElement("div");
    valueList.className = "point-a-function-list point-a-function-values";
    items.forEach((item, index) => {
        const key = `point_a_30_function_${index + 1}`;
        const field = buildAnswerField(
            { type: "value", kind: "text" },
            key,
            savedAnswers[key],
            `${item[0]} actual value`
        );
        field.classList.remove("ic-value-input");
        field.dataset.requiredAnswer = "true";
        valueList.appendChild(field);
    });
    firstCabCell.replaceChildren(valueList);
    firstCabCell.colSpan = (Number(firstCabCell.colSpan) || 1) +
        (Number(secondCabCell.colSpan) || 1);
    secondCabCell.remove();
}

function preparePointThirtyOneBurTest(table, savedAnswers = {}) {
    const row = table.querySelector('tr[data-incoming-point-a="31"]');
    if (!row || row.dataset.burTestReady === "true") return;
    const cells = [...row.cells];
    const workCell = cells[1];
    const standardCell = cells[2];
    const [firstCabCell, secondCabCell] = pointACabCells(row);
    if (!workCell || !standardCell || !firstCabCell || !secondCabCell) return;
    row.dataset.burTestReady = "true";
    workCell.colSpan = (Number(workCell.colSpan) || 1) +
        (Number(standardCell.colSpan) || 1);
    standardCell.remove();
    const burTable = document.createElement("table");
    burTable.className = "bur-result-grid";
    const headerRow = burTable.insertRow();
    const valueRow = burTable.insertRow();
    ["BUR-1", "BUR-2", "BUR-3"].forEach((label, index) => {
        const header = document.createElement("th");
        header.textContent = label;
        headerRow.appendChild(header);
        const valueCell = valueRow.insertCell();
        const key = `point_a_31_bur_${index + 1}`;
        const field = buildAnswerField(
            { type: "select", kind: "inspection", options: ["OK", "Not OK", "N.A."] },
            key,
            savedAnswers[key],
            `${label} result`
        );
        field.dataset.requiredAnswer = "true";
        valueCell.appendChild(field);
    });
    firstCabCell.replaceChildren(burTable);
    firstCabCell.colSpan = (Number(firstCabCell.colSpan) || 1) +
        (Number(secondCabCell.colSpan) || 1);
    secondCabCell.remove();
}

function preparePointThirtyTwoToThirtyFour(table, savedAnswers = {}) {
    const point32 = table.querySelector('tr[data-incoming-point-a="32"]');
    if (point32 && point32.dataset.tmTableReady !== "true") {
        const cells = [...point32.cells];
        const workCell = cells[1];
        const standardCell = cells[2];
        const [firstCabCell, secondCabCell] = pointACabCells(point32);
        if (workCell && standardCell && firstCabCell && secondCabCell) {
            point32.dataset.tmTableReady = "true";
            const tmTable = document.createElement("table");
            tmTable.className = "tm-temperature-grid";
            const titleRow = tmTable.insertRow();
            const title = document.createElement("th");
            title.colSpan = 6;
            title.textContent = "Temp. Value of TM as seen in Driver Display.";
            titleRow.appendChild(title);
            const headerRow = tmTable.insertRow();
            const valueRow = tmTable.insertRow();
            for (let index = 1; index <= 6; index += 1) {
                const header = document.createElement("th");
                header.textContent = `TM${index}`;
                headerRow.appendChild(header);
                const valueCell = valueRow.insertCell();
                const key = `point_a_32_tm_${index}`;
                const field = buildAnswerField(
                    { type: "value", kind: "value" },
                    key,
                    savedAnswers[key],
                    `TM${index} temperature`
                );
                field.dataset.requiredAnswer = "true";
                valueCell.appendChild(field);
            }
            workCell.replaceChildren(tmTable);
            workCell.colSpan = (Number(workCell.colSpan) || 1) +
                (Number(standardCell.colSpan) || 1) +
                (Number(firstCabCell.colSpan) || 1) +
                (Number(secondCabCell.colSpan) || 1);
            standardCell.remove();
            firstCabCell.remove();
            secondCabCell.remove();
        }
    }

    [33, 34].forEach(point => {
        const row = table.querySelector(`tr[data-incoming-point-a="${point}"]`);
        if (!row || row.dataset.yesNoReady === "true") return;
        const cells = [...row.cells];
        const standardCell = cells[2];
        const cabCells = pointACabCells(row);
        if (!standardCell || cabCells.length < 2) return;
        row.dataset.yesNoReady = "true";
        standardCell.textContent = "Yes / No";
        cabCells.forEach((cell, index) => {
            const key = `point_a_${point}_cab_${index + 1}`;
            const field = buildAnswerField(
                { type: "select", kind: "inspection", options: ["Yes", "No", "N.A."] },
                key,
                savedAnswers[key],
                `Point ${point}, Cab-${index + 1}`
            );
            field.dataset.requiredAnswer = "true";
            field.dataset.bulkOkEligible = "true";
            cell.replaceChildren(field);
        });
    });
}

function prepareGaugePressureSection(table, savedAnswers = {}) {
    const rows = [...table.rows];
    const point13 = rows.find(row =>
        row.cells[0]?.textContent.replace(/\s+/g, " ").trim() === "13"
    );
    const heading = rows.find(row =>
        /^B\s*(?:(?:[.):-]|—)\s*)?GAUGES AND PRESSURE SWITCHES/i.test(
            row.textContent.replace(/\s+/g, " ").trim()
        )
    );
    if (!point13 || !heading || table.dataset.gaugeSectionReady === "true") return;
    table.dataset.gaugeSectionReady = "true";
    table.classList.add("gauge-pressure-table");
    const headingIndex = rows.indexOf(heading);
    const point13Index = rows.indexOf(point13);
    rows.slice(headingIndex + 1, point13Index).forEach(row => row.remove());

    heading.dataset.sectionTitle = "B — GAUGES AND PRESSURE SWITCHES";
    heading.replaceChildren();
    ["B", "GAUGES AND PRESSURE SWITCHES", "Cab-1", "Cab-2", "Remarks/Name of TCN"]
        .forEach((text, index) => {
            const cell = document.createElement(index < 2 ? "th" : "td");
            cell.textContent = text;
            heading.appendChild(cell);
        });
    [...heading.cells].forEach(cell => {
        cell.colSpan = 1;
        cell.rowSpan = 1;
    });

    [...table.rows].filter(row => {
        const number = Number(row.cells[0]?.textContent.replace(/\s+/g, " ").trim());
        return number >= 13 && number <= 17;
    }).forEach((row, index) => {
        [...row.cells].forEach(cell => {
            cell.colSpan = 1;
            cell.rowSpan = 1;
        });
        const sourcePoint = row.cells[0].textContent.replace(/\s+/g, " ").trim();
        row.dataset.gaugeSourcePoint = sourcePoint;
        row.cells[0].textContent = String(index + 1);
        [row.cells[2], row.cells[3]].forEach((cell, cabIndex) => {
            if (!cell) return;
            const key = `point_b_${sourcePoint}_cab_${cabIndex + 1}`;
            const field = buildAnswerField(
                { type: "select", kind: "inspection", options: ["Checked OK", "Not OK", "N.A."] },
                key,
                savedAnswers[key],
                `Part B point ${index + 1}, Cab-${cabIndex + 1}`
            );
            field.dataset.requiredAnswer = "true";
            field.dataset.bulkOkEligible = "true";
            cell.replaceChildren(field);
        });
        if (row.querySelector('[data-gauge-remarks="true"]')) return;
        const remarkCell = document.createElement("td");
        remarkCell.dataset.gaugeRemarks = "true";
        const key = `point_b_${sourcePoint}_remarks_tcn`;
        const field = buildAnswerField(
            { type: "text", kind: "remarks" },
            key,
            savedAnswers[key],
            `Part B point ${index + 1} Remarks / Name of TCN`
        );
        field.dataset.requiredAnswer = "false";
        remarkCell.appendChild(field);
        row.appendChild(remarkCell);
    });
}

function prepareRotatingMachinesSection(table, savedAnswers = {}) {
    const rows = [...table.rows];
    const heading = rows.find(row =>
        /^C\s*(?:(?:[.):-]|—)\s*)?Rotating Machines/i.test(
            row.textContent.replace(/\s+/g, " ").trim()
        )
    );
    if (!heading || table.dataset.rotatingMachinesReady === "true") return;

    const headingIndex = rows.indexOf(heading);
    const pointRows = rows.slice(headingIndex + 1).filter(row =>
        /^[1-4]$/.test(row.cells[0]?.textContent.replace(/\s+/g, " ").trim() || "")
    );
    if (pointRows.length < 4) return;
    table.dataset.rotatingMachinesReady = "true";

    pointRows.slice(0, 3).forEach((row, pointIndex) => {
        [row.cells[2], row.cells[3]].forEach((cell, cabIndex) => {
            if (!cell) return;
            const key = `point_c_${pointIndex + 1}_cab_${cabIndex + 1}`;
            const field = buildAnswerField(
                { type: "select", kind: "inspection", options: ["Checked OK", "Not OK", "N.A."] },
                key,
                savedAnswers[key],
                `Part C point ${pointIndex + 1}, Cab-${cabIndex + 1}`
            );
            field.dataset.requiredAnswer = "true";
            field.dataset.bulkOkEligible = "true";
            cell.replaceChildren(field);
        });
    });

    const pointFour = pointRows[3];
    const workCell = pointFour.cells[1];
    const firstCabCell = pointFour.cells[2];
    const secondCabCell = pointFour.cells[3];
    const scheduleChecksNine = workCell?.querySelector("table");
    if (scheduleChecksNine && firstCabCell && secondCabCell) {
        firstCabCell.replaceChildren(scheduleChecksNine);
        firstCabCell.colSpan =
            (Number(firstCabCell.colSpan) || 1) +
            (Number(secondCabCell.colSpan) || 1);
        secondCabCell.remove();
    }
}

function prepareWhileEnergisedSection(table, savedAnswers = {}) {
    const rows = [...table.rows];
    const heading = rows.find(row =>
        /^D\s*(?:(?:[.):-]|—)\s*)?While Loco is energised/i.test(
            row.textContent.replace(/\s+/g, " ").trim()
        )
    );
    if (!heading || table.dataset.whileEnergisedReady === "true") return;

    const headingIndex = rows.indexOf(heading);
    const sourceRows = rows.slice(headingIndex + 1).filter(row =>
        /^(?:5|6|7|8)$/.test(
            row.cells[0]?.textContent.replace(/\s+/g, " ").trim() || ""
        )
    );
    if (sourceRows.length < 4) return;
    table.dataset.whileEnergisedReady = "true";

    const header = rows[0];
    if (header?.cells.length >= 5) {
        const standardHeader = header.cells[2];
        const actualHeader = header.cells[3];
        actualHeader.colSpan =
            (Number(standardHeader.colSpan) || 1) +
            (Number(actualHeader.colSpan) || 1);
        standardHeader.remove();
    }

    const pointRow = sourceRows[0];
    const originalWork = pointRow.cells[1];
    const workCell = document.createElement("td");
    workCell.colSpan = 14;
    workCell.append(...[...originalWork.childNodes].map(node => node.cloneNode(true)));

    const switchTable = document.createElement("table");
    switchTable.className = "switch-position-grid";
    [
        ["Switch no.", "Position", "Switch no.", "Position"],
        ["154", "Normal", "160", "‘1’"],
        ["152", "‘0’", "237.1", "‘1’"]
    ].forEach((values, rowIndex) => {
        const switchRow = switchTable.insertRow();
        values.forEach(value => {
            const cell = document.createElement(rowIndex === 0 ? "th" : "td");
            cell.textContent = value;
            switchRow.appendChild(cell);
        });
    });
    workCell.appendChild(switchTable);

    const resultCell = document.createElement("td");
    resultCell.colSpan = 10;
    const resultKey = "point_d_1_result";
    const result = buildAnswerField(
        { type: "select", kind: "inspection", options: ["Checked OK", "Not OK", "N.A."] },
        resultKey,
        savedAnswers[resultKey],
        "Part D point 1 actual value"
    );
    result.dataset.requiredAnswer = "true";
    result.dataset.bulkOkEligible = "true";
    resultCell.appendChild(result);

    const remarksCell = document.createElement("td");
    remarksCell.colSpan = 1;
    const remarksKey = "point_d_1_remarks_tcn";
    const remarks = buildAnswerField(
        { type: "text", kind: "remarks" },
        remarksKey,
        savedAnswers[remarksKey],
        "Part D point 1 Remarks / Name of TCN"
    );
    remarks.dataset.requiredAnswer = "false";
    remarksCell.appendChild(remarks);

    const serialCell = document.createElement("td");
    serialCell.colSpan = 2;
    serialCell.textContent = "1";
    serialCell.className = "schedule-row-number";
    pointRow.replaceChildren(serialCell, workCell, resultCell, remarksCell);
    sourceRows.slice(1).forEach(row => row.remove());
}

function prepareAirDeliverySection(table, savedAnswers = {}) {
    const rows = [...table.rows];
    const heading = rows.find(row =>
        /^E\s*(?:(?:[.):-]|—)\s*)?Air delivery measurement/i.test(
            row.textContent.replace(/\s+/g, " ").trim()
        )
    );
    if (!heading || table.dataset.airDeliveryReady === "true") return;
    table.dataset.airDeliveryReady = "true";

    const start = rows.indexOf(heading) + 1;
    const end = rows.findIndex((row, index) =>
        index >= start && /^F\s*(?:(?:[.):-]|—)\s*)?CVVRS/i.test(
            row.textContent.replace(/\s+/g, " ").trim()
        )
    );
    const sectionRows = rows.slice(start, end < 0 ? rows.length : end);

    sectionRows.forEach((row, rowIndex) => {
        const text = row.textContent.replace(/\s+/g, " ").trim();
        const firstCell = row.cells[0];
        if (
            firstCell &&
            (
                /SCTMB\s*&\s*OCB#1,2/i.test(text) ||
                /^\d+\s*Check Earthing shunt/i.test(text) ||
                /^\d+\s*Axle box/i.test(text)
            )
        ) {
            firstCell.replaceChildren();
            firstCell.classList.remove("schedule-row-number");
        }

        row.querySelectorAll(".staff-name-cell").forEach((cell, cellIndex) => {
            const key = cell.dataset.legacyAnswerKey ||
                `point_e_row_${rowIndex + 1}_value_${cellIndex + 1}`;
            cell.classList.remove("staff-name-cell");
            const field = buildAnswerField(
                { type: "value", kind: "value" },
                key,
                savedAnswers[key],
                `Part E value row ${rowIndex + 1}`
            );
            field.dataset.requiredAnswer = "true";
            cell.replaceChildren(field);
        });

        if (/Axle box/i.test(text)) {
            [...row.cells].forEach((cell, cellIndex, cells) => {
                if (!/Axle box/i.test(cell.textContent)) return;
                const resultCell = cells[cellIndex + 1];
                if (!resultCell) return;
                const key = `point_e_earthing_row_${rowIndex + 1}_item_${cellIndex + 1}`;
                const field = buildAnswerField(
                    { type: "select", kind: "inspection", options: ["Checked OK", "Not OK", "N.A."] },
                    key,
                    savedAnswers[key],
                    `${cell.textContent.replace(/\s+/g, " ").trim()} result`
                );
                field.dataset.requiredAnswer = "true";
                field.dataset.bulkOkEligible = "true";
                resultCell.replaceChildren(field);
            });
        }
    });
}

function prepareCvvrsSection(table, savedAnswers = {}) {
    const row = [...table.rows].find(item =>
        /^F\s*(?:(?:[.):-]|—)\s*)?CVVRS/i.test(
            item.textContent.replace(/\s+/g, " ").trim()
        )
    );
    if (!row || row.dataset.cvvrsReady === "true" || row.cells.length < 4) return;
    row.dataset.cvvrsReady = "true";

    const [serialCell, workCell, actualCell, tcnCell] = [...row.cells];
    serialCell.colSpan = 2;
    workCell.colSpan = 14;
    actualCell.colSpan = 10;
    tcnCell.colSpan = 1;

    const actualKey = "point_f_cvvrs_actual_value";
    const actual = buildAnswerField(
        { type: "value", kind: "value" },
        actualKey,
        savedAnswers[actualKey],
        "Part F CVVRS actual value"
    );
    actual.dataset.requiredAnswer = "true";
    actualCell.replaceChildren(actual);

    const tcnKey = "point_f_cvvrs_tcn_remarks";
    const tcn = buildAnswerField(
        { type: "text", kind: "remarks" },
        tcnKey,
        savedAnswers[tcnKey],
        "Part F TCN / Remarks"
    );
    tcn.dataset.requiredAnswer = "false";
    tcnCell.replaceChildren(tcn);
}

function prepareSimulationModeSection(table, savedAnswers = {}) {
    const rows = [...table.rows];
    const heading = rows.find(row =>
        /^H\s*(?:(?:[.):-]|—)\s*)?Simulation mode/i.test(
            row.textContent.replace(/\s+/g, " ").trim()
        )
    );
    if (!heading || table.dataset.simulationModeReady === "true") return;
    table.dataset.simulationModeReady = "true";

    const start = rows.indexOf(heading) + 1;
    const end = rows.findIndex((row, index) =>
        index >= start && Boolean(scheduleSectionHeading(row))
    );
    rows.slice(start, end < 0 ? rows.length : end).forEach((row, rowIndex) => {
        const actualCell = row.cells[2];
        const existing = actualCell?.querySelector("[data-answer-key]");
        if (!actualCell || !existing) return;
        const key = existing.dataset.answerKey || `point_h_${rowIndex + 1}_actual`;
        const field = buildAnswerField(
            { type: "select", kind: "inspection", options: ["Checked OK", "Not OK", "N.A."] },
            key,
            savedAnswers[key],
            `Part H point ${rowIndex + 1} actual value`
        );
        field.dataset.requiredAnswer = "true";
        field.dataset.bulkOkEligible = "true";
        actualCell.replaceChildren(field);
    });
}

function prepareVcdSection(table, savedAnswers = {}) {
    const rows = [...table.rows];
    const heading = rows.find(row =>
        /^I\s*(?:(?:[.):-]|—)\s*)?Check operation of Vigilance Control Device/i.test(
            row.textContent.replace(/\s+/g, " ").trim()
        )
    );
    if (!heading || table.dataset.vcdSectionReady === "true") return;
    table.dataset.vcdSectionReady = "true";

    const start = rows.indexOf(heading);
    const end = rows.findIndex((row, index) =>
        index > start && /^J\s*(?:(?:[.):-]|—)\s*)?ERROR LOG/i.test(
            row.textContent.replace(/\s+/g, " ").trim()
        )
    );
    rows.slice(start + 1, end < 0 ? rows.length : end).forEach(row => row.remove());

    const body = heading.parentElement;
    const insertRow = () => {
        const row = document.createElement("tr");
        body.insertBefore(row, heading.nextSibling);
        return row;
    };
    const insertAfter = (reference, row) => {
        body.insertBefore(row, reference.nextSibling);
        return row;
    };

    heading.replaceChildren();
    const sectionCell = document.createElement("td");
    sectionCell.rowSpan = 5;
    sectionCell.textContent = "I";
    const titleCell = document.createElement("th");
    titleCell.colSpan = 11;
    titleCell.textContent = "Check operation of Vigilance Control Device (VCD)";
    const actionHeader = document.createElement("th");
    actionHeader.colSpan = 5;
    actionHeader.textContent = "Action taken";
    const remarksHeader = document.createElement("th");
    remarksHeader.colSpan = 1;
    remarksHeader.textContent = "Remarks/Name of TCN";
    heading.append(sectionCell, titleCell, actionHeader, remarksHeader);

    const detailRow = insertRow();
    const detailCell = document.createElement("td");
    detailCell.colSpan = 11;
    detailCell.textContent = "VCD becomes active when any one or more operation listed below is not performed for continuous 60 seconds (1 minute)";
    const actionCell = document.createElement("td");
    actionCell.colSpan = 5;
    actionCell.rowSpan = 4;
    const actionKey = "point_i_vcd_action_taken";
    const action = buildAnswerField(
        { type: "text", kind: "action-taken" }, actionKey,
        savedAnswers[actionKey], "Part I VCD action taken"
    );
    action.dataset.requiredAnswer = "false";
    actionCell.appendChild(action);
    const remarksCell = document.createElement("td");
    remarksCell.colSpan = 1;
    remarksCell.rowSpan = 4;
    const remarksKey = "point_i_vcd_remarks_tcn";
    const remarks = buildAnswerField(
        { type: "text", kind: "remarks" }, remarksKey,
        savedAnswers[remarksKey], "Part I VCD Remarks / Name of TCN"
    );
    remarks.dataset.requiredAnswer = "false";
    remarksCell.appendChild(remarks);
    detailRow.append(detailCell, actionCell, remarksCell);

    let previous = detailRow;
    [
        ["i) Change of TE", "ii) Application of PVCD"],
        ["iii) Sander operation", "iv) Application of brake A-9"],
        ["v) Application of brake SA-9"]
    ].forEach(items => {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 11;
        const grid = document.createElement("div");
        grid.className = "vcd-operation-grid";
        items.forEach(item => {
            const entry = document.createElement("span");
            entry.textContent = item;
            grid.appendChild(entry);
        });
        cell.appendChild(grid);
        row.appendChild(cell);
        previous = insertAfter(previous, row);
    });

    const ledHeadingRow = document.createElement("tr");
    const ledHeading = document.createElement("th");
    ledHeading.colSpan = 18;
    ledHeading.textContent = "Check following LED Indication/Status of following items after elapse of 60 sec";
    ledHeadingRow.appendChild(ledHeading);
    previous = insertAfter(previous, ledHeadingRow);

    const ledRow = document.createElement("tr");
    const ledCell = document.createElement("td");
    ledCell.colSpan = 18;
    const ledTable = document.createElement("table");
    ledTable.className = "vcd-indication-grid";
    const headerOne = ledTable.insertRow();
    const snHeader = document.createElement("th");
    snHeader.rowSpan = 3;
    snHeader.textContent = "SN";
    const indicationHeader = document.createElement("th");
    indicationHeader.rowSpan = 3;
    indicationHeader.textContent = "Indication";
    const statusHeader = document.createElement("th");
    statusHeader.colSpan = 8;
    statusHeader.textContent = "Status of Indication";
    headerOne.append(snHeader, indicationHeader, statusHeader);
    const headerTwo = ledTable.insertRow();
    ["From 60 to 68±2 sec", "From 68±2 to 76 sec", "After 76 sec", "After 76 + 34 sec"]
        .forEach(label => {
            const cell = document.createElement("th");
            cell.colSpan = 2;
            cell.textContent = label;
            headerTwo.appendChild(cell);
        });
    const headerThree = ledTable.insertRow();
    for (let index = 0; index < 4; index += 1) {
        ["Std", "Observed"].forEach(label => {
            const cell = document.createElement("th");
            cell.textContent = label;
            headerThree.appendChild(cell);
        });
    }
    const indications = [
        ["LED Indication", "ON", "ON", "ON", "OFF"],
        ["Buzzer sound", "OFF", "ON", "OFF", "OFF"],
        ["VCD Pneumatic Valve", "OFF", "OFF", "ON", "ON"],
        ["Penalty brake", "OFF", "OFF", "ON", "ON"],
        ["Re-setting of VCD by any one or more of the above operations", "YES", "YES", "NO", "Only by re-set switch"]
    ];
    indications.forEach((item, rowIndex) => {
        const row = ledTable.insertRow();
        row.insertCell().textContent = String(rowIndex + 1);
        row.insertCell().textContent = item[0];
        for (let period = 0; period < 4; period += 1) {
            row.insertCell().textContent = item[period + 1];
            const observedCell = row.insertCell();
            const key = `point_i_led_${rowIndex + 1}_observed_${period + 1}`;
            const expectedValue = item[period + 1];
            const isOnOffRow = rowIndex < 4;
            const field = buildAnswerField(
                isOnOffRow
                    ? { type: "select", kind: "inspection", options: ["ON", "OFF"] }
                    : { type: "value", kind: "value" },
                key,
                savedAnswers[key] || (isOnOffRow ? expectedValue : ""),
                `${item[0]} observed value ${period + 1}`
            );
            field.dataset.requiredAnswer = "true";
            if (isOnOffRow) {
                field.dataset.expectedValue = expectedValue;
                field.dataset.bulkOkEligible = "true";
            }
            observedCell.appendChild(field);
            updateAnswerAssessment(field, savedAnswers);
        }
    });
    ledCell.appendChild(ledTable);
    ledRow.appendChild(ledCell);
    insertAfter(previous, ledRow);
}

function addScheduleLogRow(table, savedAnswers = {}, rowNumber = 1) {
    const body = table.tBodies[0] || table.createTBody();
    const row = body.insertRow();
    row.dataset.scheduleLogRow = String(rowNumber);
    row.insertCell().textContent = String(rowNumber);
    const labels = [
        "Date", "Shift", "QC", "Work Details",
        "Name of JE/SSE", "Sign of JE/SSE", "Remarks / TCN Name"
    ];
    labels.forEach((label, columnIndex) => {
        const cell = row.insertCell();
        const key = `schedule_check_13_row_${rowNumber}_col_${columnIndex + 1}`;
        const field = buildAnswerField(
            columnIndex === labels.length - 1
                ? { type: "text", kind: "remarks" }
                : { type: "value", kind: "value" },
            key,
            savedAnswers[key],
            `Schedule log row ${rowNumber}, ${label}`
        );
        field.dataset.requiredAnswer = columnIndex < 4 ? "true" : "false";
        cell.appendChild(field);
    });
    return row;
}

function prepareScheduleLogTable(table, savedAnswers = {}) {
    const headerText = table.rows[0]?.textContent.replace(/\s+/g, " ").trim() || "";
    if (
        !/^SN\s*Date\s*Shift\s*QC\s*Work Details\s*Name of JE\/SSE/i.test(headerText) ||
        table.dataset.scheduleLogReady === "true"
    ) return;
    table.dataset.scheduleLogReady = "true";
    [...table.rows].slice(1).forEach(row => row.remove());

    const savedRows = Object.keys(savedAnswers).reduce((maximum, key) => {
        const match = key.match(/^schedule_check_13_row_(\d+)_col_/);
        return Math.max(maximum, Number(match?.[1] || 0));
    }, 0);
    const rowCount = Math.max(1, savedRows);
    for (let rowNumber = 1; rowNumber <= rowCount; rowNumber += 1) {
        addScheduleLogRow(table, savedAnswers, rowNumber);
    }

    const caption = table.caption || table.createCaption();
    caption.className = "schedule-log-controls";
    caption.innerHTML = '<button type="button" class="add-schedule-log-row" aria-label="Add row" title="Add row">+</button>';
}

function updateAnswerAssessment(field, savedAnswers = {}) {
    if (!field?.dataset.answerKey || field.dataset.fieldKind === "remarks") return;
    const value = field.value.trim();
    let acceptable = null;
    if (field.tagName === "SELECT") {
        acceptable = value
            ? field.dataset.expectedValue
                ? value === field.dataset.expectedValue
                : !window.IcFormControls?.isAdverse(value)
            : null;
    } else if (field.classList.contains("ic-value-input")) {
        const standard = standardValueForField(field);
        field.dataset.standardValue = standard;
        acceptable = window.IcFormControls?.assessMeasurement(value, standard) ?? null;
    }
    field.classList.toggle("answer-valid", acceptable === true);
    field.classList.toggle("answer-invalid", acceptable === false);
    field.setAttribute("aria-invalid", String(acceptable === false));
    const actionKey = `${field.dataset.answerKey}__action_taken`;
    let block = field.closest("td,th")?.querySelector(`[data-action-for="${CSS.escape(field.dataset.answerKey)}"]`);
    const existingActionField = [...(field.closest("tr")?.querySelectorAll(
        '[data-answer-key][data-field-kind="action-taken"]'
    ) || [])].find(item => item !== field && !item.closest(".item-action-taken") && !item.closest(".staff-name-cell"));
    if (existingActionField) {
        const required = acceptable === false;
        existingActionField.hidden = !required;
        existingActionField.disabled = !required || field.disabled || field.readOnly;
        existingActionField.closest("td,th")?.classList.toggle("action-not-required", !required);
        existingActionField.closest("td,th")?.classList.toggle("action-required", required);
        block?.remove();
        return;
    }
    if (acceptable !== false) {
        if (block) {
            block.hidden = true;
            block.querySelector("[data-answer-key]").disabled = true;
        }
        return;
    }
    if (!block) {
        block = document.createElement("label");
        block.className = "item-action-taken";
        block.dataset.actionFor = field.dataset.answerKey;
        block.innerHTML = '<span>Action Taken<br><small>की गई कार्रवाई</small></span>';
        const action = document.createElement("textarea");
        action.className = "cell-answer item-action-input";
        action.dataset.answerKey = actionKey;
        action.dataset.fieldKind = "action-taken";
        action.dataset.requiredAnswer = "false";
        action.placeholder = "Describe action taken / की गई कार्रवाई लिखें";
        action.value = savedAnswers[actionKey] || "";
        action.addEventListener("input", updateCompletion);
        if (field.disabled || field.readOnly) action.disabled = true;
        block.appendChild(action);
        field.closest("td,th").appendChild(block);
    }
    block.hidden = false;
    block.querySelector("[data-answer-key]").disabled = field.disabled || field.readOnly;
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

    const incomingInspection = isIncomingOutgoingInspection();
    tables.forEach((table, tableIndex) => {
        table.dataset.mobileLayout = "single";
        table.classList.remove("mobile-compact-table", "mobile-two-row-table");
        const tableText = table.textContent.replace(/\s+/g, " ").trim();
        const customerFeedbackTable = /customer feed\s*back\s*\/\s*bookings/i.test(tableText);
        const incomingPointATable = /incoming \(when loco is energised\)/i.test(tableText) &&
            /battery voltage/i.test(tableText);
        if (customerFeedbackTable) prepareCustomerFeedbackTable(table);
        if (incomingPointATable) prepareIncomingPointATable(table);
        const columns = prepareBilingualColumns(table);
        if (customerFeedbackTable && columns.remark !== null) {
            [...table.rows].slice(0, 3).forEach(row => {
                const cell = [...row.cells].find(item =>
                    Number(item.dataset.logicalColumn) === columns.remark
                );
                if (cell && /remark|टिप्पणी/i.test(cell.textContent)) {
                    cell.innerHTML = "Remarks<br><small>टिप्पणी</small>";
                }
            });
        }
        const shiftGrid = isScheduleShiftGrid(table);
        if (shiftGrid) table.classList.add("schedule-shift-grid");
        let generatedSerial = 1;
        [...table.rows].forEach((row, rowIndex) => {
            [...row.cells].forEach((cell, cellIndex) => {
                const logicalCellIndex = Number(cell.dataset.logicalColumn ?? cellIndex);
                const plainText =
                    cell.textContent.replace(/\s+/g, " ").trim();

                if (plainText) {
                    if (columns.serial !== null && logicalCellIndex === columns.serial && /^\d+$/.test(plainText)) {
                        generatedSerial = Math.max(generatedSerial, Number(plainText) + 1);
                    }
                    return;
                }

                if (incomingInspection && isIncomingStructuralRow(row)) {
                    cell.classList.add("schedule-structural-cell");
                    return;
                }

                const incomingRowText = row.textContent.replace(/\s+/g, " ").trim();
                const ledStatusRow = /^(?:LED Indication|Buzzer sound|VCD Pneumatic Valve|Penalty brake|Re-setting of VCD)/i
                    .test(incomingRowText.replace(/^\s+/, ""));
                if (
                    incomingInspection &&
                    ledStatusRow &&
                    !/observed/i.test(columnContext(table, rowIndex, logicalCellIndex))
                ) {
                    cell.classList.add("schedule-structural-cell");
                    return;
                }

                if (columns.serial !== null && logicalCellIndex === columns.serial) {
                    cell.textContent = String(generatedSerial++);
                    cell.classList.add("schedule-row-number");
                    return;
                }

                if (
                    shiftGrid && logicalCellIndex === 0 &&
                    [...row.cells].some(item => item !== cell && item.textContent.replace(/\s+/g, " ").trim())
                ) {
                    cell.classList.add("schedule-grid-corner");
                    return;
                }

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

                if (columns.nameRemark !== null && logicalCellIndex === columns.nameRemark) {
                    const resultField = row.querySelector('[data-answer-key][data-field-kind="inspection"]');
                    const resultKey = resultField?.dataset.answerKey || `t${tableIndex}_r${rowIndex}_result`;
                    renderStaffName(cell, resultKey, savedAnswers, attributions);
                    const remarkKey = `${resultKey}__staff_remarks`;
                    const remarkField = buildAnswerField(
                        { type: "text", kind: "remarks" }, remarkKey,
                        savedAnswers[remarkKey], `Remarks row ${rowIndex + 1}`
                    );
                    remarkField.dataset.requiredAnswer = "false";
                    const remarkAttribution = attributions[remarkKey];
                    if (remarkAttribution && remarkField.value.trim()) {
                        remarkField.readOnly = true;
                        remarkField.classList.add("attributed-answer");
                    }
                    cell.appendChild(remarkField);
                    return;
                }

                const key = cell.dataset.answerKey ||
                    `t${tableIndex}_r${rowIndex}_c${cellIndex}`;
                const required = customerFeedbackTable
                    ? false
                    : cell.dataset.requiredAnswer !== undefined
                    ? cell.dataset.requiredAnswer === "true"
                    : cell.dataset.adminFieldType !== "remarks" &&
                        !(columns.remark !== null && logicalCellIndex === columns.remark);
                const label = `Answer row ${rowIndex + 1}, column ${cellIndex + 1}`;
                const usesTypedControls = window.IcFormControls
                    ?.isTypedSchedule(scheduleName);
                const explicitType = cell.dataset.adminFieldType;
                const pointANumber = Number(row.dataset.incomingPointA || 0);
                const pointAConfig = incomingPointATable && pointANumber
                    ? [5,6,7,8,11,12,13,14,15,16,19,20,23].includes(pointANumber)
                        ? { type: "select", kind: "inspection", options: ["Working", "Not Working", "N.A."] }
                        : [21,22].includes(pointANumber)
                            ? { type: "select", kind: "inspection", options: ["Same", "Different", "N.A."] }
                            : { type: "value", kind: "value" }
                    : null;
                const incomingConfig = incomingInspection ? {
                    type: customerFeedbackTable ? "text" : "value",
                    kind: customerFeedbackTable ? "text" : "value"
                } : null;
                const remarksOnlyCell =
                    (columns.remark !== null && logicalCellIndex === columns.remark) ||
                    (columns.nameRemark !== null && logicalCellIndex === columns.nameRemark);
                const explicitConfig = remarksOnlyCell
                    ? { type: "text", kind: "remarks" }
                    : shiftGrid
                    ? { type: "value", kind: "header-detail" }
                    : columns.work !== null && logicalCellIndex === columns.work
                        ? { type: "text", kind: "work-detail" }
                    : explicitType === "value"
                    ? { type: "value", kind: "value" }
                    : explicitType === "yes_no"
                        ? { type: "select", kind: "choice", options: ["Yes", "No"] }
                        : explicitType === "inspection"
                            ? { type: "select", kind: "inspection", options: ["Checked OK", "Not OK", "N.A."] }
                        : explicitType === "remarks"
                            ? { type: "text", kind: "remarks" }
                            : null;
                const config = explicitConfig || pointAConfig || incomingConfig || (usesTypedControls
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
                    !customerFeedbackTable &&
                    (["TEXTAREA", "SELECT"].includes(field.tagName) ||
                        (incomingInspection && field.tagName === "INPUT")) &&
                    (
                        field.dataset.fieldKind === "inspection" ||
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
                updateAnswerAssessment(field, savedAnswers);
            });
        });
        if (incomingPointATable) {
            preparePointNineDualValues(table, savedAnswers);
            prepareSingleCabValueRows(table);
        }
    });

    document.querySelectorAll("[data-answer-key]")
        .forEach(field => updateAnswerAssessment(field, savedAnswers));

    updateCompletion();
}

function scheduleSectionHeading(row) {
    if (row.dataset.sectionTitle) return row.dataset.sectionTitle;
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

function removeScheduleSignatureRows(container) {
    container.querySelectorAll("tr").forEach(row => {
        const labels = [...row.cells]
            .map(cell => cell.textContent.replace(/\s+/g, " ").trim())
            .filter(Boolean);
        if (labels.length === 1 && /^(?:signature|हस्ताक्षर)$/i.test(labels[0])) row.remove();
    });
}

function normalizePointANumbering(sectionRows, sectionTitle) {
    if (!/^A\s+—/i.test(sectionTitle)) return;
    let number = 1;
    sectionRows.forEach(row => {
        if (scheduleSectionHeading(row)) return;
        const cells = [...row.cells];
        if (cells.length < 2) return;
        const fixedPoint = Number(row.dataset.incomingPointA || 0);
        if (fixedPoint) {
            cells[0].replaceChildren(String(fixedPoint));
            cells[0].classList.add("schedule-row-number");
            number = Math.max(number, fixedPoint + 1);
            return;
        }
        const detail = cells.slice(1)
            .map(cell => cell.textContent.replace(/\s+/g, " ").trim())
            .filter(Boolean)
            .join(" ");
        if (
            detail.length < 5 ||
            /(?:check list|जाँच की सूची)|^(?:description|standard value|actual value|cab[- ]?1|cab[- ]?2|function test|axle no|sn\b|क्र\.?\s*सं)/i.test(detail)
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
        if (table.classList.contains("vcd-indication-grid")) return;
        const bulkOkAllowed = table.dataset.bulkOkDisabled !== "true";
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
            toggle.innerHTML = `<span>${section.title.replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character])}</span><b>▼</b>`;
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
            const sectionCommonRows = /^(?:B\s+—\s+GAUGES AND PRESSURE SWITCHES|E\s+—\s+Air delivery measurement|I\s+—\s+Check operation of Vigilance Control Device)/i.test(
                section.title
            ) ? [] : commonRows;
            sectionCommonRows.forEach(row =>
                sectionBody.appendChild(row.cloneNode(true))
            );
            sectionRows.forEach(row => {
                if (row.dataset.feedbackExtraHidden !== "true") row.hidden = false;
                sectionBody.appendChild(row);
            });
            sectionTable.appendChild(sectionBody);
            content.appendChild(sectionTable);
            const eligibleFields = () => sectionRows
                .flatMap(row => [...row.querySelectorAll(
                    'select[data-answer-key][data-field-kind="inspection"]'
                )])
                .filter(field => !field.disabled && !field.readOnly);
            markAll.disabled = eligibleFields().length === 0;
            toggle.addEventListener("click", () => {
                const opening = !card.classList.contains("open");
                card.classList.toggle("open", opening);
                content.hidden = !opening;
                toggle.setAttribute("aria-expanded", String(opening));
                toggle.querySelector("b").textContent = opening ? "▲" : "▼";
                markAll.hidden = !opening || !bulkOkAllowed;
            });
            markAll.addEventListener("click", () => {
                eligibleFields().forEach(field => {
                    if (field.dataset.expectedValue) {
                        field.value = field.dataset.expectedValue;
                        field.dispatchEvent(new Event("change", { bubbles: true }));
                        return;
                    }
                    if (field.value.trim()) return;
                    const positiveValues = [
                        "Checked / Found OK", "Checked OK", "Working",
                        "Same", "Level OK", "OK", "Yes"
                    ];
                    const value = positiveValues.find(candidate =>
                        [...field.options].some(option => option.value === candidate)
                    );
                    if (!value) return;
                    field.value = value;
                    field.dispatchEvent(new Event("change", { bubbles: true }));
                });
                updateCompletion();
            });
            card.append(toggle);
            if (bulkOkAllowed) card.append(markAll);
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
            const hiddenAction = field.dataset.fieldKind === "action-taken" &&
                field.closest(".item-action-taken")?.hidden;
            answers[field.dataset.answerKey] = hiddenAction ? "" : field.value.trim();
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
        ".mark-section-ok, .add-customer-feedback-row, .add-schedule-log-row"
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
            removeScheduleSignatureRows(container);
            removeSignatureRemarksColumns(container);
            createAnswerFields(
                submission?.form_answers || {},
                submission?.answer_attributions || {},
                loadedScheduleName
            );
            moveGaugePressureRowsIntoPointA(
                container,
                submission?.form_answers || {}
            );
            container.querySelectorAll("table").forEach(
                prepareSingleCabValueRows
            );
            container.querySelectorAll("table").forEach(table =>
                preparePointTwentySevenToTwentyNine(
                    table,
                    submission?.form_answers || {}
                )
            );
            window.BilingualScheduleActivities?.enhance(
                container
            );
            container.querySelectorAll("table").forEach(table =>
                preparePointThirtyFunctionTest(
                    table,
                    submission?.form_answers || {}
                )
            );
            container.querySelectorAll("table").forEach(table =>
                preparePointThirtyOneBurTest(
                    table,
                    submission?.form_answers || {}
                )
            );
            container.querySelectorAll("table").forEach(table =>
                preparePointThirtyTwoToThirtyFour(
                    table,
                    submission?.form_answers || {}
                )
            );
            container.querySelectorAll("table").forEach(table =>
                prepareGaugePressureSection(
                    table,
                    submission?.form_answers || {}
                )
            );
            container.querySelectorAll("table").forEach(table =>
                prepareRotatingMachinesSection(
                    table,
                    submission?.form_answers || {}
                )
            );
            container.querySelectorAll("table").forEach(table =>
                prepareWhileEnergisedSection(
                    table,
                    submission?.form_answers || {}
                )
            );
            container.querySelectorAll("table").forEach(table =>
                prepareAirDeliverySection(
                    table,
                    submission?.form_answers || {}
                )
            );
            container.querySelectorAll("table").forEach(table =>
                prepareCvvrsSection(
                    table,
                    submission?.form_answers || {}
                )
            );
            container.querySelectorAll("table").forEach(table =>
                prepareSimulationModeSection(
                    table,
                    submission?.form_answers || {}
                )
            );
            container.querySelectorAll("table").forEach(table =>
                prepareVcdSection(
                    table,
                    submission?.form_answers || {}
                )
            );
            container.querySelectorAll("table").forEach(table =>
                prepareScheduleLogTable(
                    table,
                    submission?.form_answers || {}
                )
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

    document.getElementById("templateContainer").addEventListener("click", event => {
        const addLogButton = event.target.closest(".add-schedule-log-row");
        if (addLogButton) {
            event.preventDefault();
            event.stopPropagation();
            const table = addLogButton.closest("table");
            const nextNumber = table?.querySelectorAll("tr[data-schedule-log-row]").length + 1;
            if (table && nextNumber) {
                addScheduleLogRow(table, {}, nextNumber);
                updateCompletion();
            }
            return;
        }
        const button = event.target.closest(".add-customer-feedback-row");
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        const table = button.closest("table");
        const nextRow = table?.querySelector('tr[data-feedback-extra-hidden="true"]');
        if (!nextRow) {
            button.disabled = true;
            return;
        }
        nextRow.hidden = false;
        delete nextRow.dataset.feedbackExtraHidden;
        if (!table.querySelector('tr[data-feedback-extra-hidden="true"]')) button.disabled = true;
        updateCompletion();
    });

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
