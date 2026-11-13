// Saved jobs. We store only the job ids, in the order they were saved, and
// look the full job up from jobs.json when listing. That way a saved job never
// goes out of date if the job's details change.
import { readFile, writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const DEFAULT_SAVED_PATH = new URL("../saved.json", import.meta.url);

/** Saved job ids. A missing file just means nothing is saved yet. */
export async function readSaved(path = DEFAULT_SAVED_PATH) {
  try {
    const ids = JSON.parse(await readFile(path, "utf8"));
    return Array.isArray(ids) ? ids : [];
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

/** Write to a temp file, then rename, so a crash never leaves half a file. */
export async function writeSaved(ids, path = DEFAULT_SAVED_PATH) {
  const file = path instanceof URL ? fileURLToPath(path) : String(path);
  await writeFile(`${file}.tmp`, JSON.stringify(ids, null, 2));
  await rename(`${file}.tmp`, file);
}

/** Adding twice is harmless: the id appears once. */
export function addSaved(ids, id) {
  return ids.includes(id) ? ids : [...ids, id];
}

export function removeSaved(ids, id) {
  return ids.filter((x) => x !== id);
}

/** Full jobs for the saved ids, in saved order. Ids with no matching job are skipped. */
export function savedJobs(jobs, ids) {
  const byId = new Map(jobs.map((j) => [j.id, j]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}
