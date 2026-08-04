const crypto = require("crypto");

const sessions = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const COOKIE_NAME = "sbi_admin_session";

function parseCookies(header = "") {
    return Object.fromEntries(header.split(";").map(item => item.trim()).filter(Boolean).map(item => {
        const index = item.indexOf("=");
        return [decodeURIComponent(item.slice(0, index)), decodeURIComponent(item.slice(index + 1))];
    }));
}

function safeEqual(left, right) {
    const a = Buffer.from(String(left));
    const b = Buffer.from(String(right));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyPassword(password) {
    const encoded = String(process.env.ADMIN_PASSWORD_HASH || "");
    const [scheme, salt, expected] = encoded.split("$");
    if (scheme !== "scrypt" || !salt || !expected) return false;
    const actual = crypto.scryptSync(String(password), salt, 64).toString("hex");
    return safeEqual(actual, expected);
}

function createSession(username) {
    const token = crypto.randomBytes(32).toString("base64url");
    const csrfToken = crypto.randomBytes(24).toString("base64url");
    sessions.set(token, { username, role: "admin", csrfToken, expiresAt: Date.now() + SESSION_TTL_MS });
    return { token, csrfToken };
}

function sessionCookie(token) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}${secure}`;
}

function clearCookie() {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

function getSession(req) {
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
    const session = token && sessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
        if (token) sessions.delete(token);
        return null;
    }
    return { token, ...session };
}

function requireAdmin(req, res, next) {
    const session = getSession(req);
    if (!session) return res.status(401).json({ success: false, message: "Admin authentication required." });
    req.admin = session;
    next();
}

function requireCsrf(req, res, next) {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
    if (!req.admin || !safeEqual(req.headers["x-csrf-token"] || "", req.admin.csrfToken)) {
        return res.status(403).json({ success: false, message: "Invalid security token. Refresh and try again." });
    }
    next();
}

function destroySession(req) {
    const session = getSession(req);
    if (session) sessions.delete(session.token);
}

module.exports = { verifyPassword, createSession, sessionCookie, clearCookie, getSession, requireAdmin, requireCsrf, destroySession };
