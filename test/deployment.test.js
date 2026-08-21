const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { app } = require("../server");

let server;
let baseUrl;

test.before(async () => {
    await new Promise(resolve => {
        server = app.listen(0, "127.0.0.1", () => {
            baseUrl = `http://127.0.0.1:${server.address().port}`;
            resolve();
        });
    });
});

test.after(async () => {
    await new Promise((resolve, reject) =>
        server.close(error => error ? reject(error) : resolve())
    );
});

test("health check is ready for Render", async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /application\/json/);
    assert.equal((await response.json()).status, "ok");
});

test("root redirects to the portal", async () => {
    const response = await fetch(`${baseUrl}/`, { redirect: "manual" });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/portal.html");
});

test("API validation works without contacting or changing Supabase", async () => {
    const response = await fetch(`${baseUrl}/api/assign-work/summary`);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).success, false);
});

for (const [path, contentType] of [
    ["/portal.html", /text\/html/],
    ["/manifest.webmanifest", /application\/manifest\+json|application\/json/],
    ["/service-worker.js", /javascript/],
    ["/dashboard/login.html", /text\/html/],
    ["/dashboard/repairs-schedule.html", /text\/html/],
    ["/tracking/", /text\/html/]
]) {
    test(`serves ${path}`, async () => {
        const response = await fetch(`${baseUrl}${path}`);
        assert.equal(response.status, 200);
        assert.match(response.headers.get("content-type"), contentType);
    });
}

test("PWA install button stays available with browser-specific fallback", () => {
    const pwa = fs.readFileSync(path.join(__dirname, "..", "public", "js", "pwa.js"), "utf8");
    assert.match(pwa, /link\[rel="manifest"\]/);
    assert.match(pwa, /manifest\.webmanifest/);
    assert.match(pwa, /installButton\.hidden = isStandalone/);
    assert.match(pwa, /Install app या Add to Home screen/);
});

test("portal and Incharge demo preparation features remain deployed together", () => {
    const portal = fs.readFileSync(path.join(__dirname, "..", "public", "portal.html"), "utf8");
    const portalClient = fs.readFileSync(path.join(__dirname, "..", "public", "js", "portal.js"), "utf8");
    const incharge = fs.readFileSync(path.join(__dirname, "..", "public", "dashboard", "incharge.html"), "utf8");
    const inchargeClient = fs.readFileSync(path.join(__dirname, "..", "public", "js", "incharge.js"), "utf8");
    const assignRoute = fs.readFileSync(path.join(__dirname, "..", "routes", "assignWorkRoutes.js"), "utf8");
    assert.match(portal, /id="installAppBtn"/);
    assert.match(portalClient, /deferredInstallPrompt/);
    assert.match(incharge, /<th>Work<\/th>\s*<th>Supervisor<\/th>/);
    assert.match(inchargeClient, /loadTodaysActivity/);
    assert.match(assignRoute, /router\.get\("\/today"/);
});
