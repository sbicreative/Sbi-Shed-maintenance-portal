const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

const salt = "00112233445566778899aabbccddeeff";
process.env.ADMIN_USERNAME = "test-admin";
process.env.ADMIN_PASSWORD_HASH = `scrypt$${salt}$${crypto.scryptSync("test-password-123", salt, 64).toString("hex")}`;

const { app } = require("../server");

async function withServer(run) {
    const server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    try { await run(`http://127.0.0.1:${server.address().port}`); }
    finally { await new Promise(resolve => server.close(resolve)); }
}

test("admin APIs reject unauthenticated access", () => withServer(async base => {
    const response = await fetch(`${base}/api/admin/masters/departments`);
    assert.equal(response.status, 401);
}));

test("admin login creates HttpOnly session and CSRF protects logout", () => withServer(async base => {
    const login = await fetch(`${base}/api/admin/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "test-admin", password: "test-password-123" }) });
    assert.equal(login.status, 200);
    assert.match(login.headers.get("set-cookie"), /HttpOnly/i);
    assert.match(login.headers.get("set-cookie"), /SameSite=Strict/i);
    const body = await login.json();
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const denied = await fetch(`${base}/api/admin/auth/logout`, { method: "POST", headers: { Cookie: cookie } });
    assert.equal(denied.status, 403);
    const logout = await fetch(`${base}/api/admin/auth/logout`, { method: "POST", headers: { Cookie: cookie, "X-CSRF-Token": body.csrfToken } });
    assert.equal(logout.status, 200);
}));

test("public registration cannot create an admin role", () => withServer(async base => {
    const response = await fetch(`${base}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Fake Admin", mobile_no_cug: "9999999999", pf_no: "123", role: "admin" }) });
    assert.equal(response.status, 403);
}));
