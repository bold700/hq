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

  scene.add(new THREE.AmbientLight(0x6070a0, 0.22));
  const key = new THREE.PointLight(0xffe2a8, 1.6, 0, 1.6); key.position.set(0, 4, 0); scene.add(key); // het HQ-station als zon: dag- en nachtzijde op de planeten
  const fill = new THREE.DirectionalLight(0x8fa8ff, 0.25); fill.position.set(-30, 40, -20); scene.add(fill);

  // galaxy-achtergrond (gratis): Melkweg-band met stofwolken, nevelvlekken en duizenden sterren op een grote bol om alles heen
  {
    const w = 2048, h = 1024, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#070a14"; ctx.fillRect(0, 0, w, h);
    const noise = makeNoise(4242), dust = makeNoise(9001);
    const img = ctx.getImageData(0, 0, w, h); const d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h;
      // schuine band: afstand tot een sinusvormige "grote cirkel"
      const bandY = 0.5 + 0.16 * Math.sin(u * Math.PI * 2 + 0.8);
      const dist = Math.abs(v - bandY) / 0.13;
      const core = Math.exp(-dist * dist);
      const nx = Math.cos(u * Math.PI * 2) * 4 + 20, ny = Math.sin(u * Math.PI * 2) * 4 + 20;
      const n = noise(nx + v * 9, ny + v * 9, 5), dk = dust(nx * 1.7 + v * 14, ny * 1.7 + v * 14, 4);
      const lane = Math.pow(Math.max(0, dk - 0.45) * 2.2, 1.6); // donkere stoflanen
      let b = core * (0.55 + n * 0.9) * (1 - lane * 0.85) + Math.max(0, n - 0.62) * 0.35 * (1 - dist * 0.25);
      b = Math.max(0, b);
      const i = (y * w + x) * 4;
      // warm in de kern, koeler aan de rand
      b *= 0.42;
      d[i] = Math.min(255, 7 + b * 170); d[i + 1] = Math.min(255, 10 + b * 150); d[i + 2] = Math.min(255, 20 + b * 150 + core * 14);
    }
    ctx.putImageData(img, 0, 0);
    // nevelvlekken in de clusterkleuren, ver weg en vaag
    ctx.globalCompositeOperation = "lighter";
    Object.values(clusters).forEach((c, i) => {
      const cx = (0.1 + (i * 0.37) % 0.9) * w, cy = (0.3 + (i * 0.23) % 0.45) * h, r = 120 + (i % 3) * 70;
      const col = new THREE.Color(c.color); const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, `rgba(${rgb},0.16)`); g.addColorStop(0.5, `rgba(${rgb},0.06)`); g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.4, r * 0.8, i, 0, Math.PI * 2); ctx.fill();
    });
    // sterren: veel kleine, een paar grote met gloed, dichter in de band
    let seed = 77; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 6000; i++) {
      const x = rnd() * w, y = rnd() * h; const bandY = 0.5 + 0.16 * Math.sin((x / w) * Math.PI * 2 + 0.8);
      const near = Math.exp(-Math.pow((y / h - bandY) / 0.16, 2));
      if (rnd() > 0.35 + near * 0.65) continue;
      const big = rnd() < 0.012, s = big ? 0.9 + rnd() * 0.8 : 0.25 + rnd() * 0.55, a = 0.2 + rnd() * 0.5;
      const warm = rnd() < 0.25; ctx.fillStyle = warm ? `rgba(255,225,190,${a})` : `rgba(220,232,255,${a})`;
      ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
      if (big) { const g = ctx.createRadialGradient(x, y, 0, x, y, s * 4); g.addColorStop(0, warm ? "rgba(255,220,170,0.28)" : "rgba(200,220,255,0.28)"); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s * 4, 0, Math.PI * 2); ctx.fill(); }
    }
    // twee verre sterrenstelsels
    for (let i = 0; i < 2; i++) {
      const x = (0.2 + i * 0.55) * w, y = (0.18 + i * 0.6) * h;
      ctx.save(); ctx.translate(x, y); ctx.rotate(0.6 + i);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 60); g.addColorStop(0, "rgba(255,240,220,0.3)"); g.addColorStop(0.3, "rgba(200,190,255,0.1)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 70, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    const tex = new THREE.CanvasTexture(cv); tex.mapping = THREE.EquirectangularReflectionMapping;
    const sky = new THREE.Mesh(new THREE.SphereGeometry(320, 48, 32), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.rotation.y = 0.4; sky.rotation.z = 0.22; sky.renderOrder = -10; scene.add(sky);
  }

  // sterrenhemel (losse puntsterren voor diepte)
  {
    const n = 1800, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 120 + Math.random() * 120, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
      pos.set([r * Math.sin(p) * Math.cos(t), r * Math.cos(p) * 0.6, r * Math.sin(p) * Math.sin(t)], i * 3);
    }
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const w = Math.random(); const c = w < 0.7 ? [0.72, 0.78, 1] : w < 0.9 ? [1, 0.86, 0.62] : [1, 0.55, 0.45]; col.set(c, i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ vertexColors: true, size: 0.4, sizeAttenuation: true, transparent: true, opacity: 0.85 })));
  }

  // nevels (gratis): zachte gekleurde wolken achter elk sterrenstelsel
  function nebulaTexture(hex) {
    const cv = document.createElement("canvas"); cv.width = cv.height = 256; const ctx = cv.getContext("2d");
    const c = new THREE.Color(hex); const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
    const gr = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, `rgba(${rgb},0.55)`); gr.addColorStop(0.45, `rgba(${rgb},0.18)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(${rgb},${0.05 + Math.random() * 0.08})`; ctx.beginPath(); ctx.arc(64 + Math.random() * 128, 64 + Math.random() * 128, 10 + Math.random() * 40, 0, Math.PI * 2); ctx.fill(); }
    return new THREE.CanvasTexture(cv);
  }
  const nebulae = [];
  // asteroïdengordel (gratis) rond de hele galaxy
  const belt = new THREE.Group(); scene.add(belt);
  {
    const n = 700, geo = new THREE.DodecahedronGeometry(0.22, 0), mat = new THREE.MeshStandardMaterial({ color: 0x8a8f9c, roughness: 1, metalness: 0.1 });
    const inst = new THREE.InstancedMesh(geo, mat, n); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 44 + (Math.random() - 0.5) * 6 * Math.random();
      v3.set(Math.cos(a) * r, (Math.random() - 0.5) * 3.2, Math.sin(a) * r);
      e.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); q.setFromEuler(e);
      const s = 0.4 + Math.random() * 1.4; sc.set(s, s * (0.7 + Math.random() * 0.6), s);
      m4.compose(v3, q, sc); inst.setMatrixAt(i, m4);
    }
    belt.add(inst);
  }

  // kometen (gratis): af en toe schiet er een door de galaxy, met gloeiende kop en vervagende staart
  const comets = []; let nextComet = performance.now() + 2500;
  const TRAIL = 30;
  function spawnComet() {
    const a = Math.random() * Math.PI * 2, r = 68 + Math.random() * 22;
    const from = new THREE.Vector3(Math.cos(a) * r, 6 + Math.random() * 16, Math.sin(a) * r);
    const b = a + Math.PI + (Math.random() - 0.5) * 1.3;
    const to = new THREE.Vector3(Math.cos(b) * r, -8 + Math.random() * 12, Math.sin(b) * r);
    const pos = new Float32Array(TRAIL * 3), col = new Float32Array(TRAIL * 3);
    for (let i = 0; i < TRAIL; i++) { const f = 1 - i / TRAIL; col.set([0.2 + 0.7 * f, 0.35 + 0.6 * f, 1], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const line = new THREE.Line(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), new THREE.MeshBasicMaterial({ color: 0xe6f6ff }));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: nebulaTexture("#bfe6ff"), transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(3.2);
    scene.add(line); scene.add(head); scene.add(glow);
    comets.push({ from, to, line, head, glow, t0: performance.now(), dur: 4200 + Math.random() * 3800, trail: [] });
  }
  function updateComets(t) {
    if (!reduceMotion && t > nextComet) { spawnComet(); nextComet = t + 9000 + Math.random() * 16000; }
    for (let i = comets.length - 1; i >= 0; i--) {
      const c = comets[i], k = (t - c.t0) / c.dur;
      if (k >= 1) { scene.remove(c.line); scene.remove(c.head); scene.remove(c.glow); c.line.geometry.dispose(); comets.splice(i, 1); continue; }
      const p = c.from.clone().lerp(c.to, k); p.y += Math.sin(k * Math.PI) * 7;
      c.head.position.copy(p); c.glow.position.copy(p);
      c.trail.unshift(p); if (c.trail.length > TRAIL) c.trail.length = TRAIL;
      const arr = c.line.geometry.attributes.position.array;
      for (let j = 0; j < TRAIL; j++) { const q = c.trail[Math.min(j, c.trail.length - 1)]; arr[j * 3] = q.x; arr[j * 3 + 1] = q.y; arr[j * 3 + 2] = q.z; }
      c.line.geometry.attributes.position.needsUpdate = true;
      const fade = k > 0.85 ? (1 - k) / 0.15 : 1; c.line.material.opacity = 0.95 * fade; c.glow.material.opacity = 0.95 * fade;
    }
  }

  // warp (gratis): lichtstrepen in beeld tijdens een camera-vlucht
  scene.add(camera);
  const warpMat = new THREE.LineBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false });
  const warp = (() => {
    const n = 160, pos = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r0 = 0.5 + Math.random() * 4.5, len = 0.8 + Math.random() * 2.2;
      const x = Math.cos(a) * r0, y = Math.sin(a) * r0, f = 1 + len / r0;
      pos.set([x, y, -8, x * f, y * f, -8.6], i * 6);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const ls = new THREE.LineSegments(g, warpMat); ls.renderOrder = 999; ls.frustumCulled = false; camera.add(ls); return ls;
  })();

  // HQ-kern: een gouden zon, of het 3D-station uit models/ als dat er is (Meshy)
  const core = new THREE.Mesh(new THREE.SphereGeometry(1.6, 48, 48), new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffb84a, emissiveIntensity: 0.9, roughness: 0.4 }));
  scene.add(core);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(2.6, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.08 }));
  scene.add(halo);
  // 3D-modellen uit models/ (Meshy): rol "core" = HQ-station, "agent" = jager voor alle agents, "cluster" = moederschip per stelsel.
  const models = { core: null, agent: null, cluster: null, project: null };
  const goldMat = (tint) => new THREE.MeshStandardMaterial({ color: tint ? new THREE.Color(0xe6b862).lerp(new THREE.Color(tint), 0.45) : 0xe6b862, metalness: 0.65, roughness: 0.38, emissive: tint ? new THREE.Color(tint).multiplyScalar(0.25) : new THREE.Color(0x4a3208), emissiveIntensity: 0.55 });
  function normalizeModel(obj, targetSize, alongZ) {
    const box = new THREE.Box3().setFromObject(obj); const size = box.getSize(new THREE.Vector3()); const c = box.getCenter(new THREE.Vector3());
    const wrap = new THREE.Group();
    const s = targetSize / Math.max(size.x, size.y, size.z);
    obj.scale.setScalar(s); obj.position.sub(c.multiplyScalar(s));
    if (alongZ) {
      // Lange as van het schip langs Z, en de neus (het smalle eind) naar +Z, zodat lookAt "vooruit" is.
      if (size.x > size.z) obj.rotation.y = -Math.PI / 2;
      obj.updateMatrixWorld(true);
      const v = new THREE.Vector3(); let front = 0, back = 0, nf = 0, nb = 0, zmin = Infinity, zmax = -Infinity; const pts = [];
      obj.traverse((n) => { if (n.isMesh && n.geometry.attributes.position) { const a = n.geometry.attributes.position; const step = Math.max(1, Math.floor(a.count / 4000)); for (let i = 0; i < a.count; i += step) { v.fromBufferAttribute(a, i); n.localToWorld(v); pts.push(v.x, v.y, v.z); zmin = Math.min(zmin, v.z); zmax = Math.max(zmax, v.z); } } });
      const edge = (zmax - zmin) * 0.22;
      for (let i = 0; i < pts.length; i += 3) { const w = Math.abs(pts[i]) + Math.abs(pts[i + 1]); if (pts[i + 2] > zmax - edge) { front += w; nf++; } else if (pts[i + 2] < zmin + edge) { back += w; nb++; } }
      if (nf && nb && front / nf > back / nb) obj.rotation.y += Math.PI; // voorkant is breder dan achterkant: omdraaien
    }
    // Preview-modellen van Meshy zijn ongetextureerd; geef ze de gouden HQ-look. Getextureerde modellen laten we met rust.
    obj.traverse((n) => { if (n.isMesh) { if (!n.material || !n.material.map) n.material = goldMat(); else { n.material.roughness = Math.min(0.8, n.material.roughness ?? 0.6); n.material.emissive = new THREE.Color(0x5a6272); n.material.emissiveIntensity = 0.85; n.material.emissiveMap = n.material.map; } } });
    wrap.add(obj); return wrap;
  }
  const tintClone = (tpl, tint) => { const o = tpl.clone(); o.traverse((n) => { if (n.isMesh && !n.material.map) n.material = goldMat(tint); }); return o; };
  // Realistische rompen: per schip een eigen kleur uit een palet (gunmetal, staal, marine, verweerd, gebroken wit), metallic.
  const HULLS = [0x8e949c, 0x6b7078, 0xb8bcc2, 0x3f4650, 0xd9d4c8, 0x5a5049, 0x7a8590, 0x4a4f58];
  function hullClone(tpl, seed) {
    const o = tpl.clone();
    const base = new THREE.Color(HULLS[seed % HULLS.length]); const wear = ((seed >> 3) % 20) / 100;
    const mat = new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.9 + wear), metalness: 0.55 + ((seed >> 5) % 20) / 100, roughness: 0.42 + ((seed >> 7) % 25) / 100, emissive: 0x0a0c12, emissiveIntensity: 0.6 });
    o.traverse((n) => { if (n.isMesh && !n.material.map) n.material = mat; });
    return o;
  }
  // Baken: een klein lampje in de clusterkleur boven op het schip, met een gloed. Dit toont bij welk stelsel een schip hoort.
  function addBeacon(obj, hex, size) {
    const color = new THREE.Color(hex);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(size * 0.055, 10, 10), new THREE.MeshBasicMaterial({ color: color.clone().lerp(new THREE.Color(0xffffff), 0.5) }));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(size * 0.34);
    lamp.position.set(0, size * 0.3, -size * 0.12); glow.position.copy(lamp.position);
    obj.add(lamp); obj.add(glow); obj.userData.beacon = { lamp, glow, phase: Math.random() * 6 };
    return obj;
  }
  (async () => {
    try {
      const manifest = await fetch("models/manifest.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : {}));
      if (!THREE.GLTFLoader) return;
      const loader = new THREE.GLTFLoader();
      for (const entry of Object.values(manifest)) {
        if (!["core", "agent", "cluster", "project"].includes(entry.role)) continue;
        loader.load(`models/${entry.file}`, (gltf) => {
          if (entry.role === "core") {
            const group = normalizeModel(gltf.scene, entry.size || 4.2, false);
            if (entry.tilt) group.rotation.z = entry.tilt;
            // eigen lichtset voor het station: warm hoofdlicht, koel tegenlicht, zodat platen en schotel leesbaar zijn
            const sz = entry.size || 4.2;
            const keyL = new THREE.PointLight(0xfff0d0, 5, sz * 8, 1.2); keyL.position.set(sz * 1.3, sz * 1.1, sz * 1.2); group.add(keyL);
            const fillL = new THREE.PointLight(0x9fb8ff, 2.4, sz * 8, 1.2); fillL.position.set(-sz * 1.2, sz * 0.4, -sz * 1.3); group.add(fillL);
            scene.add(group); core.visible = false; models.coreHalo = (entry.size || 4.2) / 3.1; halo.scale.setScalar(models.coreHalo); models.core = group;
          } else if (entry.role === "agent") {
            models.agent = normalizeModel(gltf.scene, 1.5, true);
            for (const k of Object.keys(clusterHubs)) for (const m of clusterHubs[k].agentMeshes) { const f = addBeacon(hullClone(models.agent, hashStr(k + m.userData.name)), clusters[k].color, 1.5); m.add(f); m.material.visible = false; m.userData.ship = f; }
          } else if (entry.role === "cluster") {
            models.cluster = normalizeModel(gltf.scene, 3.4, true);
            for (const k of Object.keys(clusterHubs)) {
              const hub = clusterHubs[k]; const ship = addBeacon(hullClone(models.cluster, hashStr("moeder" + k)), clusters[k].color, 3.4);
              ship.position.copy(hub.center).add(new THREE.Vector3(0, 1.1, 0)); ship.rotation.y = Math.random() * Math.PI * 2; scene.add(ship); hub.ship = ship;
            }
          } else if (entry.role === "project") {
            models.project = normalizeModel(gltf.scene, 1, true);
            for (const p of projects) attachShip(p);
          }
        }, undefined, () => {});
      }
    } catch {}
  })();

  // Planeet-look voor de projectbollen: procedurele textuur per clusterkleur (gratis, geen assets nodig)
  const planetTextures = {};
  const hashStr = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h || 1; };
  const PLANET_TYPES = ["rots", "gas", "ijs", "lava", "oceaan"];
  const planetType = (name) => PLANET_TYPES[hashStr(name) % PLANET_TYPES.length];
  // Ruis (value noise + fbm) voor continenten, wolkenbanden, ijs en lava. Naadloos in de breedte.
  function makeNoise(seed) {
    let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const N = 64, grid = new Float32Array(N * N); for (let i = 0; i < grid.length; i++) grid[i] = rnd();
    const sm = (t) => t * t * (3 - 2 * t);
    const val = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi); const g = (a, b) => grid[((b % N + N) % N) * N + ((a % N + N) % N)]; return (g(xi, yi) * (1 - fx) + g(xi + 1, yi) * fx) * (1 - fy) + (g(xi, yi + 1) * (1 - fx) + g(xi + 1, yi + 1) * fx) * fy; };
    return (x, y, oct = 4) => { let a = 0, amp = 0.5, f = 1; for (let o = 0; o < oct; o++) { a += val(x * f, y * f) * amp; amp *= 0.5; f *= 2; } return a; };
  }
  function planetTexture(hex, type, name) {
    const key = `${hex}|${type}|${hashStr(name) % 7}`;
    if (planetTextures[key]) return planetTextures[key];
    const w = 512, h = 256, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d"); const base = new THREE.Color(hex);
    const img = ctx.createImageData(w, h); const d = img.data;
    const noise = makeNoise(hashStr(key));
    const light = base.clone().lerp(new THREE.Color(0xffffff), 0.55), dark = base.clone().multiplyScalar(0.28), deep = base.clone().lerp(new THREE.Color(0x0b1030), 0.6);
    const put = (i, c, k = 1) => { d[i] = 255 * Math.min(1, c.r * k); d[i + 1] = 255 * Math.min(1, c.g * k); d[i + 2] = 255 * Math.min(1, c.b * k); d[i + 3] = 255; };
    const tmp = new THREE.Color();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h, i = (y * w + x) * 4;
      // naadloos: sample op een cilinder
      const nx = Math.cos(u * Math.PI * 2) * 3 + 10, ny = Math.sin(u * Math.PI * 2) * 3 + 10;
      const n = noise(nx + v * 6, ny + v * 6, 5);
      const lat = Math.abs(v - 0.5) * 2;
      if (type === "gas") {
        const band = 0.5 + 0.5 * Math.sin(v * Math.PI * 9 + (n - 0.5) * 6);
        put(i, tmp.copy(dark).lerp(light, band * 0.85 + (n - 0.5) * 0.3));
      } else if (type === "ijs") {
        const crack = n > 0.62 ? 1 : 0;
        put(i, tmp.copy(base).lerp(new THREE.Color(0xf2f7ff), 0.55 + 0.35 * n - crack * 0.5));
      } else if (type === "lava") {
        const vein = Math.pow(Math.max(0, 1 - Math.abs(n - 0.55) * 9), 2);
        put(i, tmp.copy(new THREE.Color(0x1a1512)).lerp(light, vein * 1.1 + n * 0.12));
      } else if (type === "oceaan") {
        const land = n > 0.58 ? (n - 0.58) / 0.42 : -1;
        if (land < 0) put(i, tmp.copy(deep).lerp(base, 0.25 + n * 0.5)); else put(i, tmp.copy(base).lerp(light, 0.3 + land * 0.7));
        if (lat > 0.86) put(i, tmp.copy(new THREE.Color(0xeef4ff)).lerp(base, 0.15));
      } else { // rots
        const land = n > 0.5 ? (n - 0.5) / 0.5 : 0;
        put(i, tmp.copy(dark).lerp(light, 0.15 + land * 0.8 + (n - 0.5) * 0.2));
        if (lat > 0.9) put(i, tmp.copy(new THREE.Color(0xeef4ff)).lerp(base, 0.25));
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(cv); tex.wrapS = THREE.RepeatWrapping; tex.anisotropy = 4;
    return (planetTextures[key] = tex);
  }

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
    const disc = new THREE.Mesh(new THREE.RingGeometry(2.4, 9.5, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.035, side: THREE.DoubleSide, depthWrite: false }));
    disc.position.copy(center); disc.rotation.x = -Math.PI / 2; scene.add(disc);
    const link = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), center]), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.18 }));
    scene.add(link);
    const neb = new THREE.Sprite(new THREE.SpriteMaterial({ map: nebulaTexture(c.color), transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending }));
    // ver naar achteren en vaag: sfeer op de achtergrond, niet in de weg van de vloot
    neb.material.opacity = 0.11;
    neb.position.copy(center).multiplyScalar(3.1).add(new THREE.Vector3(0, -26 + Math.sin(i * 2.3) * 6, 0)); neb.scale.setScalar(110 + (i % 3) * 18); scene.add(neb); nebulae.push(neb);
    const members = projects.filter((p) => p.cluster === k);
    const label = addLabel(`${c.label} · ${members.length}`, ring, "cluster", c.color, 2.9);
    clusterHubs[k] = { center, color, ring, members, label, agentMeshes: [], group: new THREE.Group() };
    scene.add(clusterHubs[k].group);

    // agents als satellieten rond de ring
    (c.agents || []).forEach((a, j) => {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffb84a, emissiveIntensity: 0.5, flatShading: true }));
      // Eigen baan per jager: ellips met kanteling, eigen snelheid en een langzame drift, zodat ze tussen de planeten door zwerven.
      const seed = hashStr(k + a); const rr = (n) => ((seed >> (n * 5)) & 31) / 31;
      m.userData = { kind: "agent", name: a, cluster: k, phase: rr(0) * Math.PI * 2, rx: 3.2 + rr(1) * 3.5, rz: 3.2 + rr(2) * 3.5, tilt: rr(3) * Math.PI, inc: 0.2 + rr(4) * 0.9, speed: (0.12 + rr(5) * 0.22) * (rr(6) > 0.5 ? 1 : -1), drift: 0.05 + rr(7) * 0.1 };
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
      : new THREE.MeshStandardMaterial({ map: planetTexture(clusters[k].color, planetType(p.name), p.name), emissive: color, emissiveIntensity: 0.03 + h * 0.16, roughness: planetType(p.name) === "ijs" ? 0.45 : 0.9, metalness: 0 });
    const m = new THREE.Mesh(new THREE.SphereGeometry(size, 40, 40), mat);
    m.position.copy(animateFrom || pos); m.userData = { kind: "project", p, baseScale: 1, spin: 0.08 + Math.random() * 0.25, tilt: (Math.random() - 0.5) * 0.6 };
    m.rotation.z = m.userData.tilt;
    scene.add(m); pickables.push(m); p.mesh = m; p.extras = [];
    if (models.project) queueMicrotask(() => { attachShip(p); if (linksReady) rebuildLinks(); });
    if (p.status !== "archived") { // dunne dampkring: iets grotere bol, van binnenuit gezien, additief
      const atm = new THREE.Mesh(new THREE.SphereGeometry(size * 1.06, 32, 32), new THREE.MeshBasicMaterial({ color: color.clone().lerp(new THREE.Color(0xffffff), 0.4), transparent: true, opacity: 0.16 + h * 0.14, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      atm.position.copy(m.position); scene.add(atm); p.extras.push(atm);
    }
    if (p.status !== "archived" && (p.name.length % 4 === 0)) { // af en toe een ring, deterministisch per naam
      const ringM = new THREE.Mesh(new THREE.RingGeometry(size * 1.45, size * 2.1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
      ringM.position.copy(m.position); ringM.rotation.x = Math.PI / 2.4 + m.userData.tilt; scene.add(ringM); p.extras.push(ringM);
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
    for (const e of p.extras || []) if (e.material.color && e.geometry.type !== "TorusGeometry") e.material.color.copy(hub.color);
    if (p.mesh && p.mesh.material.map) { p.mesh.material.map = planetTexture(clusters[k].color, planetType(p.name), p.name); p.mesh.material.needsUpdate = true; }
    if (p.mesh && p.mesh.userData.ship && p.mesh.userData.ship.userData.beacon) { const b = p.mesh.userData.ship.userData.beacon; const c = new THREE.Color(clusters[k].color); b.lamp.material.color.copy(c).lerp(new THREE.Color(0xffffff), 0.5); b.glow.material.color.copy(c); }
    if (linksReady) rebuildLinks();
    moves.push({ p, from: p.mesh.position.clone(), to, t0: performance.now(), dur: reduceMotion ? 1 : 2200, arc: 6 });
    if (p.li) p.li.style.setProperty("--c", clusters[k].color);
    updateClusterCounts();
  }
  // Vloot: elk project is een klein slagschip (model met rol project) aan het planeetpunt; de bol blijft onzichtbaar als klikdoel.
  function attachShip(p) {
    if (!models.project || !p.mesh || p.mesh.userData.ship) return;
    const hub = clusterHubs[p.cluster];
    const len = 0.9 + heat(p.days) * 2.3;
    const ship = addBeacon(hullClone(models.project, hashStr(p.name)), p.status === "archived" ? "#5d6580" : clusters[p.cluster].color, 1);
    ship.scale.setScalar(len);
    p.mesh.add(ship); p.mesh.material.visible = false; p.mesh.userData.ship = ship; p.mesh.userData.spin = 0; p.mesh.rotation.set(0, 0, 0);
    for (const e of p.extras || []) if (e.geometry.type !== "TorusGeometry") e.visible = false; // dampkring en ring horen bij planeten
    // koers: in formatie, dwars op de lijn naar het moederschip, met een eigen kleine afwijking
    const d = p.mesh.position.clone().sub(hub.center); const tangent = new THREE.Vector3(-d.z, 0, d.x).normalize();
    const yaw = (hashStr(p.name) % 100) / 100 - 0.5;
    p.mesh.lookAt(p.mesh.position.clone().add(tangent).add(d.clone().normalize().multiplyScalar(yaw)));
    p.mesh.userData.bob = (hashStr(p.name) % 628) / 100;
  }
  // Datalinks: neonlijnen van elk schip naar zijn moederschip en van elk moederschip naar HQ, met lichtpulsen die data lijken te versturen.
  var linksReady = false;
  const LINK_CAP = 240, PULSES_PER = 3;
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(LINK_CAP * 6), 3));
  linkGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(LINK_CAP * 6), 3));
  const linkLines = new THREE.LineSegments(linkGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  linkLines.frustumCulled = false; scene.add(linkLines);
  const pulseGeo = new THREE.BufferGeometry();
  pulseGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(LINK_CAP * PULSES_PER * 3), 3));
  pulseGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(LINK_CAP * PULSES_PER * 3), 3));
  const dotTex = (() => { const cv = document.createElement("canvas"); cv.width = cv.height = 64; const c = cv.getContext("2d"); const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,0.6)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
  const pulses = new THREE.Points(pulseGeo, new THREE.PointsMaterial({ size: 0.9, map: dotTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  pulses.frustumCulled = false; scene.add(pulses);
  let links = [];
  const GOLD = new THREE.Color(0xffd27a), WHITE = new THREE.Color(0xffffff);
  function rebuildLinks() {
    links = [];
    for (const p of projects) if (p.mesh) links.push({ kind: "project", p, hub: clusterHubs[p.cluster], color: clusterHubs[p.cluster].color, seed: hashStr(p.name) });
    for (const k of clusterKeys) links.push({ kind: "hub", hub: clusterHubs[k], color: clusterHubs[k].color, seed: hashStr(k) });
    links = links.slice(0, LINK_CAP);
    linkGeo.setDrawRange(0, links.length * 2); pulseGeo.setDrawRange(0, links.length * PULSES_PER);
    linksReady = true;
  }
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Color();
  function updateLinks(s) {
    const lp = linkGeo.attributes.position.array, lc = linkGeo.attributes.color.array, pp = pulseGeo.attributes.position.array, pc = pulseGeo.attributes.color.array;
    for (let i = 0; i < links.length; i++) {
      const L = links[i];
      if (L.kind === "project") { _a.copy(L.p.mesh.position); _b.copy(L.hub.center); _b.y += 1.1; } else { _a.copy(L.hub.center); _a.y += 1.1; _b.set(0, 0.8, 0); }
      const busy = L.kind === "project" && busyRings.has(L.p.name);
      const h = L.kind === "project" ? heat(L.p.days) : 1;
      const lineCol = _c.copy(busy ? GOLD : L.color).multiplyScalar(busy ? 0.9 : 0.16 + h * 0.3);
      lp.set([_a.x, _a.y, _a.z, _b.x, _b.y, _b.z], i * 6); lc.set([lineCol.r, lineCol.g, lineCol.b, lineCol.r, lineCol.g, lineCol.b], i * 6);
      const active = busy ? PULSES_PER : L.kind === "hub" ? 2 : h >= 1 ? 2 : 1;
      const speed = (busy ? 0.9 : 0.12 + h * 0.25);
      for (let j = 0; j < PULSES_PER; j++) {
        const idx = (i * PULSES_PER + j) * 3;
        if (j >= active) { pc[idx] = pc[idx + 1] = pc[idx + 2] = 0; pp[idx] = _a.x; pp[idx + 1] = _a.y; pp[idx + 2] = _a.z; continue; }
        const ph = ((L.seed % 1000) / 1000 + j / PULSES_PER + s * speed) % 1;
        const f = j % 2 === 0 ? ph : 1 - ph; // om en om heen en terug
        pp[idx] = _a.x + (_b.x - _a.x) * f; pp[idx + 1] = _a.y + (_b.y - _a.y) * f + Math.sin(f * Math.PI) * 0.25; pp[idx + 2] = _a.z + (_b.z - _a.z) * f;
        const col = _c.copy(busy ? GOLD : L.color).lerp(WHITE, 0.45).multiplyScalar(busy ? 1.4 : 0.55 + h * 0.6);
        pc[idx] = col.r; pc[idx + 1] = col.g; pc[idx + 2] = col.b;
      }
    }
    linkGeo.attributes.position.needsUpdate = true; linkGeo.attributes.color.needsUpdate = true;
    pulseGeo.attributes.position.needsUpdate = true; pulseGeo.attributes.color.needsUpdate = true;
  }
  rebuildLinks();
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
    const far = camera.position.distanceTo(to);
    fly = { t0: performance.now(), from: camera.position.clone(), to, tFrom: controls.target.clone(), tTo: target.clone(), dur: reduceMotion ? 1 : Math.min(1600, 700 + far * 12) };
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
      const w = reduceMotion ? 0 : Math.sin(k * Math.PI);
      warpMat.opacity = w * 0.75; warp.rotation.z = k * 0.6; camera.fov = 50 + w * 14; camera.updateProjectionMatrix();
      if (k >= 1) { fly = null; warpMat.opacity = 0; camera.fov = 50; camera.updateProjectionMatrix(); }
    }
    updateComets(t);
    controls.update();
    core.scale.setScalar(1 + Math.sin(s * 1.4) * 0.03); halo.scale.setScalar((models.core ? models.coreHalo : 1) * (1 + Math.sin(s * 1.4 + 1) * 0.08));
    if (models.core) models.core.rotation.y = s * 0.05;
    belt.rotation.y = s * 0.012;
    for (const m of pickables) {
      if (m.userData.kind === "project") { if (m.userData.spin) m.rotation.y = s * m.userData.spin; if (m.userData.ship) m.userData.ship.position.y = Math.sin(s * 0.9 + m.userData.bob) * 0.08; }
      const b = m.userData.ship && m.userData.ship.userData && m.userData.ship.userData.beacon; if (b) b.glow.material.opacity = 0.4 + Math.sin(s * 2.2 + b.phase) * 0.2;
    }
    for (const k of clusterKeys) { const b = clusterHubs[k].ship && clusterHubs[k].ship.userData.beacon; if (b) b.glow.material.opacity = 0.5 + Math.sin(s * 1.6 + b.phase) * 0.2; }
    if (linksReady) updateLinks(s);
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
        const orbit = (t) => { // ellips in een gekanteld vlak, met langzame ademende straal
          const g = 1 + 0.18 * Math.sin(s * u.drift + u.phase);
          const ex = Math.cos(t) * u.rx * g, ez = Math.sin(t) * u.rz * g;
          const x = ex * Math.cos(u.tilt) - ez * Math.sin(u.tilt), z = ex * Math.sin(u.tilt) + ez * Math.cos(u.tilt);
          return [hub.center.x + x, hub.center.y + 0.7 + Math.sin(t) * u.inc + Math.sin(t * 3 + u.phase) * 0.15, hub.center.z + z];
        };
        const [x, y, z] = orbit(a); m.position.set(x, y, z);
        if (u.ship) { const [x2, y2, z2] = orbit(a + 0.04 * Math.sign(u.speed)); m.lookAt(x2, y2, z2); }
        else m.rotation.y = s * 0.8;
      }
      if (hub.ship) { hub.ship.rotation.y += 0.0015; hub.ship.position.y = hub.center.y + 1.1 + Math.sin(s * 0.7 + hub.center.x) * 0.2; }
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
