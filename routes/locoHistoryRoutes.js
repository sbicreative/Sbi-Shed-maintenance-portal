const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const historyPath = path.join(__dirname, "..", "data", "loco-history.json");

function loadHistory() {
    return JSON.parse(fs.readFileSync(historyPath, "utf8")).records || [];
}

router.get("/", (req, res) => {
    try {
        const locoNo = String(req.query.loco_no || "").trim().toLowerCase();
        const schedule = String(req.query.schedule || "").trim().toLowerCase();
        const locoType = String(req.query.loco_type || "").trim().toLowerCase();
        const records = loadHistory()
            .filter(item => !locoNo || String(item.locoNo).toLowerCase() === locoNo)
            .filter(item => !schedule || String(item.schedule).toLowerCase() === schedule)
            .filter(item => !locoType || String(item.locoType).toLowerCase() === locoType)
            .sort((left, right) => {
                const leftDate = left.shedRelease || left.scheduleCompletion || left.shedArrival || "";
                const rightDate = right.shedRelease || right.scheduleCompletion || right.shedArrival || "";
                return rightDate.localeCompare(leftDate);
            });
        res.json({ success: true, records });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
