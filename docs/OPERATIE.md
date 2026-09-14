# Operatie: een vloot die zichzelf in leven houdt, veilig houdt en geld oplevert

Dit is het plan van de agents zelf. Doel: van 68 losse repo's naar een vloot die zonder dagelijkse aandacht blijft werken, geen gaten laat vallen en Kenny helpt er geld mee te verdienen. Het plan is bewust een lus, geen lijst: kijken, voorstellen, goedkeuren, uitvoeren, laten zien, en weer kijken.

## De lus

1. **Patrouille** (elke nacht, Routine `HQ · patrouille`): een agent vliegt langs alle projecten en verzamelt feiten: laatste push, open PR's, CI-status, afhankelijkheden met bekende kwetsbaarheden, ontbrekende basis (README, licentie, rules, tests), en of het project geld kan of moet opleveren.
2. **Rapport en missies**: de patrouille schrijft `reports/<datum>.md` en werkt `missions.json` bij: concrete, kleine taken met een reden, een cluster, een verwachte winst en een agent die hem moet uitvoeren.
3. **Goedkeuren in de wereld**: het paneel "Missies" toont de open voorstellen. Eén klik op "Start" vuurt de Routine van dat project met de missie als taak. Niets gebeurt zonder die klik.
4. **Uitvoeren**: de Routine van het project doet het werk (direct op main, of via PR als main beschermd is) en schrijft een regel in `projects/<naam>/log.md`.
5. **Laten zien**: de wereld toont voortgang (ring, pulsen, "klaar"), en de volgende patrouille ziet het resultaat.

## Drie doelen, drie agents die erop toezien

| Doel | Agent | Kijkt naar |
|---|---|---|
| In leven | `maintainer` | rode CI, verouderde afhankelijkheden, kapotte builds, ontbrekende README of tests, repos die stil zijn maar wel gebruikt worden |
| Veilig | `security-officer` | secrets in code, Firestore- en storage-rules, open endpoints zonder auth, kwetsbare packages, afhankelijkheden van externe diensten zonder fallback |
| Geld | `revenue-strategist` | per product: wie betaalt, waarvoor, hoeveel; wat ontbreekt om te kunnen verkopen (landing, prijs, betaling, onboarding); welke projecten samen één aanbod vormen |

Daarboven staat `fleet-commander`: de agent die de patrouille leidt, de missies prioriteert en Kenny één kort bericht per week geeft: wat leeft, wat kraakt, wat kan verdienen.

De bestaande agents blijven: `code-reviewer` (elke wijziging), `ux-reviewer` en `design-system-guardian` (alles met een scherm), `penpot-expert` (Penpot-werk), `fitness-domain` (de fitness-apps).

## Hoe de agents beter worden

Agents zijn prompts plus context. Ze worden beter door drie dingen die in deze repo zitten:

- **Dossiers** (`projects/<naam>/dossier.md`): per project wat het is, voor wie, hoe het draait, wat het oplevert en waar het pijn doet. De patrouille vult ze aan; elke Routine leest ze voor het werk begint.
- **Logs** (`projects/<naam>/log.md`): elke run schrijft één regel. Zo weet de volgende agent wat er al geprobeerd is.
- **Rapporten** (`reports/`): de patrouille legt haar bevindingen vast. Fouten in de beoordeling corrigeer je in het dossier of de agent-prompt, niet in de chat; dan blijft het.

Trainen gebeurt dus niet met modellen maar met geheugen: hoe vollediger dossier en log, hoe scherper de missies. Elke correctie van Kenny in een dossier is een trainingsstap.

## Geld verdienen: de volgorde

De registry krijgt per project een veld `business`: `product` (kan verkocht worden), `service` (werk voor een klant), `intern` (hulpmiddel voor bold700), `lab` (experiment) of `none`. De revenue-strategist werkt alleen aan `product` en `service`, en dan in deze volgorde:

1. **Wat al inkomsten heeft of klanten heeft**: bold700-site (leads), de klantsites, vastgoedagent. Missies: leads sneller opvolgen, prijs en aanbod scherp op de site, portfolio uit de klantsites.
2. **Wat bijna verkoopbaar is**: LiftLog (PT-klanten betalen voor begeleiding; de app is het kanaal), de Penpot-tooling (plugins en MCP-server voor designers: betaald plan of sponsoring), bold700-ux-review-app (UX-review als dienst met de tool als bewijs).
3. **Wat samengevoegd een aanbod wordt**: Penpot-repo's als "design-tokens en Penpot-automatisering voor teams"; fitness-repo's als "PT-platform".

Elke missie in deze categorie eindigt in iets meetbaars: een pagina live, een prijs zichtbaar, een betaalknop, een e-mailflow, of een concreet aantal leads.

## Veilig

- Geen agent krijgt connectors die hij niet nodig heeft; Routines hebben geen Gmail, Drive of Agenda.
- Tokens en wachtwoorden staan alleen in Vercel en GitHub Secrets. De wereld staat achter een login.
- Elke Routine werkt op een `claude/`-branch of pusht alleen naar main als dat expliciet in de prompt staat; nooit force-push, nooit verwijderen.
- De security-officer opent nooit zelf een fix aan rules of auth zonder test; hij maakt een missie en die wordt goedgekeurd in de wereld.

## Wat er nu al staat (gebouwd in deze sessie)

- Vier nieuwe agents in `plugins/bold700-core/agents/`: fleet-commander, maintainer, security-officer, revenue-strategist, geregistreerd in `registry.json` en verdeeld over de clusters.
- `missions.json` als voorraad van voorstellen (zes om mee te beginnen), `api/missions.js` dat ze achter de login aan de wereld geeft, en het paneel "Missies" in de zijbalk en in het projectpaneel met een Start-knop per missie. Start stuurt de `task` naar de Routine van het project; de status (bezig, klaar) volgt de run zoals bij gewone taken.
- `templates/dossier.md`, de eerste dossiers en logs voor hq en LiftLog (`projects/`).
- `routines/patrouille.md`: de prompt voor de nachtelijke patrouille.
- Skill `hq-registry` uitgebreid met de conventies voor dossiers, logs en missies.

## Wat Kenny nog doet

1. **Routine `HQ · patrouille` aanmaken** op https://claude.ai/code/routines: prompt uit `routines/patrouille.md`, repo `bold700/hq`, schedule dagelijks 05:00, geen connectors. Dit is de motor van de lus. Tot die er is kun je missie m-001 ("Eerste patrouille draaien") in de wereld starten; die doet hetzelfde eenmalig via de hq-Routine.
2. **Per product dat geld moet opleveren een Routine** (zoals voor LiftLog en hq), zodat missies daar ook uitgevoerd kunnen worden: minimaal bold700-site en penpotmcp.
3. **Dossiers corrigeren** als de patrouille iets verkeerd inschat. Dat is de snelste manier om de agents beter te maken.
4. **Wekelijks tien minuten** in de wereld: missies goedkeuren of afwijzen.

## Wat "in leven" concreet betekent (de meetlat van de patrouille)

- Actief product: CI groen, laatste push < 30 dagen, geen open PR ouder dan 14 dagen, geen kwetsbare afhankelijkheid met bekende exploit.
- Gepauzeerd: README zegt wat het is en hoe het te starten; build werkt; anders een missie "opruimen of archiveren".
- Gearchiveerd: repo op archived, uit de registry als `archived`, geen missies.

Elk project dat drie patrouilles achter elkaar buiten de meetlat valt, krijgt automatisch een missie, met als eerste optie: archiveren. Een kleinere vloot die vaart is meer waard dan een grote die stilligt.
