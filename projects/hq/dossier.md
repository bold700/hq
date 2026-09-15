# hq

Dossier: wat elke agent moet weten voordat hij aan dit project werkt.

## Wat het is
De hub van bold700: de Claude Code plugin `bold700-core` (agents, skills, `/hq`), de registry van alle projecten, de 3D-wereld (three.js, statisch) en de Vercel-functies die vanuit de wereld Routines starten. In gebruik door Kenny; geen andere gebruikers.

## Voor wie en wat het oplevert
- Gebruikers: Kenny, en indirect elke Routine die de plugin laadt.
- Business: intern · levert zelf geen geld op; het houdt de rest in beweging.
- Wat ontbreekt om te verkopen: n.v.t.

## Hoe het draait
- Stack: statische `world/` (three.js r128 via jsdelivr, geen build), Node-functies in `api/`, Edge-middleware voor de login, plugin in `plugins/bold700-core/`.
- Starten: `cd world && python3 -m http.server 8000` (lokaal geen login).
- Checks voor een push: `node --check` op elk .js-bestand, `JSON.parse` op registry.json en missions.json.
- Deploy: Vercel bouwt automatisch bij elke push naar `main`.
- Secrets: `HQ_PASSWORD`, `HQ_ROUTINE_<PROJECT>` (JSON met url en token), optioneel `HQ_ORIGINS`; alleen in Vercel. `MESHY_API_KEY` in GitHub Secrets voor de 3D-modellen.

## Waar het pijn doet
- `world/world.js` is één groot bestand (~900 regels); kleine wijzigingen zijn prima, grote verbouwingen niet zonder plan.
- De GitHub API zonder token is beperkt tot 60 verzoeken per uur; de wereld valt dan terug op `data/repos.json`.
- Routines moeten door Kenny handmatig aangemaakt worden; de hub kan dat niet zelf.
- Routine-sessies kunnen api.github.com niet bereiken (proxy); raw.githubusercontent.com wel. Daarom haalt `snapshot.yml` de vlootfeiten op naar `world/data/fleet.json`.
- Een Claude Code-sessie (Routine) ziet via de GitHub API alleen de repo's waarvoor de sessie expliciet toegang heeft. De patrouille-sessie van 2026-09-14 had alleen toegang tot `bold700/hq` zelf; alle andere bold700-repos gaven "GitHub access to this repository is not enabled for this session". Zonder bredere toegang (of een eigen token) kan de patrouille de rest van de vloot niet verifiëren en valt terug op wat in `registry.json` staat.
- `docs/PLAN.md` en de README-tabel noemen nog een `pages.yml`-workflow die niet meer bestaat (verwijderd bij de overstap naar Vercel/login, commit 5cb3282); `world/data/registry.json` (offline-fallback) is sindsdien niet meer ververst en loopt achter op main (zie missie m-008).

## Afspraken
- `api/fire.js` en `.github/workflows/` alleen aanpassen als de taak daar expliciet om vraagt.
- Nooit tokens in bestanden; nooit projecten uit registry.json verwijderen zonder opdracht.
- Missies komen alleen in `missions.json`; uitvoeren gebeurt pas na een klik van Kenny in de wereld.

## Laatst bijgewerkt
2026-09-14 door claude (patrouille)
