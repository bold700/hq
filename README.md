# bold700 HQ

Eén plek voor alles wat over projecten heen gaat: de gedeelde Claude Code agents en skills, de huisregels, het register van projecten, en de 3D-wereld waarin je alles ziet.

**Wereld:** https://hq-zeta-lilac.vercel.app/ · **Plan:** [docs/PLAN.md](docs/PLAN.md) · **Operatie (agents, missies, patrouille):** [docs/OPERATIE.md](docs/OPERATIE.md)

## Wat zit erin

| Map | Wat |
|---|---|
| `.claude-plugin/marketplace.json` | De marketplace `bold700`. Projecten wijzen hiernaar. |
| `plugins/bold700-core/` | De plugin: 9 agents, 2 skills, het `/hq` commando. |
| `registry.json` | Welke projecten er zijn, in welk cluster, met welke agents, en of ze geld kunnen opleveren (`business`). |
| `missions.json` | Voorstellen van de patrouille; in de wereld start je ze met één klik. |
| `projects/<naam>/` | Dossier en log per project: het geheugen van de agents. |
| `reports/` | Rapporten van de nachtelijke patrouille. |
| `routines/` | Prompts voor de Routines, waaronder `patrouille.md`. |
| `world/` | De 3D-wereld (three.js, statisch, geen build). |
| `templates/` | `settings.json` en `CLAUDE.md` voor nieuwe projecten. |
| `scripts/connect-project.sh` | Koppelt een repo aan de hub in één commando. |
| `scripts/build-snapshot.mjs` | Haalt de repolijst op uit GitHub voor de wereld (dagelijks via `snapshot.yml`). |
| `scripts/build-fleet.mjs` | Haalt per project PR's, CI, README en rules op naar `world/data/fleet.json` voor de patrouille (dagelijks via `snapshot.yml`). |

## Agents

| Agent | Wanneer |
|---|---|
| `ux-reviewer` | Schermen en flows beoordelen op bruikbaarheid en toegankelijkheid |
| `penpot-expert` | Penpot API, MCP-server, plugins, design tokens |
| `design-system-guardian` | Tokens, componenten, Material 3 consistent houden |
| `code-reviewer` | Elke diff en PR op bugs en regressies |
| `fitness-domain` | LiftLog, FitnessFlow en de andere fitness-apps |
| `fleet-commander` | Patrouille over alle projecten, missies prioriteren, weekbericht |
| `maintainer` | Projecten in leven houden: CI, afhankelijkheden, build, README |
| `security-officer` | Secrets, rules, open endpoints, kwetsbare packages, privacy |
| `revenue-strategist` | Kortste weg naar betalende klanten, in meetbare missies |

Agents wijzigen of toevoegen: bewerk `plugins/bold700-core/agents/*.md`, werk `registry.json` bij, push naar `main`. Elk gekoppeld project krijgt de update bij de volgende sessie (of direct via `/plugin` → update).

## Een project koppelen

```bash
bash scripts/connect-project.sh /pad/naar/repo
```

Of handmatig: kopieer `templates/settings.json` naar `.claude/settings.json` in de repo. Open daarna een nieuwe Claude Code sessie in dat project en typ `/hq`.

## Login

De wereld draait op Vercel achter een login: `middleware.js` (Edge) stuurt alles zonder sessiecookie naar `login.html`, en `api/login.js` zet de cookie na het wachtwoord uit `HQ_PASSWORD`. Dat is hetzelfde wachtwoord als voor het starten van taken; ingelogd hoef je in de instellingen niets meer in te vullen. Er is geen openbare kopie meer (GitHub Pages staat uit).

## De wereld lokaal bekijken

```bash
cd world && python3 -m http.server 8000
```

Open http://localhost:8000. Lokaal is er geen login. De pagina haalt de registry rechtstreeks van `main`, de repolijst live uit de GitHub API, en vult aan met `data/repos.json` (privé repos, fallback).

## Missies

De patrouille (Routine `HQ · patrouille`, prompt in `routines/patrouille.md`) kijkt elke nacht langs alle projecten, schrijft `reports/<datum>.md` en zet voorstellen in `missions.json`. In de wereld staan ze onder **Missies**, gesorteerd op veilig, in leven, geld. Klik **Start** en de Routine van dat project voert de missie uit; niets gebeurt zonder die klik. Hoe het geheel werkt: [docs/OPERATIE.md](docs/OPERATIE.md).

## Taken starten vanuit de wereld

Klik op een ster, typ wat Claude moet doen en klik **Start in Claude Code**. De wereld stuurt de taak naar `api/fire.js` (op Vercel), die de Routine van dat project start en de sessie-link teruggeeft. Eenmalig inrichten: zie [routines/README.md](routines/README.md).
