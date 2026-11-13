// A small job board: a JSON API and one page. Run with `npm start`.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { findJob, loadJobs, searchJobs } from "./lib/jobs.js";
import { addSaved, DEFAULT_SAVED_PATH, readSaved, removeSaved, savedJobs, writeSaved } from "./lib/saved.js";

const PORT = Number(process.env.PORT ?? 3000);

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

// savedPath is a parameter so tests can use a temporary file.
export function createApp({ savedPath = DEFAULT_SAVED_PATH } = {}) {
  // Saving reads the file, changes it and writes it back. Run those one after
  // another so two quick requests cannot overwrite each other.
  let queue = Promise.resolve();
  const exclusive = (task) => (queue = queue.then(task, task));

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");

      if (url.pathname === "/api/saved" && req.method === "GET") {
        const [jobs, ids] = await Promise.all([loadJobs(), readSaved(savedPath)]);
        return sendJson(res, 200, savedJobs(jobs, ids));
      }
      if (url.pathname === "/api/saved" && req.method === "POST") {
        let body;
        try {
          body = await readBody(req);
        } catch {
          return sendJson(res, 400, { error: "Body must be JSON" });
        }
        if (typeof body.jobId !== "string") return sendJson(res, 400, { error: "jobId is required" });
        if (!findJob(await loadJobs(), body.jobId)) return sendJson(res, 404, { error: "No such job" });
        const created = await exclusive(async () => {
          const ids = await readSaved(savedPath);
          if (ids.includes(body.jobId)) return false;
          await writeSaved(addSaved(ids, body.jobId), savedPath);
          return true;
        });
        return sendJson(res, created ? 201 : 200, { jobId: body.jobId, saved: true });
      }
      const removing = url.pathname.match(/^\/api\/saved\/([^/]+)$/);
      if (removing && req.method === "DELETE") {
        const id = decodeURIComponent(removing[1]);
        const removed = await exclusive(async () => {
          const ids = await readSaved(savedPath);
          if (!ids.includes(id)) return false;
          await writeSaved(removeSaved(ids, id), savedPath);
          return true;
        });
        if (!removed) return sendJson(res, 404, { error: "Job is not saved" });
        res.writeHead(204);
        return res.end();
      }

      if (req.method === "GET" && url.pathname === "/api/jobs") {
        const jobs = await loadJobs();
        return sendJson(res, 200, searchJobs(jobs, url.searchParams.get("q")));
      }
      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/app.js")) {
        const file = url.pathname === "/" ? "index.html" : "app.js";
        const type = file.endsWith(".html") ? "text/html" : "text/javascript";
        const body = await readFile(new URL(`./public/${file}`, import.meta.url));
        res.writeHead(200, { "content-type": `${type}; charset=utf-8` });
        return res.end(body);
      }
      sendJson(res, 404, { error: "Not found" });
    } catch (err) {
      console.error(err);
      sendJson(res, 500, { error: "Something went wrong" });
    }
  });
}

// Started directly (npm start), not imported by a test.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createApp().listen(PORT, () => console.log(`Job board on http://localhost:${PORT}`));
}
