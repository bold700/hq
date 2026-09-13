// Genereert een 3D-model (GLB) met Meshy text-to-3D en zet het in world/models/.
// Gebruik: MESHY_API_KEY=... node scripts/meshy.mjs --name hq-station --prompt "..." [--mode preview|refine] [--polycount 6000] [--style realistic|sculpture]
// Draait in .github/workflows/meshy.yml (workflow_dispatch). Preview is de goedkoopste stand; refine voegt textuur/PBR toe.
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith("--") ? [...a, [x.slice(2), arr[i + 1] ?? "true"]] : a), []));
const key = process.env.MESHY_API_KEY;
if (!key) throw new Error("MESHY_API_KEY ontbreekt");
const name = (args.name || "model").toLowerCase().replace(/[^a-z0-9-]/g, "-");
const mode = args.mode || "preview";
const polycount = Number(args.polycount || 6000);
const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const api = "https://api.meshy.ai/openapi/v2/text-to-3d";

async function call(method, url, body) {
  const r = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!r.ok) throw new Error(`Meshy ${r.status}: ${text.slice(0, 300)}`);
  return data;
}
async function waitFor(id) {
  for (let i = 0; i < 120; i++) {
    const t = await call("GET", `${api}/${id}`);
    process.stdout.write(`\r${t.status} ${t.progress ?? ""}%   `);
    if (t.status === "SUCCEEDED") { console.log(); return t; }
    if (t.status === "FAILED" || t.status === "CANCELED") throw new Error(`Meshy-taak ${t.status}: ${t.task_error?.message || ""}`);
    await new Promise((r) => setTimeout(r, 10000));
  }
  throw new Error("Meshy-taak duurde te lang");
}

let task;
if (mode === "refine") {
  const previewId = args.preview || readManifest()[name]?.preview_task_id;
  if (!previewId) throw new Error("Geen preview_task_id bekend voor refine");
  const { result } = await call("POST", api, { mode: "refine", preview_task_id: previewId, enable_pbr: false });
  task = await waitFor(result);
} else {
  if (!args.prompt) throw new Error("--prompt ontbreekt");
  const body = { mode: "preview", prompt: args.prompt, art_style: args.style || "realistic", should_remesh: true, topology: "triangle", target_polycount: polycount };
  if (args.negative) body.negative_prompt = args.negative;
  const { result } = await call("POST", api, body);
  console.log("taak", result);
  task = await waitFor(result);
}

const glbUrl = task.model_urls?.glb;
if (!glbUrl) throw new Error("Geen GLB in resultaat");
const glb = Buffer.from(await (await fetch(glbUrl)).arrayBuffer());
mkdirSync(join(root, "world/models"), { recursive: true });
writeFileSync(join(root, "world/models", `${name}.glb`), glb);
let thumb = "";
if (task.thumbnail_url) {
  try { writeFileSync(join(root, "world/models", `${name}.png`), Buffer.from(await (await fetch(task.thumbnail_url)).arrayBuffer())); thumb = `${name}.png`; } catch {}
}
const manifest = readManifest();
manifest[name] = { ...(manifest[name] || {}), file: `${name}.glb`, thumb, mode, prompt: args.prompt || manifest[name]?.prompt || "", preview_task_id: mode === "preview" ? task.id : manifest[name]?.preview_task_id, task_id: task.id, bytes: glb.length, generated_at: new Date().toISOString(), role: args.role || manifest[name]?.role || "" };
writeFileSync(join(root, "world/models/manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`klaar: world/models/${name}.glb (${Math.round(glb.length / 1024)} kB)`);

function readManifest() {
  const p = join(root, "world/models/manifest.json");
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {};
}
