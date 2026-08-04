const SUPABASE_URL = "https://cgbnuyltwqdazyejottk.supabase.co";
const SUPABASE_KEY = "sb_publishable_QA6Obxmmpy7GT9NOWtwHIQ_yNs91LID";
const positionDb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const layout = [
    { line: "8", adi: "LINE 8 ADI", kll: "LINE 8 KLL", splitAdi: true },
    { line: "7", adi: "LINE 7 ADI", kll: "LINE 7 KLL", splitAdi: true },
    { line: "6", adi: "LINE 6 ADI", kll: "LINE 6 KLL", wash: "NEW WASH HOUSE 2", washLabel: "NEW WASH HOUSE 2", splitAdi: true },
    { line: "5", adi: "LINE 5 ADI", kll: "LINE 5 KLL", wash: "NEW WASH HOUSE 1", washLabel: "NEW WASH HOUSE 1", splitAdi: true },
    { line: "4", adi: "LINE 4 ADI", kll: "LINE 4 KLL", splitAdi: true },
    { line: "3", adi: "LINE 3 ADI", kll: "LINE 3 KLL", wash: "OLD WASH HOUSE 2", washLabel: "OLD WASH HOUSE 2", splitAdi: true },
    { line: "2", adi: "LINE 2 ADI", kll: "LINE 2 KLL", wash: "OLD WASH HOUSE 1", washLabel: "OLD WASH HOUSE 1", splitAdi: true },
    { line: "1", adi: "LINE 1 ADI", kll: "LINE 1 KLL" },
    { line: "0", adi: "LINE 0 ADI", kll: "LINE 0 KLL" },
    { line: "E1", adi: "E1 ADI", kll: "E1 KLL" },
    { line: "E2", adi: "E2 ADI", kll: "E2 KLL" }
];

const positions = layout.flatMap(row => [row.adi, row.kll, row.wash].filter(Boolean));
const board = document.getElementById("board");
const message = document.getElementById("boardMessage");
const positionSelect = document.getElementById("positionSelect");
const entryBody = document.querySelector("#entryTable tbody");
const loginPanel = document.getElementById("loginPanel");
const adminPanel = document.getElementById("adminPanel");
const searchBox = document.getElementById("searchBox");
let positionData = [];
let activeFilter = "all";
let isAdmin = sessionStorage.getItem("trackingAdmin") === "true";

function safe(value) {
    const node = document.createElement("span");
    node.textContent = value ?? "";
    return node.innerHTML;
}

function statusClass(status) {
    return String(status || "stable").toLowerCase().replace(/[^a-z]+/g, "-");
}

function itemsAt(position) {
    return positionData.filter(item => item.position === position).sort((left, right) => {
        const leftId = Number(left.id);
        const rightId = Number(right.id);
        if (Number.isFinite(leftId) && Number.isFinite(rightId)) return leftId - rightId;
        return new Date(left.updated_at || 0) - new Date(right.updated_at || 0);
    });
}

function locoCards(items, startNumber = 1, emptyText = "Available") {
    if (!items.length) return `<div class="empty-slot">${safe(emptyText)}</div>`;
    return items.map((item, index) => `
        <div class="loco-card" data-loco="${safe(item.loco_no).toUpperCase()}">
            <span class="sequence" title="Shunting order">${startNumber + index}</span>
            <div class="loco-identity"><strong>${safe(item.loco_no)}</strong><small>${safe(item.loco_type || "Type not set")}</small></div>
            <span class="status-badge ${statusClass(item.status)}">${safe(item.status || "Stable")}</span>
        </div>`).join("");
}

function bay(title, subtitle, position, className, items, startNumber = 1) {
    return `<article class="track-bay ${className}" data-position="${safe(position)}" data-occupied="${items.length > 0}">
        <header><div><strong>${safe(title)}</strong><span>${safe(subtitle)}</span></div><b>${items.length || "—"}</b></header>
        <div class="loco-stack">${locoCards(items, startNumber)}</div>
    </article>`;
}

