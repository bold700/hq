// Tussenstation tussen de 3D-wereld en Claude Code Routines.
// Bewaart de routine-tokens als omgevingsvariabele en laat alleen jou door (wachtwoord).
//
// Omgevingsvariabelen (Vercel → Settings → Environment Variables):
//   HQ_PASSWORD  wachtwoord dat je in de wereld invult
//   HQ_ROUTINE_<PROJECT>  één variabele per project, bijvoorbeeld HQ_ROUTINE_LIFTLOG of HQ_ROUTINE_HQ.
//                Waarde: {"url": "https://api.anthropic.com/v1/claude_code/routines/trig_.../fire", "token": "sk-ant-oat01-..."}
//                (in plaats van "url" mag ook "id": "trig_..."). De naam na HQ_ROUTINE_ is de projectnaam
//                in hoofdletters, met alles wat geen letter of cijfer is vervangen door _.
//   HQ_ROUTINES  (oud, blijft werken) JSON met alle projecten in één: {"LiftLog": {"id": "...", "token": "..."}}
//   HQ_ORIGINS   (optioneel) komma-gescheiden lijst van toegestane origins; standaard https://bold700.github.io
const crypto = require("crypto");

const FIRE = (id) => `https://api.anthropic.com/v1/claude_code/routines/${id}/fire`;

const norm = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, "_");

function loadRoutines() {
  const out = {};
  if (process.env.HQ_ROUTINES) {
    const all = JSON.parse(process.env.HQ_ROUTINES);
    for (const [name, r] of Object.entries(all)) out[norm(name)] = { ...r, name };
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (!k.startsWith("HQ_ROUTINE_") || !v) continue;
    const name = k.slice("HQ_ROUTINE_".length);
    out[norm(name)] = { ...JSON.parse(v), name };
  }
  return out;
}

function sameSecret(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

module.exports = async (req, res) => {
  const allowed = (process.env.HQ_ORIGINS || "https://bold700.github.io").split(",").map((s) => s.trim());
  const origin = req.headers.origin || "";
  if (allowed.includes("*") || allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-HQ-Password");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();

  let routines;
  try {
    routines = loadRoutines();
  } catch (e) {
    return res.status(500).json({ error: `Een HQ_ROUTINE-variabele is geen geldige JSON: ${e.message}` });
  }
  if (!process.env.HQ_PASSWORD) return res.status(500).json({ error: "HQ_PASSWORD ontbreekt in Vercel" });
  if (!sameSecret(req.headers["x-hq-password"], process.env.HQ_PASSWORD)) {
    return res.status(401).json({ error: "Wachtwoord klopt niet" });
  }

  if (req.method === "GET") return res.status(200).json({ projects: Object.values(routines).map((r) => r.name), keys: Object.keys(routines) });
  if (req.method !== "POST") return res.status(405).json({ error: "Alleen GET en POST" });

  const { project, text } = req.body || {};
  const routine = project ? routines[norm(project)] : null;
  if (!routine || !(routine.id || routine.url) || !routine.token) return res.status(404).json({ error: `Geen routine voor ${project}` });
  if (typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "Geef een taak op" });
  if (text.length > 8000) return res.status(400).json({ error: "Taak is te lang (max 8000 tekens)" });

  const upstream = await fetch(routine.url || FIRE(routine.id), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${routine.token}`,
      "anthropic-beta": "experimental-cc-routine-2026-04-01",
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: text.trim() }),
  });
  const raw = await upstream.text();
  let data = {};
  try { data = JSON.parse(raw); } catch {}
  if (!upstream.ok) {
    const detail = (data && data.error && data.error.message) || raw.slice(0, 200) || "geen toelichting";
    const hint = upstream.status === 404 ? " Controleer of het id in HQ_ROUTINES het trig_… uit de API-trigger-URL is." : "";
    return res.status(upstream.status === 401 ? 502 : upstream.status).json({ error: `Anthropic antwoordde ${upstream.status}: ${detail}.${hint}` });
  }
  return res.status(200).json({
    project,
    session_id: data.claude_code_session_id,
    session_url: data.claude_code_session_url,
    started_at: new Date().toISOString(),
  });
};
