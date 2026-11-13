import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadJobs } from "../lib/jobs.js";
import { addSaved, readSaved, removeSaved, savedJobs, writeSaved } from "../lib/saved.js";
import { createApp } from "../server.js";

test("addSaved keeps order and ignores duplicates", () => {
  assert.deepEqual(addSaved(["j1"], "j2"), ["j1", "j2"]);
  assert.deepEqual(addSaved(["j1", "j2"], "j1"), ["j1", "j2"]);
});

test("removeSaved removes one id and tolerates unknown ids", () => {
  assert.deepEqual(removeSaved(["j1", "j2"], "j1"), ["j2"]);
  assert.deepEqual(removeSaved(["j1"], "zzz"), ["j1"]);
});

test("savedJobs returns full jobs in saved order and skips deleted jobs", async () => {
  const jobs = await loadJobs();
  const result = savedJobs(jobs, ["j3", "gone", "j1"]);
  assert.deepEqual(result.map((j) => j.id), ["j3", "j1"]);
  assert.equal(result[0].company, "Tarang Media");
});

test("readSaved returns [] when the file does not exist, and round-trips writes", async () => {
  const path = join(await mkdtemp(join(tmpdir(), "saved-")), "saved.json");
  assert.deepEqual(await readSaved(path), []);
  await writeSaved(["j2", "j5"], path);
  assert.deepEqual(await readSaved(path), ["j2", "j5"]);
});

// --- API, against a real server on a random port and a temporary file ---
async function withApp(fn) {
  const savedPath = join(await mkdtemp(join(tmpdir(), "saved-")), "saved.json");
  const server = createApp({ savedPath });
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  const call = (method, path, body) =>
    fetch(base + path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
  try {
    await fn(call);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

test("API: save, list, save again, remove", async () => {
  await withApp(async (call) => {
    assert.deepEqual(await (await call("GET", "/api/saved")).json(), []);

    assert.equal((await call("POST", "/api/saved", { jobId: "j2" })).status, 201);
    assert.equal((await call("POST", "/api/saved", { jobId: "j2" })).status, 200); // already saved
    assert.equal((await call("POST", "/api/saved", { jobId: "j6" })).status, 201);

    const list = await (await call("GET", "/api/saved")).json();
    assert.deepEqual(list.map((j) => j.id), ["j2", "j6"]);
    assert.equal(list[0].title, "Frontend Developer Intern");

    assert.equal((await call("DELETE", "/api/saved/j2")).status, 204);
    assert.deepEqual((await (await call("GET", "/api/saved")).json()).map((j) => j.id), ["j6"]);
  });
});

test("API: rejects bad input and unknown ids", async () => {
  await withApp(async (call) => {
    assert.equal((await call("POST", "/api/saved", { jobId: "nope" })).status, 404);
    assert.equal((await call("POST", "/api/saved", {})).status, 400);
    assert.equal((await call("POST", "/api/saved", { jobId: 5 })).status, 400);
    assert.equal((await call("DELETE", "/api/saved/j1")).status, 404); // not saved
  });
});

test("API: many simultaneous saves are all kept", async () => {
  await withApp(async (call) => {
    const ids = ["j1", "j2", "j3", "j4", "j5", "j6"];
    await Promise.all(ids.map((jobId) => call("POST", "/api/saved", { jobId })));
    const saved = (await (await call("GET", "/api/saved")).json()).map((j) => j.id);
    assert.deepEqual([...saved].sort(), ids);
  });
});
