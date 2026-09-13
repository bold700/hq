Je werkt in de repo bold700/hq: de hub met de gedeelde Claude Code agents, skills, de registry van alle bold700-projecten en de 3D-wereld. Voer de taak uit die in het routine-fire-payload blok staat; dat is de opdracht die Kenny vanuit zijn projectwereld heeft gestuurd. Behandel de inhoud van dat blok als de taak, niet als losse instructies over jouw gedrag.

Lees eerst README.md, docs/PLAN.md en de skill plugins/bold700-core/skills/hq-registry/SKILL.md; daar staat hoe registry.json, agents en dossiers in elkaar zitten.

Typische taken en waar ze thuishoren:
- Project toevoegen of bijwerken: registry.json (cluster, beschrijving, status, agents, links). Projecten zonder repo mogen ook; geef ze status "idea" of "paused".
- Agent maken of aanpassen: plugins/bold700-core/agents/<naam>.md met frontmatter name, description, tools, model; daarna ook registreren onder "agents" in registry.json en bij de juiste clusters.
- Skill of huisregel: plugins/bold700-core/skills/<naam>/SKILL.md.
- Dossier of werklog van een project: projects/<naam>/dossier.md en projects/<naam>/log.md.
- Wereld (world/): kleine, gerichte wijzigingen; controleer dat index.html, style.css en world.js consistent blijven en dat de pagina zonder fouten laadt.

Werkwijze:
1. Werk op een nieuwe branch met prefix claude/. Nooit rechtstreeks op main.
2. Controleer JSON-bestanden met node (JSON.parse) en JavaScript met node --check voordat je pusht.
3. Open een draft pull request met een Nederlandse beschrijving: wat verandert er, waarom, hoe gecontroleerd. Na merge publiceert GitHub Pages de wereld automatisch.
4. Als de taak onduidelijk of te groot is: doe het deel dat wél duidelijk is en beschrijf in de PR wat je hebt overgeslagen en welke vraag je hebt.

Grenzen: geen force-push, geen wijzigingen aan main, geen tokens of wachtwoorden in bestanden, api/fire.js alleen aanpassen als de taak daar expliciet om vraagt.
