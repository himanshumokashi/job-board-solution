# Job board starter

A small job board for an insiderOne work sample. It is made up: the jobs and
companies are not real.

## Run it

You need Node 20 or newer. There are no packages to install.

```
npm start      # then open http://localhost:3000
npm test       # runs the tests in test/
```

## What is here

- `server.js`: the web server. `GET /api/jobs?q=` lists jobs, `GET /` serves the page.
- `lib/jobs.js`: reading and searching the jobs. Pure functions.
- `jobs.json`: the jobs.
- `public/`: the page and its script.
- `test/`: tests, using Node's built-in test runner.

## Your task

See the work sample brief on insiderOne: add saved jobs (save, list, remove),
with tests, and add a short section to this README about what you built.

## Saved jobs

You can save a job, see your saved jobs, and remove one.

**API**

| Request | What it does | Result |
| --- | --- | --- |
| `GET /api/saved` | Saved jobs, in the order saved | `200` + list of full jobs |
| `POST /api/saved` with `{"jobId": "j2"}` | Save a job | `201` new, `200` already saved, `404` no such job, `400` bad body |
| `DELETE /api/saved/:id` | Remove a saved job | `204`, or `404` if it was not saved |

**How it works**

- `lib/saved.js` holds the logic (add, remove, look up jobs). Pure functions plus reading and writing `saved.json`.
- Only job ids are stored, so a saved job always shows the latest details from `jobs.json`.
- `saved.json` is created on the first save and is git-ignored. Writes go to a temp file and are then renamed, so the file is never left half-written.
- Saving the same job twice does nothing. Requests that change the file run one at a time, so two quick saves cannot overwrite each other.
- The page has a "Saved jobs" list at the top and a Save/remove button on every job.

**Choices and limits**

- There are no user accounts in this starter, so there is one shared saved list. With accounts, the file would become one list per user.
- A JSON file is fine at this size. For many users I would move to a database.

**Tests:** `npm test` runs 10 tests, including API tests against a real server using a temporary file (`test/saved.test.js`).
