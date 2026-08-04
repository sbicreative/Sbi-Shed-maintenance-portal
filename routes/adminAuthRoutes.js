const express = require("express");
const { verifyPassword, createSession, sessionCookie, clearCookie, getSession, requireAdmin, requireCsrf, destroySession } = require("../lib/adminAuth");

const router = express.Router();
const attempts = new Map();

router.post("/login", (req, res) => {
    const key = req.ip;
    const state = attempts.get(key) || { count: 0, blockedUntil: 0 };
    if (state.blockedUntil > Date.now()) return res.status(429).json({ success: false, message: "Too many attempts. Try again later." });
    const configuredUser = String(process.env.ADMIN_USERNAME || "");
    const username = String(req.body.username || "").trim();
    const valid = configuredUser && process.env.ADMIN_PASSWORD_HASH && username === configuredUser && verifyPassword(req.body.password);
    if (!valid) {
        state.count += 1;
        if (state.count >= 5) { state.count = 0; state.blockedUntil = Date.now() + 15 * 60 * 1000; }
        attempts.set(key, state);
        return res.status(401).json({ success: false, message: "Invalid admin credentials." });
    }
    attempts.delete(key);
    const session = createSession(username);
    res.setHeader("Set-Cookie", sessionCookie(session.token));
    res.json({ success: true, user: { username, role: "admin" }, csrfToken: session.csrfToken, dashboard: "/dashboard/admin.html" });
});

router.get("/session", (req, res) => {
    const session = getSession(req);
    if (!session) return res.status(401).json({ success: false });
    res.json({ success: true, user: { username: session.username, role: session.role }, csrfToken: session.csrfToken });
});

router.post("/logout", requireAdmin, requireCsrf, (req, res) => {
    destroySession(req);
    res.setHeader("Set-Cookie", clearCookie());
    res.json({ success: true });
});

module.exports = router;