function renderLine(row) {
    const adiItems = itemsAt(row.adi);
    const kllItems = itemsAt(row.kll);
    const washItems = row.wash ? itemsAt(row.wash) : [];
    let adiMarkup;

    if (row.splitAdi) {
        const outsideCount = Math.max(0, adiItems.length - 3);
        const outsideItems = adiItems.slice(0, outsideCount);
        const roofedItems = adiItems.slice(outsideCount);
        adiMarkup = `
            ${bay("ADI SIDE", "OPEN AREA · ADDITIONAL", row.adi, "open-bay derived-bay", outsideItems, roofedItems.length + 1)}
            ${bay("ADI SIDE", "ROOFED · MAX 3 LOCOS", row.adi, "roofed-bay derived-bay", roofedItems, 1)}`;
    } else {
        adiMarkup = bay("ADI SIDE", "TRACK POSITION", row.adi, "adi-bay wide-adi", adiItems, 1);
    }

    const occupied = adiItems.length + kllItems.length + washItems.length;
    return `<section class="line-section ${row.wash ? "has-wash" : ""}" data-line="${safe(row.line)}" data-occupied="${occupied > 0}">
        <div class="line-track">
            ${row.wash ? bay(row.washLabel, "WASH HOUSE BAY", row.wash, "wash-bay", washItems, 1) : '<div class="wash-spacer" aria-hidden="true"></div>'}
            ${adiMarkup}
            <div class="line-marker"><span>LINE</span><strong>${safe(row.line)}</strong></div>
            ${bay("KLL SIDE", "TRACK POSITION", row.kll, "kll-bay", kllItems, 1)}
        </div>
    </section>`;
}

function buildBoard() {
    positionSelect.innerHTML = positions.map(position => `<option value="${safe(position)}">${safe(position)}</option>`).join("");
    renderBoard();
}

function applyFilter() {
    document.querySelectorAll(".line-section").forEach(section => {
        const occupied = section.dataset.occupied === "true";
        section.hidden = activeFilter === "occupied" ? !occupied : activeFilter === "vacant" ? occupied : false;
    });
}

function renderBoard() {
    board.innerHTML = layout.map(renderLine).join("");
    applyFilter();
}

