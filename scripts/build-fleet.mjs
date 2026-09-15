// Bouwt world/data/fleet.json: de feiten per project die de patrouille nodig heeft (open PR's, CI, README, rules, workflows).
// Draait dagelijks in .github/workflows/snapshot.yml met GITHUB_TOKEN; lokaal: GITHUB_TOKEN=... node scripts/build-fleet.mjs
// Routine-sessies kunnen api.github.com niet bereiken; daarom staat dit bestand in de repo.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(join(root, "registry.json"), "utf8"));
const owner = registry.owner;
const headers = { "User-Agent": "bold700-hq", Accept: "application/vnd.github+json" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
const api = `https://api.github.com/repos/${owner}`;

async function get(path) {
  const res = await fetch(`${api}/${path}`, { headers });
  if (res.status === 404) return null;
  if (res.status === 409) return []; // lege repo (nog geen commits)
  if (!res.ok) throw new Error(`GitHub API ${res.status} voor ${path}: ${await res.text()}`);
  return res.json();
}
const exists = async (repo, file) => (await get(`${repo}/contents/${file}`)) !== null;
const days = (iso) => Math.round((Date.now() - Date.parse(iso)) / 864e5);

const since = new Date(Date.now() - 8 * 864e5).toISOString();
const fleet = {};
const names = Object.entries(registry.projects).filter(([, p]) => p.status !== "archived").map(([n]) => n);
for (const name of names) {
  const f = { checked_at: new Date().toISOString() };
  try {
    const repo = await get(name);
    // GITHUB_TOKEN ziet alleen publieke repo's en hq zelf; privé repo's geven 404. Met secret FLEET_TOKEN (fine-grained PAT, alleen lezen) worden ze wel zichtbaar.
    if (!repo || !repo.name) { f.exists = null; f.note = "niet zichtbaar: privé repo (zet FLEET_TOKEN als secret) of bestaat niet"; fleet[name] = f; continue; }
    f.exists = true; f.private = repo.private; f.archived = repo.archived; f.default_branch = repo.default_branch;
    f.pushed_at = repo.pushed_at; f.days_since_push = days(repo.pushed_at); f.open_issues = repo.open_issues_count;
    const prs = (await get(`${name}/pulls?state=open&per_page=50`)) || [];
    f.open_prs = prs.map((p) => ({ number: p.number, title: p.title, draft: p.draft, branch: p.head.ref, age_days: days(p.created_at), url: p.html_url }));
    const runs = await get(`${name}/actions/runs?per_page=1&branch=${repo.default_branch}`);
    const run = runs && runs.workflow_runs && runs.workflow_runs[0];
    f.ci = run ? { name: run.name, status: run.status, conclusion: run.conclusion, at: run.updated_at, url: run.html_url } : null;
    const commits = (await get(`${name}/commits?sha=${repo.default_branch}&since=${since}&per_page=50`)) || [];
    f.recent_commits = commits.map((c) => ({ sha: c.sha.slice(0, 7), date: c.commit.committer.date, message: c.commit.message.split("\n")[0] }));
    f.missions_in_commits = [...new Set(f.recent_commits.flatMap((c) => c.message.match(/m-\d{3}/g) || []))];
    f.has_readme = await exists(name, "README.md");
    f.has_ci = await exists(name, ".github/workflows");
    f.has_firestore_rules = await exists(name, "firestore.rules");
    f.has_storage_rules = await exists(name, "storage.rules");
    f.has_package_json = await exists(name, "package.json");
  } catch (e) { f.error = e.message; }
  fleet[name] = f;
  console.log(`${name}: ${f.exists === null ? "niet zichtbaar" : f.error ? "fout" : `${f.open_prs.length} PR, CI ${f.ci ? f.ci.conclusion || f.ci.status : "geen"}, push ${f.days_since_push} d`}`);
}
writeFileSync(join(root, "world/data/fleet.json"), JSON.stringify({ generated_at: new Date().toISOString(), source: "scripts/build-fleet.mjs (GitHub Actions)", projects: fleet }, null, 1) + "\n");
console.log(`fleet: ${names.length} projecten`);
