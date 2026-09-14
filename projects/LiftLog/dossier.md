# LiftLog

Dossier: wat elke agent moet weten voordat hij aan dit project werkt.

## Wat het is
Trainingslogboek voor personal trainer en sporter: de trainer maakt schema's, de sporter logt sets en gewichten, beiden zien voortgang. Web (React + Vite + TypeScript), iOS en Android via Capacitor, data in Firebase (Firestore, Storage), kleine API op Vercel. In gebruik door Kenny als trainer met eigen klanten.

## Voor wie en wat het oplevert
- Gebruikers: Kenny en zijn PT-klanten; aantal onbekend.
- Business: product · de PT-begeleiding wordt betaald, de app is het kanaal; de app zelf brengt nog niets in rekening.
- Wat ontbreekt om te verkopen: aanbod op papier (zie missie m-004), onboarding van een nieuwe sporter zonder Kenny, betaling.

## Hoe het draait
- Stack: React, Vite, TypeScript, Firebase (Firestore, Storage, Auth), Capacitor, Vercel voor de API.
- Starten: `npm install && npm run dev`
- Checks voor een push: `npm run check` (typecheck, lint, tests)
- Deploy: onbekend (vermoedelijk Vercel voor web; app stores handmatig). Controleer voordat je iets aan de deploy verandert.
- Secrets: Firebase-config en Vercel-omgevingsvariabelen; namen onbekend, waarden nooit in de repo.

## Waar het pijn doet
- Gezondheidsdata: de Firestore- en storage-rules zijn nog niet door de security-officer beoordeeld (missie m-003).
- Onbekend of er rules-tests zijn.

## Afspraken
- Elke wijziging aan rules of auth komt met een test die het juiste gedrag bewijst.
- De Routine pusht direct naar main na groene checks (`routines/prompt.md`); rood wordt nooit gepusht.

## Laatst bijgewerkt
2026-09-14 door claude
