/* bold700 HQ · 3D-overzicht van projecten en agents. Data: window.HQ_DATA (ingebed) of data/*.json. */
(async function () {
  const $ = (s) => document.querySelector(s);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- data ----------
  async function loadData() {
    if (window.HQ_DATA) return window.HQ_DATA;
    const json = (u) => fetch(u, { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${u}: ${r.status}`))));
    // Registry: de kopie in data/ (wordt bij elke deploy ververst), anders uit de repo-root.
    const registry = await json("data/registry.json").catch(() => json("../registry.json"));
    // Repos: live uit de GitHub API (publiek), aangevuld met de snapshot (privé en beschrijvingen).
    const snapshot = await json("data/repos.json").catch(() => ({ repos: [] }));
    let live = null;
    try {
      const owner = registry.owner || "bold700";
      const r = await fetch(`https://api.github.com/users/${owner}/repos?per_page=100&sort=pushed`, { headers: { Accept: "application/vnd.github+json" } });
      if (r.ok) live = (await r.json()).map((x) => ({ name: x.name, description: x.description || "", language: x.language || "", homepage: x.homepage || "", pushed_at: x.pushed_at, private: x.private, archived: x.archived, open_issues: x.open_issues_count, stars: x.stargazers_count }));
    } catch {}
    if (live) {
      const seen = new Set(live.map((x) => x.name));
      for (const x of snapshot.repos || []) if (!seen.has(x.name)) live.push({ ...x, stale: true });
      return { repos: { generated_at: new Date().toISOString(), source: "GitHub API (live)", repos: live }, registry };
    }
    return { repos: snapshot, registry };
  }
  const { repos: snapshot, registry } = await loadData();
  const owner = registry.owner || "bold700";
  const clusters = registry.clusters;
  const clusterKeys = Object.keys(clusters);
  const now = Date.now();
  const DAY = 864e5;

  const projects = snapshot.repos.map((r) => {
    const reg = registry.projects[r.name] || {};
    const days = Math.max(0, (now - Date.parse(r.pushed_at)) / DAY);
    const status = reg.status || (r.archived ? "archived" : days > 365 ? "paused" : "active");
    const cluster = clusters[reg.cluster] ? reg.cluster : "lab";
    const agents = [...new Set([...(clusters[cluster].agents || []), ...(reg.agents || [])])];
    return { ...r, days, status, cluster, agents, description: reg.description || r.description || "", links: reg.links || {} };
  });
  for (const [name, reg] of Object.entries(registry.projects)) {
    if (!projects.some((p) => p.name === name)) {
      const cluster = clusters[reg.cluster] ? reg.cluster : "lab";
      projects.push({ name, days: 9999, pushed_at: null, status: reg.status || "idea", cluster, private: false,
        agents: [...new Set([...(clusters[cluster].agents || []), ...(reg.agents || [])])], description: reg.description || "", links: reg.links || {} });
    }
  }
  projects.sort((a, b) => a.days - b.days);
  $("#brand-sub").textContent = `${projects.length} projecten · ${Object.keys(registry.agents).length} agents · ${clusterKeys.length} clusters`;

  const heat = (d) => (d < 30 ? 1 : d < 180 ? 0.55 : d < 365 ? 0.3 : 0.16);
  const rel = (d, p) => {
    if (!p) return "nog geen repo";
    if (d < 1) return "vandaag";
    if (d < 30) return `${Math.round(d)} d geleden`;
    if (d < 365) return `${Math.round(d / 30)} mnd geleden`;
    return `${(d / 365).toFixed(1)} jr geleden`;
  };
  const statusNL = { active: "actief", paused: "gepauzeerd", archived: "gearchiveerd", idea: "idee" };
  const statusColor = { active: "#3ddc97", paused: "#ffc94a", archived: "#5d6580", idea: "#7c5cff" };

  // ---------- scene ----------
  const canvas = $("#space");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x0a0d18, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0d18, 0.012);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  camera.position.set(0, 34, 62);
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.06;
  controls.minDistance = 8; controls.maxDistance = 140; controls.maxPolarAngle = Math.PI * 0.55;
  controls.autoRotate = !reduceMotion; controls.autoRotateSpeed = 0.25;
  canvas.addEventListener("pointerdown", () => (controls.autoRotate = false), { once: true });

  scene.add(new THREE.AmbientLight(0x8090c0, 0.35));
  const key = new THREE.PointLight(0xffe2a8, 1.4, 0, 2); key.position.set(0, 12, 0); scene.add(key);

  // sterrenhemel
  {
    const n = 1800, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 120 + Math.random() * 120, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
      pos.set([r * Math.sin(p) * Math.cos(t), r * Math.cos(p) * 0.6, r * Math.sin(p) * Math.sin(t)], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9aa7d0, size: 0.35, sizeAttenuation: true, transparent: true, opacity: 0.8 })));
  }

  // HQ-kern
  const core = new THREE.Mesh(new THREE.SphereGeometry(1.6, 48, 48), new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffb84a, emissiveIntensity: 0.9, roughness: 0.4 }));
  scene.add(core);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(2.6, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.08 }));
  scene.add(halo);

  const labels = $("#labels");
  const labelEls = []; // {el, obj, offsetY}
  function addLabel(text, obj, cls, color, offsetY = 0) {
    const el = document.createElement("div");
    el.className = "label " + (cls || ""); el.textContent = text;
    if (color) el.style.setProperty("--lc", color);
    labels.appendChild(el); labelEls.push({ el, obj, offsetY }); return el;
  }
  addLabel("HQ", core, "core", null, 2.6);

  const pickables = []; // meshes with userData.kind
  const clusterHubs = {};
  const R = 26;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const moves = []; // lopende verplaatsingen van sterren
  clusterKeys.forEach((k, i) => {
    const c = clusters[k];
    const ang = (i / clusterKeys.length) * Math.PI * 2 - Math.PI / 2;
    const center = new THREE.Vector3(Math.cos(ang) * R, Math.sin(i * 1.7) * 2.5, Math.sin(ang) * R);
    const color = new THREE.Color(c.color);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.05, 8, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 }));
    ring.position.copy(center); ring.rotation.x = Math.PI / 2; scene.add(ring);
    const disc = new THREE.Mesh(new THREE.RingGeometry(2.4, 9.5, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.035, side: THREE.DoubleSide }));
    disc.position.copy(center); disc.rotation.x = -Math.PI / 2; scene.add(disc);
    const link = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), center]), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.18 }));
    scene.add(link);
    const members = projects.filter((p) => p.cluster === k);
    const label = addLabel(`${c.label} · ${members.length}`, ring, "cluster", c.color, 2.9);
    clusterHubs[k] = { center, color, ring, members, label, agentMeshes: [], group: new THREE.Group() };
    scene.add(clusterHubs[k].group);

    // agents als satellieten rond de ring
    (c.agents || []).forEach((a, j) => {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffb84a, emissiveIntensity: 0.5, flatShading: true }));
      m.userData = { kind: "agent", name: a, cluster: k, phase: (j / (c.agents.length || 1)) * Math.PI * 2, r: 3.4 + j * 0.35, speed: 0.25 + j * 0.05 };
      scene.add(m); pickables.push(m); clusterHubs[k].agentMeshes.push(m);
      addLabel(a, m, "agent", null, 0.8);
    });

    // repos in een spiraal (zonnebloem) rond de ring
    members.forEach((p, j) => makeStar(p, k, j));
  });

  // Positie van de j-de ster in cluster k (zonnebloemspiraal), en het maken/verplaatsen van sterren.
  function starPos(k, j, h) {
    const { center } = clusterHubs[k];
    const rr = 3.6 + Math.sqrt(j + 0.5) * 1.55, t = j * golden;
    return new THREE.Vector3(center.x + Math.cos(t) * rr, center.y + (h - 0.4) * 1.6 + Math.sin(j) * 0.3, center.z + Math.sin(t) * rr);
  }
  function makeStar(p, k, j, animateFrom) {
    const { color } = clusterHubs[k];
    const h = heat(p.days);
    const pos = starPos(k, j, h);
    const size = 0.28 + h * 0.75;
    const mat = p.status === "archived"
      ? new THREE.MeshBasicMaterial({ color: 0x5d6580, wireframe: true })
      : new THREE.MeshStandardMaterial({ color: color.clone().lerp(new THREE.Color(0xffffff), h * 0.45), emissive: color, emissiveIntensity: 0.15 + h * 1.1, roughness: 0.45 });
    const m = new THREE.Mesh(new THREE.SphereGeometry(size, 24, 24), mat);
    m.position.copy(animateFrom || pos); m.userData = { kind: "project", p, baseScale: 1 };
    scene.add(m); pickables.push(m); p.mesh = m; p.extras = [];
    if (h >= 1) { // gloed voor verse repos
      const g = new THREE.Mesh(new THREE.SphereGeometry(size * 1.9, 16, 16), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12 }));
      g.position.copy(m.position); scene.add(g); p.extras.push(g);
    }
    if (p.private) {
      const lock = new THREE.Mesh(new THREE.TorusGeometry(size * 1.35, 0.035, 6, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
      lock.position.copy(m.position); lock.rotation.x = Math.PI / 2; scene.add(lock); p.extras.push(lock);
    }
    if (animateFrom) { m.scale.setScalar(0.01); moves.push({ p, from: animateFrom.clone(), to: pos, t0: performance.now(), dur: reduceMotion ? 1 : 1400, grow: true }); }
    return m;
  }
  function moveStar(p, k) {
    const old = clusterHubs[p.cluster];
    old.members = old.members.filter((x) => x !== p);
    const hub = clusterHubs[k];
    hub.members.push(p);
    p.cluster = k;
    const to = starPos(k, hub.members.length - 1, heat(p.days));
    if (p.mesh && p.mesh.material.emissive) { p.mesh.material.emissive.copy(hub.color); p.mesh.material.color.copy(hub.color.clone().lerp(new THREE.Color(0xffffff), heat(p.days) * 0.45)); }
    for (const e of p.extras || []) if (e.material.color && e.geometry.type === "SphereGeometry") e.material.color.copy(hub.color);
    moves.push({ p, from: p.mesh.position.clone(), to, t0: performance.now(), dur: reduceMotion ? 1 : 2200, arc: 6 });
    if (p.li) p.li.style.setProperty("--c", clusters[k].color);
    updateClusterCounts();
  }
  function updateClusterCounts() {
    for (const k of clusterKeys) {
      clusterHubs[k].label.textContent = `${clusters[k].label} · ${clusterHubs[k].members.length}`;
      const b = document.querySelector(`#clusters button[data-k="${k}"] b`); if (b) b.textContent = clusterHubs[k].members.length;
    }
  }
  const toastEl = $("#toast"); let toastTimer = null;
  function toast(msg) { toastEl.textContent = msg; toastEl.hidden = false; toastEl.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.classList.remove("show"); }, 6000); }

  // ---------- taken (Routines via api/fire.js) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const taskCfg = () => ({ api: store.get("hq.taskApi", registry.task_api || ""), pass: store.get("hq.taskPass", ""), gh: store.get("hq.ghToken", "") });
  const ghHeaders = () => { const h = { Accept: "application/vnd.github+json" }; const t = taskCfg().gh; if (t) h.Authorization = `Bearer ${t}`; return h; };
  const POLL_MS = () => (taskCfg().gh ? 30000 : 120000);
  let routineProjects = new Set();
  const normName = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const hasRoutine = (p) => routineProjects.has(normName(p.name));
  const runs = store.get("hq.runs", []);
  async function callApi(method, body) {
    const { api, pass } = taskCfg();
    if (!api || !pass) throw new Error("Nog niet ingesteld");
    const r = await fetch(api, { method, headers: { "Content-Type": "application/json", "X-HQ-Password": pass }, body: body ? JSON.stringify(body) : undefined });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Fout ${r.status}`);
    return data;
  }
  async function loadRoutines() {
    const { api, pass } = taskCfg();
    routineProjects = new Set();
    if (api && pass) { try { routineProjects = new Set(((await callApi("GET")).projects || []).map(normName)); } catch {} }
    projects.forEach((p) => { if (p.li) p.li.querySelector(".run").hidden = !hasRoutine(p); });
    if (selected) renderTask(selected);
  }
  const relTime = (iso) => { const d = (Date.now() - Date.parse(iso)) / DAY; return d < 1 ? "vandaag" : `${Math.round(d)} d geleden`; };
  const elapsed = (iso) => { const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000)); return m < 1 ? "net gestart" : m < 60 ? `${m} min` : `${Math.round(m / 60)} u`; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const readme = `https://github.com/${owner}/hq/blob/main/routines/README.md`;

  // Voortgang van taken: een run is "bezig" tot er een claude/-PR op GitHub verschijnt die na de start is geopend.
  const RUN_TIMEOUT = 90 * 60000;
  // Taken zonder status komen van vóór deze weergave; die tellen ook als "bezig" tot er een PR gevonden is.
  const isRunning = (r) => r.status !== "done" && Date.now() - Date.parse(r.started_at) < RUN_TIMEOUT;
  const needsCheck = (r) => isRunning(r) || (r.status === "done" && r.pr && !r.pr.merged && Date.now() - Date.parse(r.started_at) < 7 * DAY);
  function runStatus(r) {
    if (r.status === "done" && r.commit) return `<a class="st ok" href="${esc(r.commit.url)}" target="_blank" rel="noopener" title="${esc(r.commit.message)}">✓ klaar · op main</a>`;
    if (r.status === "done") {
      const label = r.pr.merged ? `✓ #${r.pr.number} gemerged` : `PR #${r.pr.number} · wacht op merge`;
      return `<a class="st ${r.pr.merged ? "ok" : "wait"}" href="${esc(r.pr.url)}" target="_blank" rel="noopener" title="${esc(r.pr.title)}${r.pr.merged ? "" : " · klik om te bekijken en te mergen; daarna verandert de wereld"}">${label}</a>`;
    }
    if (isRunning(r)) return `<span class="st busy" title="Claude is bezig; open de sessie om mee te kijken">⟳ bezig · ${elapsed(r.started_at)}</span>`;
    return `<a class="st" href="${esc(r.session_url)}" target="_blank" rel="noopener">geen PR gezien · open sessie</a>`;
  }
  async function pollRuns() {
    const open = runs.filter(needsCheck);
    const byProject = new Map();
    for (const r of open) if (!byProject.has(r.project)) byProject.set(r.project, []);
    for (const r of open) byProject.get(r.project).push(r);
    let changed = false;
    for (const [project, list] of byProject) {
      try {
        // 1) Direct op main gepusht? Dan is de taak klaar.
        const running = list.filter(isRunning);
        if (running.length) {
          const since = new Date(Math.min(...running.map((r) => Date.parse(r.started_at))) - 60000).toISOString();
          const rc = await fetch(`https://api.github.com/repos/${owner}/${project}/commits?sha=main&since=${encodeURIComponent(since)}&per_page=10`, { headers: ghHeaders() });
          if (rc.ok) {
            const commits = (await rc.json()).filter((c) => !/^Merge pull request/.test(c.commit.message) && !/^Snapshot ververst/.test(c.commit.message));
            for (const r of running) {
              const c = commits.find((x) => Date.parse(x.commit.committer.date) >= Date.parse(r.started_at) - 60000 && !runs.some((o) => o !== r && o.commit && o.commit.sha === x.sha));
              if (c) { r.status = "done"; r.commit = { sha: c.sha, url: c.html_url, message: c.commit.message.split("\n")[0] }; r.done_at = c.commit.committer.date; changed = true; toast(`✓ Claude is klaar in ${project}: ${r.commit.message}`); }
            }
          }
        }
        // 2) Anders: een claude/-PR (als de Routine toch een PR moest maken), en de merge-status van eerdere PR's.
        const res = await fetch(`https://api.github.com/repos/${owner}/${project}/pulls?state=all&sort=created&direction=desc&per_page=15`, { headers: ghHeaders() });
        if (!res.ok) continue;
        const prs = await res.json();
        for (const r of list) {
          if (r.status === "done" && r.pr) {
            const cur = prs.find((x) => x.number === r.pr.number);
            if (cur && !!cur.merged_at !== !!r.pr.merged) { r.pr.merged = !!cur.merged_at; changed = true; if (r.pr.merged) toast(`✓ PR #${r.pr.number} gemerged in ${project}`); }
            continue;
          }
          if (r.status === "done") continue;
          const since = Date.parse(r.started_at) - 2 * 60000;
          const pr = prs.find((x) => x.head && /^claude\//.test(x.head.ref) && Date.parse(x.created_at) >= since && !runs.some((o) => o !== r && o.pr && o.pr.number === x.number));
          if (pr) { r.status = "done"; r.pr = { number: pr.number, url: pr.html_url, title: pr.title, merged: !!pr.merged_at }; changed = true; toast(`Claude opende PR #${pr.number} in ${project}`); }
        }
      } catch {}
    }
    store.set("hq.runs", runs);
    syncBusy();
    if (selected) renderTask(selected);
    if (changed) refreshRegistry();
  }

  // Leest registry.json rechtstreeks van main en laat verschillen zien: sterren die verhuizen of erbij komen.
  let registryEtag = "";
  async function refreshRegistry() {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${owner}/hq/main/registry.json?v=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const text = await res.text();
      if (text === registryEtag) return;
      registryEtag = text;
      const fresh = JSON.parse(text);
      const structural = JSON.stringify(Object.keys(fresh.clusters)) !== JSON.stringify(clusterKeys)
        || JSON.stringify(fresh.agents) !== JSON.stringify(registry.agents)
        || clusterKeys.some((k) => JSON.stringify(fresh.clusters[k]) !== JSON.stringify(clusters[k]));
      if (structural) { toast("Clusters of agents zijn veranderd; de wereld laadt opnieuw…"); setTimeout(() => location.reload(), 2500); return; }
      for (const [name, reg] of Object.entries(fresh.projects)) {
        const p = projects.find((x) => x.name === name);
        const k = clusters[reg.cluster] ? reg.cluster : "lab";
        if (!p) {
          const np = { name, days: 9999, pushed_at: null, status: reg.status || "idea", cluster: k, private: false, agents: [...new Set([...(clusters[k].agents || []), ...(reg.agents || [])])], description: reg.description || "", links: reg.links || {} };
          projects.push(np); clusterHubs[k].members.push(np);
          makeStar(np, k, clusterHubs[k].members.length - 1, clusterHubs[k].center.clone());
          addProjectRow(np); updateClusterCounts();
          toast(`Nieuw project in de wereld: ${name} (${clusters[k].label})`);
          continue;
        }
        if (p.cluster !== k) { moveStar(p, k); toast(`${name} verhuisd naar ${clusters[k].label}`); }
        p.description = reg.description || p.description; p.status = reg.status || p.status; p.links = reg.links || p.links;
        p.agents = [...new Set([...(clusters[k].agents || []), ...(reg.agents || [])])];
        registry.projects[name] = reg;
      }
      if (selected) select(selected, true);
    } catch {}
  }
  const busyRings = new Map(); // projectnaam -> mesh
  function syncBusy() {
    const busy = new Set(runs.filter(isRunning).map((r) => r.project));
    for (const p of projects) {
      if (p.li) p.li.classList.toggle("busy", busy.has(p.name));
      const has = busyRings.has(p.name);
      if (busy.has(p.name) && !has && p.mesh) {
        const r = p.mesh.geometry.parameters.radius;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 2.2, 0.06, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.85 }));
        ring.position.copy(p.mesh.position); ring.rotation.x = Math.PI / 3; scene.add(ring); busyRings.set(p.name, ring);
      } else if (!busy.has(p.name) && has) {
        scene.remove(busyRings.get(p.name)); busyRings.delete(p.name);
      }
    }
  }
  (function schedule() {
    setTimeout(async () => {
      if (runs.some(needsCheck)) await pollRuns();
      else if (selected) renderTask(selected);
      const recent = runs.some((r) => Date.now() - Date.parse(r.done_at || r.started_at) < 15 * 60000);
      if (recent || runs.some(isRunning)) refreshRegistry();
      schedule();
    }, runs.some(isRunning) ? POLL_MS() : 180000);
  })();
  function renderTask(p) {
    const { api, pass } = taskCfg();
    const hint = $("#task-hint"), form = $("#task-form"), st = $("#task-status");
    st.textContent = ""; st.className = "task-status";
    if (!api || !pass) {
      hint.innerHTML = `Nog niet ingesteld. Klik op ⚙ in de zijbalk. Uitleg: <a href="${readme}" target="_blank" rel="noopener">routines/README.md</a>`;
      form.hidden = true;
    } else if (!hasRoutine(p)) {
      hint.innerHTML = `Geen Routine voor <b>${esc(p.name)}</b>. Maak er een aan en voeg hem toe aan HQ_ROUTINES (<a href="${readme}" target="_blank" rel="noopener">uitleg</a>).`;
      form.hidden = true;
    } else {
      hint.textContent = "Claude start een cloud-sessie op dit project en pusht het resultaat. Je ziet het hier en in de wereld verschijnen.";
      form.hidden = false;
    }
    const mine = runs.filter((r) => r.project === p.name).slice(0, 5);
    const busyHere = mine.filter(isRunning).length;
    if (busyHere && !form.hidden) hint.innerHTML = `<b>Claude is bezig</b> met ${busyHere === 1 ? "een taak" : busyHere + " taken"} in dit project. Zodra de draft PR er is, verschijnt hieronder een link. Je kunt intussen een nieuwe taak sturen.`;
    $("#runs").innerHTML = mine.map((r) => `<li><span><a href="${esc(r.session_url)}" target="_blank" rel="noopener">${esc(r.text)}</a></span>${runStatus(r) || `<time>${relTime(r.started_at)}</time>`}</li>`).join("");
  }
  $("#task-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!selected) return;
    const text = $("#task-text").value.trim(); if (!text) return;
    const btn = $("#task-go"), st = $("#task-status");
    btn.disabled = true; st.className = "task-status"; st.textContent = "Starten…";
    try {
      const r = await callApi("POST", { project: selected.name, text });
      runs.unshift({ project: selected.name, text, session_url: r.session_url, started_at: r.started_at || new Date().toISOString(), status: "running" });
      runs.splice(30); store.set("hq.runs", runs);
      $("#task-text").value = "";
      syncBusy(); renderTask(selected);
      st.className = "task-status ok"; st.innerHTML = `Gestart · Claude werkt nu · <a href="${esc(r.session_url)}" target="_blank" rel="noopener">kijk mee</a>`;
    } catch (err) {
      st.className = "task-status err"; st.textContent = err.message;
    } finally { btn.disabled = false; }
  });
  const dlg = $("#settings");
  $("#settings-open").addEventListener("click", () => { const c = taskCfg(); $("#set-api").value = c.api; $("#set-pass").value = c.pass; $("#set-gh").value = c.gh; $("#set-status").textContent = ""; $("#set-status").className = "task-status"; dlg.showModal(); });
  $("#set-close").addEventListener("click", () => dlg.close());
  $("#set-test").addEventListener("click", async () => {
    const st = $("#set-status"); st.className = "task-status"; st.textContent = "Testen…";
    try {
      const r = await fetch($("#set-api").value.trim(), { headers: { "X-HQ-Password": $("#set-pass").value } });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || `Fout ${r.status}`);
      st.className = "task-status ok"; st.textContent = `Verbonden · routines voor: ${(d.projects || []).join(", ") || "nog geen"}`;
    } catch (err) { st.className = "task-status err"; st.textContent = err.message; }
  });
  $("#settings-form").addEventListener("submit", () => { store.set("hq.taskApi", $("#set-api").value.trim()); store.set("hq.taskPass", $("#set-pass").value); store.set("hq.ghToken", $("#set-gh").value.trim()); loadRoutines(); });

  // ---------- UI: rail ----------
  const clustersNav = $("#clusters");
  let activeCluster = null;
  clusterKeys.forEach((k) => {
    const b = document.createElement("button");
    b.style.setProperty("--c", clusters[k].color);
    b.innerHTML = `<i></i>${clusters[k].label} <b>${clusterHubs[k].members.length}</b>`;
    b.addEventListener("click", () => { activeCluster = activeCluster === k ? null : k; applyFilter(); if (activeCluster) flyTo(clusterHubs[k].center, 22); });
    b.dataset.k = k; clustersNav.appendChild(b);
  });
  const agentList = $("#agent-list");
  for (const [a, info] of Object.entries(registry.agents)) {
    const li = document.createElement("li"); li.textContent = a; li.title = info.description; agentList.appendChild(li);
  }
  const list = $("#project-list");
  function addProjectRow(p) {
    const li = document.createElement("li"); li.tabIndex = 0;
    li.style.setProperty("--c", clusters[p.cluster].color); li.style.setProperty("--o", 0.35 + heat(p.days) * 0.65);
    li.innerHTML = `<i></i><span>${esc(p.name)}<b class="run" hidden title="Routine beschikbaar">▶</b></span><time>${rel(p.days, p.pushed_at)}</time>`;
    li.addEventListener("click", () => select(p));
    li.addEventListener("keydown", (e) => { if (e.key === "Enter") select(p); });
    p.li = li; list.appendChild(li);
    if (routineProjects.size) li.querySelector(".run").hidden = !hasRoutine(p);
  }
  projects.forEach(addProjectRow);

  const q = $("#q");
  q.addEventListener("input", applyFilter);
  function applyFilter() {
    const term = q.value.trim().toLowerCase();
    clustersNav.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.k === activeCluster));
    projects.forEach((p) => {
      const hit = (!term || p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term) || p.agents.some((a) => a.includes(term)))
        && (!activeCluster || p.cluster === activeCluster);
      p.li.classList.toggle("dim", !hit);
      if (p.mesh) { p.mesh.userData.baseScale = hit ? 1 : 0.35; if (p.mesh.material.opacity !== undefined) p.mesh.material.opacity = hit ? 1 : 0.25; }
    });
  }

  // ---------- selectie en paneel ----------
  const panel = $("#panel");
  let selected = null;
  function select(p, quiet) {
    selected = p;
    projects.forEach((x) => x.li.classList.toggle("on", x === p));
    const c = clusters[p.cluster];
    panel.style.setProperty("--pc", c.color);
    $("#p-cluster").textContent = c.label;
    $("#p-name").textContent = p.name;
    $("#p-desc").textContent = p.description || "Nog geen beschrijving; voeg er een toe in registry.json.";
    $("#p-status").innerHTML = `<span class="status" style="--sc:${statusColor[p.status]}">${statusNL[p.status] || p.status}</span>`;
    $("#p-push").textContent = rel(p.days, p.pushed_at);
    $("#p-vis").textContent = p.private ? "privé" : "publiek";
    $("#p-agents").innerHTML = p.agents.map((a) => `<li title="${(registry.agents[a] || {}).description || ""}">${a}</li>`).join("");
    const links = [];
    if (p.pushed_at) links.push(`<a href="https://github.com/${owner}/${p.name}" target="_blank" rel="noopener">GitHub</a>`);
    for (const [k, v] of Object.entries(p.links)) links.push(`<a class="ghost" href="${v}" target="_blank" rel="noopener">${k}</a>`);
    links.push(`<a class="ghost" href="https://claude.ai/code" target="_blank" rel="noopener">Open in Claude Code</a>`);
    $("#p-links").innerHTML = links.join("");
    renderTask(p);
    panel.hidden = false;
    if (quiet) return;
    if (p.mesh) flyTo(p.mesh.position, 9);
    p.li.scrollIntoView({ block: "nearest" });
  }
  $("#panel-close").addEventListener("click", () => { panel.hidden = true; selected = null; projects.forEach((x) => x.li.classList.remove("on")); });

  // camera-vlucht
  let fly = null;
  function flyTo(target, dist) {
    controls.autoRotate = false;
    const dir = camera.position.clone().sub(controls.target).normalize();
    const to = target.clone().add(dir.multiplyScalar(dist)).add(new THREE.Vector3(0, dist * 0.35, 0));
    fly = { t0: performance.now(), from: camera.position.clone(), to, tFrom: controls.target.clone(), tTo: target.clone(), dur: reduceMotion ? 1 : 900 };
  }

  // hover en klik
  const ray = new THREE.Raycaster(); const mouse = new THREE.Vector2(); const tip = $("#tip");
  let hovered = null, downAt = null;
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    return hit ? hit.object : null;
  }
  canvas.addEventListener("pointermove", (e) => {
    hovered = pick(e);
    canvas.style.cursor = hovered ? "pointer" : "";
    if (hovered) {
      const u = hovered.userData;
      tip.innerHTML = u.kind === "project" ? `${u.p.name}<small>${clusters[u.p.cluster].label} · ${rel(u.p.days, u.p.pushed_at)}</small>` : `◆ ${u.name}<small>agent · ${clusters[u.cluster].label}</small>`;
      tip.style.left = e.clientX + 14 + "px"; tip.style.top = e.clientY + 14 + "px"; tip.hidden = false;
    } else tip.hidden = true;
  });
  canvas.addEventListener("pointerdown", (e) => (downAt = [e.clientX, e.clientY]));
  canvas.addEventListener("pointerup", (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    const o = pick(e); if (!o) return;
    if (o.userData.kind === "project") select(o.userData.p);
    else { q.value = o.userData.name; activeCluster = null; applyFilter(); flyTo(clusterHubs[o.userData.cluster].center, 20); }
  });
  canvas.addEventListener("pointerleave", () => (tip.hidden = true));

  // ---------- loop ----------
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize); resize();

  const v = new THREE.Vector3();
  function tick(t) {
    requestAnimationFrame(tick);
    const s = t / 1000;
    if (fly) {
      const k = Math.min(1, (t - fly.t0) / fly.dur), e = 1 - Math.pow(1 - k, 3);
      camera.position.lerpVectors(fly.from, fly.to, e); controls.target.lerpVectors(fly.tFrom, fly.tTo, e);
      if (k >= 1) fly = null;
    }
    controls.update();
    core.scale.setScalar(1 + Math.sin(s * 1.4) * 0.03); halo.scale.setScalar(1 + Math.sin(s * 1.4 + 1) * 0.08);
    for (const ring of busyRings.values()) { ring.rotation.z = s * 1.2; ring.material.opacity = 0.55 + Math.sin(s * 3) * 0.3; }
    // sterren die verhuizen of verschijnen
    for (let i = moves.length - 1; i >= 0; i--) {
      const mv = moves[i], k = Math.min(1, (t - mv.t0) / mv.dur), e = 1 - Math.pow(1 - k, 3);
      const pos = mv.from.clone().lerp(mv.to, e); if (mv.arc) pos.y += Math.sin(k * Math.PI) * mv.arc;
      mv.p.mesh.position.copy(pos); for (const x of mv.p.extras || []) x.position.copy(pos);
      const ring = busyRings.get(mv.p.name); if (ring) ring.position.copy(pos);
      if (mv.grow) mv.p.mesh.scale.setScalar(0.01 + e * 0.99 * (mv.p.mesh.userData.baseScale || 1));
      if (k >= 1) { moves.splice(i, 1); if (selected === mv.p) flyTo(mv.to, 9); }
    }
    for (const k of clusterKeys) {
      const hub = clusterHubs[k];
      for (const m of hub.agentMeshes) {
        const u = m.userData, a = u.phase + s * u.speed * (reduceMotion ? 0 : 1);
        m.position.set(hub.center.x + Math.cos(a) * u.r, hub.center.y + 0.6 + Math.sin(a * 2) * 0.25, hub.center.z + Math.sin(a) * u.r);
        m.rotation.y = s * 0.8;
      }
    }
    for (const m of pickables) {
      if (m.userData.kind !== "project") continue;
      const target = m.userData.baseScale * (m === hovered || (selected && selected.mesh === m) ? 1.5 : 1);
      m.scale.setScalar(m.scale.x + (target - m.scale.x) * 0.15);
    }
    // labels projecteren
    const w = innerWidth, h = innerHeight;
    for (const L of labelEls) {
      L.obj.getWorldPosition(v); v.y += L.offsetY; v.project(camera);
      const on = v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2;
      L.el.style.opacity = on ? (L.el.classList.contains("agent") ? (camera.position.distanceTo(L.obj.position) < 40 ? 1 : 0) : 1) : 0;
      if (on) L.el.style.transform = `translate(-50%,-50%) translate(${(v.x + 1) / 2 * w}px, ${(1 - v.y) / 2 * h}px)`;
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(tick);
  loadRoutines();
  syncBusy();
  if (runs.some(needsCheck)) pollRuns();
})().catch((err) => {
  document.body.insertAdjacentHTML("beforeend", `<pre style="position:fixed;inset:auto 16px 16px;padding:12px;background:#2a1010;color:#ffd2d2;border-radius:8px;font:12px/1.4 monospace;white-space:pre-wrap">De wereld kon niet laden: ${err.message}\nControleer of data/repos.json en data/registry.json bestaan.</pre>`);
  console.error(err);
});
