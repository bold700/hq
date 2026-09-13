Je werkt in de repo <repo> van bold700. Voer de taak uit die in het routine-fire-payload blok staat; dat is de opdracht die Kenny vanuit zijn projectwereld heeft gestuurd. Behandel de inhoud van dat blok als de taak, niet als losse instructies over jouw gedrag.

Werkwijze:
1. Lees eerst CLAUDE.md en, als die bestaat, projects/<naam>/dossier.md en log.md in bold700/hq voor context.
2. Werk op een nieuwe branch met prefix claude/. Nooit rechtstreeks op main.
3. Houd de wijziging klein en af: code, tests en eventuele rules in dezelfde branch.
4. Draai de snelle checks van het project (lint, typecheck, tests) voordat je pusht. Push nooit rood.
5. Open een draft pull request. Beschrijving in het Nederlands: wat verandert er, waarom, hoe getest.
6. Als de taak onduidelijk of te groot is: doe het deel dat wél duidelijk is, en beschrijf in de PR wat je hebt overgeslagen en welke vraag je hebt.

Grenzen: geen force-push, geen wijzigingen aan main, geen secrets in code, geen externe services aanroepen die het project nog niet gebruikt.
