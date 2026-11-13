const list = document.getElementById("jobs");
const savedList = document.getElementById("saved");
const search = document.getElementById("search");

let savedIds = new Set();

async function api(method, path, body) {
  const res = await fetch(path, { method, body: body && JSON.stringify(body) });
  if (!res.ok) throw new Error(`${method} ${path} failed (${res.status})`);
  return res.status === 204 ? null : res.json();
}

function describe(job) {
  return `${job.title} at ${job.company}, ${job.location}. Rs ${job.stipend.toLocaleString("en-IN")} a month.`;
}

function row(job, button) {
  const li = document.createElement("li");
  const text = document.createElement("span");
  text.textContent = describe(job);
  li.append(text, " ", button);
  return li;
}

function button(label, onClick) {
  const b = document.createElement("button");
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

async function toggle(job) {
  try {
    if (savedIds.has(job.id)) await api("DELETE", `/api/saved/${encodeURIComponent(job.id)}`);
    else await api("POST", "/api/saved", { jobId: job.id });
  } catch (err) {
    alert("Could not update saved jobs. Please try again.");
    console.error(err);
  }
  await refresh();
}

async function showJobs(query) {
  const jobs = await api("GET", `/api/jobs?q=${encodeURIComponent(query)}`);
  list.replaceChildren(
    ...jobs.map((job) => row(job, button(savedIds.has(job.id) ? "Saved" : "Save", () => toggle(job))))
  );
}

async function showSaved() {
  const jobs = await api("GET", "/api/saved");
  savedIds = new Set(jobs.map((j) => j.id));
  if (!jobs.length) {
    const li = document.createElement("li");
    li.textContent = "Nothing saved yet.";
    return savedList.replaceChildren(li);
  }
  savedList.replaceChildren(...jobs.map((job) => row(job, button("Remove", () => toggle(job)))));
}

async function refresh() {
  await showSaved(); // first, so the buttons below know what is saved
  await showJobs(search.value);
}

search.addEventListener("input", () => showJobs(search.value));
refresh();
