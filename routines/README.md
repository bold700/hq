# Routines: taken starten vanuit de wereld

Een Routine is een opgeslagen Claude Code configuratie (prompt + repo + omgeving) met een API-trigger. De wereld stuurt jouw taak naar `api/fire.js` op Vercel, die de Routine start en de sessie-link teruggeeft.

## Eenmalig inrichten

### 1. Vercel-project voor deze repo
1. https://vercel.com/new → importeer `bold700/hq`. Framework: **Other**. Build command leeg laten.
2. Settings → Environment Variables: `HQ_PASSWORD`, een wachtwoord naar keuze (vul je straks in de wereld in).
3. Deploy. Je krijgt een adres als `https://hq-xxxx.vercel.app`. De API leeft op `/api/fire`.

### 2. Per project een Routine
1. https://claude.ai/code/routines → **New routine**.
2. Naam: `HQ · <project>`.
3. Prompt: kopieer de tekst uit [`prompt.md`](prompt.md) en vervang `<repo>` en `<naam>`. Voor de hub zelf staat een eigen prompt in [`prompt-hq.md`](prompt-hq.md).
4. Repository: de repo van het project. Omgeving: Default (of een eigen omgeving). Connectors: alles weghalen wat het project niet nodig heeft.
5. Trigger: **API**. Opslaan, daarna de API-trigger openen, **Generate token**, en URL en token direct kopiëren (het token zie je maar één keer).
6. Voeg in Vercel één variabele toe per project: naam `HQ_ROUTINE_<PROJECTNAAM>` (hoofdletters; alles wat geen letter of cijfer is wordt `_`, dus `LiftLog` → `HQ_ROUTINE_LIFTLOG`, `penpot-slots` → `HQ_ROUTINE_PENPOT_SLOTS`). Waarde:
   ```json
   {"url": "https://api.anthropic.com/v1/claude_code/routines/trig_01ABC.../fire", "token": "sk-ant-oat01-..."}
   ```
   Redeploy Vercel na het toevoegen van een variabele. Bestaande projecten hoef je nooit meer aan te raken.

### 3. In de wereld
Klik rechtsboven in het zijpaneel op **Taken instellen**, vul het API-adres (`https://…vercel.app/api/fire`) en je wachtwoord in. Beide blijven alleen in jouw browser staan. Projecten met een Routine krijgen een ▶ in de lijst; in het detailpaneel verschijnt "Taak starten".

## Goed om te weten
- Elke start is een nieuwe cloud-sessie en telt mee in je dagelijkse Routine-limiet en je gebruik.
- De sessie draait zonder toestemmingsvragen. De prompt in `prompt.md` beperkt Claude tot een `claude/`-branch en een draft PR; pas dat niet aan zonder reden.
- Het token staat alleen in Vercel. Kom je het ergens anders tegen: regenerate in de Routine.