function updateSummary() {
    const occupied = new Set(positionData.map(item => item.position).filter(position => positions.includes(position))).size;
    document.getElementById("totalLocos").textContent = positionData.length;
    document.getElementById("occupiedLocations").textContent = occupied;
    document.getElementById("vacantLocations").textContent = positions.length - occupied;
    if (!positionData.length) {
        document.getElementById("lastUpdated").textContent = "No entries";
        document.getElementById("updatedBy").textContent = "--";
        return;
    }
    document.getElementById("lastUpdated").textContent = new Date(positionData[0].updated_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    document.getElementById("updatedBy").textContent = `by ${positionData[0].updated_by || "--"}`;
}

async function loadData() {
    message.textContent = "Loading live positions...";
    const { data, error } = await positionDb.from("loco_positions").select("*").order("updated_at", { ascending: false });
    if (error) {
        message.textContent = `Unable to load live positions: ${error.message}`;
        return;
    }
    positionData = data || [];
    updateSummary();
    renderBoard();
    message.textContent = "";
}

function refreshOrderNumbers() {
    const rows = [...entryBody.querySelectorAll("tr")];
    const splitAdi = /^LINE [2-8] ADI$/.test(positionSelect.value);
    const outsideCount = splitAdi ? Math.max(0, rows.length - 3) : 0;
    rows.forEach((row, index) => {
        const sequence = splitAdi && outsideCount ? (index < outsideCount ? index + 4 : index - outsideCount + 1) : index + 1;
        row.querySelector(".editor-sequence").textContent = sequence;
        row.querySelector(".move-up").disabled = index === 0;
        row.querySelector(".move-down").disabled = index === entryBody.children.length - 1;
    });
}

function addEntryRow(item = {}) {
    const row = document.createElement("tr");
    row.innerHTML = `
        <td><span class="editor-sequence">1</span></td>
        <td><input class="loco-no" value="${safe(item.loco_no || "")}" inputmode="numeric" placeholder="Loco number"></td>
        <td><input class="loco-type" value="${safe(item.loco_type || "")}" placeholder="Loco type"></td>
        <td><select class="loco-status">${["Stable", "Maintenance", "Painting", "Ineffective", "Condemnation", "Washing"].map(status => `<option ${status === (item.status || "Stable") ? "selected" : ""}>${status}</option>`).join("")}</select></td>
        <td class="row-actions"><button class="order-button move-up" type="button" title="Move forward" aria-label="Move loco forward">&uarr;</button><button class="order-button move-down" type="button" title="Move behind" aria-label="Move loco behind">&darr;</button><button class="remove-button" type="button" aria-label="Remove loco">Remove</button></td>`;
    row.querySelector(".remove-button").addEventListener("click", () => { row.remove(); refreshOrderNumbers(); });
    row.querySelector(".move-up").addEventListener("click", () => { if (row.previousElementSibling) entryBody.insertBefore(row, row.previousElementSibling); refreshOrderNumbers(); });
    row.querySelector(".move-down").addEventListener("click", () => { if (row.nextElementSibling) entryBody.insertBefore(row.nextElementSibling, row); refreshOrderNumbers(); });
    entryBody.appendChild(row);
    refreshOrderNumbers();
}

function loadPositionEditor() {
    entryBody.innerHTML = "";
    const items = itemsAt(positionSelect.value);
    (items.length ? items : [{}]).forEach(addEntryRow);
}

async function savePosition() {
    const position = positionSelect.value;
    const records = [...entryBody.querySelectorAll("tr")].map(row => ({
        loco_no: row.querySelector(".loco-no").value.trim(),
        loco_type: row.querySelector(".loco-type").value.trim(),
        status: row.querySelector(".loco-status").value,
        position,
        updated_by: document.getElementById("adminUser").dataset.user || "ADMIN ML"
    })).filter(item => item.loco_no);
    const duplicate = records.find((item, index) => records.findIndex(other => other.loco_no.toUpperCase() === item.loco_no.toUpperCase()) !== index);
    if (duplicate) { alert(`Duplicate loco number: ${duplicate.loco_no}`); return; }
    const saveButton = document.getElementById("saveAllBtn");
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";
    try {
        const { error: deleteError } = await positionDb.from("loco_positions").delete().eq("position", position);
        if (deleteError) throw deleteError;
        if (records.length) {
            const { error: moveError } = await positionDb.from("loco_positions").delete().in("loco_no", records.map(item => item.loco_no));
            if (moveError) throw moveError;
            const { error: insertError } = await positionDb.from("loco_positions").insert(records);
            if (insertError) throw insertError;
        }
        await loadData();
        loadPositionEditor();
        message.textContent = `${position} and its shunting order saved successfully.`;
    } catch (error) { alert(error.message); }
    finally { saveButton.disabled = false; saveButton.textContent = "Save Position"; }
}

function findLoco() {
    document.querySelectorAll(".loco-card.highlight").forEach(card => card.classList.remove("highlight"));
    const value = searchBox.value.trim().toUpperCase();
    if (!value) { message.textContent = "Enter a loco number to search."; searchBox.focus(); return; }
    const cards = [...document.querySelectorAll(".loco-card[data-loco]")];
    const card = cards.find(item => item.dataset.loco === value) || cards.find(item => item.dataset.loco.includes(value));
    if (!card) { message.textContent = `Loco ${value} is not currently shown in the shed.`; return; }
    activeFilter = "all";
    setActiveFilterButton("all");
    applyFilter();
    const bayElement = card.closest(".track-bay");
    message.textContent = `Loco ${card.dataset.loco}: ${bayElement.querySelector("header strong").textContent}, Line ${card.closest(".line-section").dataset.line}, shunting position ${card.querySelector(".sequence").textContent}.`;
    card.classList.add("highlight");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
}

function setActiveFilterButton(filter) {
    document.querySelectorAll(".filter-button").forEach(button => {
        const selected = button.dataset.filter === filter;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
    });
}

document.getElementById("searchBtn").addEventListener("click", findLoco);
searchBox.addEventListener("keydown", event => { if (event.key === "Enter") findLoco(); });
document.querySelectorAll(".filter-button").forEach(button => button.addEventListener("click", () => { activeFilter = button.dataset.filter; setActiveFilterButton(activeFilter); applyFilter(); }));
document.getElementById("adminLoginBtn").addEventListener("click", () => {
    if (isAdmin) { isAdmin = false; sessionStorage.removeItem("trackingAdmin"); adminPanel.hidden = true; loginPanel.hidden = true; document.getElementById("adminLoginBtn").textContent = "Authorized Login"; return; }
    loginPanel.hidden = !loginPanel.hidden;
    if (!loginPanel.hidden) document.getElementById("adminUser").focus();
});
document.getElementById("loginSubmit").addEventListener("click", () => {
    const user = document.getElementById("adminUser").value.trim();
    const pass = document.getElementById("adminPass").value;
    if (user !== "ADMIN ML" || pass !== "1234") { alert("Invalid username or password."); return; }
    isAdmin = true;
    sessionStorage.setItem("trackingAdmin", "true");
    document.getElementById("adminUser").dataset.user = user;
    loginPanel.hidden = true;
    adminPanel.hidden = false;
    document.getElementById("adminLoginBtn").textContent = "Exit Update Mode";
    loadPositionEditor();
});
document.getElementById("adminPass").addEventListener("keydown", event => { if (event.key === "Enter") document.getElementById("loginSubmit").click(); });
document.getElementById("addRowBtn").addEventListener("click", () => addEntryRow());
document.getElementById("saveAllBtn").addEventListener("click", savePosition);
positionSelect.addEventListener("change", loadPositionEditor);
document.getElementById("pdfBtn").addEventListener("click", () => {
    const doc = new window.jspdf.jsPDF();
    doc.setFontSize(16); doc.text("SBI Shed Live Position Board", 14, 16);
    doc.setFontSize(9); doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, 22);
    const rows = [];
    layout.forEach(line => [line.wash, line.adi, line.kll].filter(Boolean).forEach(position => {
        const items = itemsAt(position);
        const outsideCount = line.splitAdi && position === line.adi ? Math.max(0, items.length - 3) : 0;
        items.forEach((item, index) => {
            const sequence = outsideCount ? (index < outsideCount ? index + 4 : index - outsideCount + 1) : index + 1;
            const area = outsideCount && index < outsideCount ? "Open" : (line.splitAdi && position === line.adi ? "Roofed" : position);
            rows.push([`${position} · ${area}`, sequence, item.loco_no, item.loco_type, item.status]);
        });
    }));
    doc.autoTable({ startY: 27, head: [["Position", "Order", "Loco No.", "Type", "Status"]], body: rows, theme: "grid", headStyles: { fillColor: [38, 63, 50] }, alternateRowStyles: { fillColor: [244, 240, 232] } });
    doc.save("SBI-Shed-Loco-Position.pdf");
});

buildBoard();
if (isAdmin) { adminPanel.hidden = false; document.getElementById("adminLoginBtn").textContent = "Exit Update Mode"; }
if (new URLSearchParams(window.location.search).get("login") === "1" && !isAdmin) loginPanel.hidden = false;
loadData().then(loadPositionEditor);
