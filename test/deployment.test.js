const test = require("node:test");
const assert = require("node:assert/strict");

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
    ["/tracking/", /text\/html/]
]) {
    test(`serves ${path}`, async () => {
        const response = await fetch(`${baseUrl}${path}`);
        assert.equal(response.status, 200);
        assert.match(response.headers.get("content-type"), contentType);
    });
}
