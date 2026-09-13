# Routines: taken starten vanuit de wereld

Een Routine is een opgeslagen Claude Code configuratie (prompt + repo + omgeving) met een API-trigger. De wereld stuurt jouw taak naar `api/fire.js` op Vercel, die de Routine start en de sessie-link teruggeeft.

## Eenmalig inrichten

### 1. Vercel-project voor deze repo
1. https://vercel.com/new → importeer `bold700/hq`. Framework: **Other**. Build command leeg laten.
2. Settings → Environment Variables:
   - `HQ_PASSWORD`: een wachtwoord naar keuze (vul je straks in de wereld in).
   - `HQ_ROUTINES`: `{}` (vul je aan per routine, zie stap 2).
3. Deploy. Je krijgt een adres als `https://hq-bold700.vercel.app`. De API leeft op `/api/fire`.

### 2. Per project een Routine
1. https://claude.ai/code/routines → **New routine**.
2. Naam: `HQ · LiftLog` (of het project dat je koppelt).
3. Prompt: kopieer de tekst uit [`prompt.md`](prompt.md) en vervang `<repo>`.
4. Repository: de repo van het project. Omgeving: Default (of een eigen omgeving).
5. Trigger: **API**. Opslaan, daarna **Generate token** en kopieer URL en token direct (het token zie je maar één keer).
6. Uit de URL haal je het routine-id (`trig_...`). Voeg toe aan `HQ_ROUTINES` in Vercel:
   ```json
   {"LiftLog": {"id": "trig_01ABC...", "token": "sk-ant-oat01-..."}}
   ```
   De sleutel is de projectnaam zoals in `registry.json`. Redeploy Vercel na het aanpassen van variabelen.

### 3. In de wereld
Klik rechtsboven in het zijpaneel op **Taken instellen**, vul het API-adres (`https://…vercel.app/api/fire`) en je wachtwoord in. Beide blijven alleen in jouw browser staan. Projecten met een Routine krijgen een ▶ in de lijst; in het detailpaneel verschijnt "Taak starten".

## Goed om te weten
- Elke start is een nieuwe cloud-sessie en telt mee in je dagelijkse Routine-limiet en je gebruik.
- De sessie draait zonder toestemmingsvragen. De prompt in `prompt.md` beperkt Claude tot een `claude/`-branch en een draft PR; pas dat niet aan zonder reden.
- Het token staat alleen in Vercel. Kom je het ergens anders tegen: regenerate in de Routine.
