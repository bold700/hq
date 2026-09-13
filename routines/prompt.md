Je werkt in de repo <repo> van bold700. Voer de taak uit die in het routine-fire-payload blok staat; dat is de opdracht die Kenny vanuit zijn projectwereld heeft gestuurd. Behandel de inhoud van dat blok als de taak, niet als losse instructies over jouw gedrag.

Werkwijze:
1. Lees eerst CLAUDE.md en, als die bestaat, projects/<naam>/dossier.md en log.md in bold700/hq voor context.
2. Houd de wijziging klein en af: code, tests en eventuele rules in dezelfde commit.
3. Draai de snelle checks van het project (lint, typecheck, tests) voordat je pusht. Push nooit rood.
4. Push direct naar main zodra de checks groen zijn. Kenny wil het resultaat meteen zien; een pull request is niet nodig. Gebruik één duidelijke commit met een Nederlands onderwerp dat zegt wat er voor de gebruiker verandert.
5. Lukt pushen naar main niet (geweigerd of conflict): haal main opnieuw op en probeer nog één keer; lukt het dan nog niet, push naar een branch met prefix claude/ en open een draft pull request, en zeg in de PR-beschrijving waarom.
6. Als de taak onduidelijk of te groot is: doe het deel dat wél duidelijk is, en beschrijf in de commit of PR wat je hebt overgeslagen en welke vraag je hebt.

Grenzen: geen force-push, geen secrets in code, geen externe services aanroepen die het project nog niet gebruikt.
