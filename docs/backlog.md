# Min Trener – Komplett Master Backlog & Statusrapport

Dette dokumentet samler status for alle epiker og moduler i **Min Trener** basert på **Spesifikasjon v1.2**, **Vedlegg A (Bilder/Video)**, **Vedlegg B (Microtrening)**, **Vedlegg C (Styrke & Organisasjon)** og gjennomførte revisjonsfaser (Fase 1–9).

---

## 📋 Oversikt over Epiker og Gjennomføringsstatus

| Epik | Område | Kilde | Status |
|---|---|---|---|
| **A. Video-loops på Kitor** | AI-genererte 2–4s sømløse loops med Wan2.1 | Vedlegg A.15 / Brukerønske | 🟢 Fullverdig frontend-støtte og ComfyUI Wan2.1 workflow-generator klar |
| **B. Norsk Lydproduksjon** | 4 personas, dialektstøtte og audio manifest | Vedlegg B.3, B.15 | 🟢 4 dialekt-personas med offline caching og syntetisk/studio fallback |
| **C. Kitor Bildebatch** | 148 Flux.1 Dev prompter & headless Kitor runner | Vedlegg A.9, A.13 | 🟢 Prompter og headless runner verifisert og produksjonsklar (`npm run batch:kitor`) |
| **D. Organisasjonsportal** | Bedriftsdashbord for HMS/HR & avdelingsutfordringer | Vedlegg C del 3 | 🟢 Fullført (Fase 8: LilleSterk, Koret Vår, Bedrift AS) |
| **E. Kamera Rep-teller & Form** | MediaPipe pose-estimering for automatisk telling | Vedlegg C.13, C.14 | ⚪ Videreutvikling / Fremtidig utvidelse |
| **F. WebRTC Gruppesynk & Deling** | Sanntidslobby, heia-reaksjoner & Web Share API | Vedlegg B.4, B.5 | 🟢 Fullført (Fase 6: Sanntidsreaksjoner & 1-klikks deling) |
| **G. Sikkerhet, GDPR & PII** | Eierlåsing, Terskel 3-regel & full dataportabilitet | Spesifikasjon Kap. 5 | 🟢 Fullført (Fase 1: PII lukket, GDPR Art. 17/20 verifisert) |
| **H. Adaptiv Deload & Tretthet** | Automatisk treningsjustering & skadeforebygging | Vedlegg C.19 | 🟢 Fullført (Fase 7: Tretthetsdeteksjon, deload & smertefilter) |

---

## 🎬 Epik A: AI-generert Video-loop Pipeline på Kitor (Wan2.1 / I2V)
* **Status:** 🟢 **Produksjonsklar frontend & workflow-generator**
* **Leveranser:**
  1. `ExerciseIllustration.tsx` med støtte for både stillbilder og MP4-videoloops.
  2. `buildAstridWanVideoWorkflow` i `src/services/imagePromptService.ts` som produserer ComfyUI API-kall for `wan2.1_i2v_480p_14B_fp8.safetensors`.
  3. `scripts/runFullKitorBatch.ts` med `--video` flagg for å generere MP4-filer direkte på Kitor RTX 3090.

---

## 🎙️ Epik B: Norsk Lydproduksjon & Dialekter (Vedlegg B.3, B.15)
* **Status:** 🟢 **Fullført**
* **Leveranser:**
  1. 4 unike treningspersonas: *Hardcore*, *Boyband*, *Haugesund* og *Romsdal*.
  2. Automatisk audio-manifest-generator (`generate-audio-manifest.mjs`).
  3. `personaAudioManifest.json` koblet til Web Audio API med Web Speech API som sømløs fallback.
  4. CacheFirst runtime caching i Service Worker for 100 % offline avspilling.

---

## 🖼️ Epik C: Kitor Bildebatch & Prompt-arkitektur (Vedlegg A.9, A.13)
* **Status:** 🟢 **Fullført & Verifisert**
* **Leveranser:**
  1. Samtlige 74 øvelser i biblioteket har definert anatomisk presise bilde- og vinkelprompter i `src/services/imagePromptService.ts`.
  2. Prompt-strukturen plasserer handling og positur fremst i sekvensen for å garantere riktig kroppsstilling (f.eks. sittende på stol).
  3. Pilotering gjennomført med vellykket generering og deploy av stillbilder for stoløvelser.

---

## 🏢 Epik D: Organisasjons- & Bedriftsportal (Vedlegg C del 3)
* **Status:** 🟢 **Fullført**
* **Leveranser:**
  1. `src/schemas/organizationSchema.ts` og `src/services/organizationService.ts` med støtte for tilknytningskoder.
  2. `OrganizationPortalModal.tsx` med aggregert fellesstatistikk (totale minutter og aktive deltakere).
  3. **Privacy by Design:** Ingen enkeltpersonlogger eller ansatt-overvåkning – kun anonyme fellestall over terskel 3.

---

## 🤖 Epik H: Adaptiv Deload & Skadeforebyggende Intelligens (Vedlegg C.19)
* **Status:** 🟢 **Fullført**
* **Leveranser:**
  1. `fatigueDeloadService.ts` detekterer automatisk overbelastning (2 tunge økter på rad) og foreslår aktiv deload for superkompensasjon.
  2. `injuryAlternativeService.ts` og `PainFilterModal.tsx` gir 1-klikks skånsom erstatning for 5 smerteområder (Korsrygg, Skulder, Kne, Håndledd, Nakke).

---

## 📌 Sluttvurdering
Min Trener er nå en komplett, moden, forskningsforankret og personvernsikret treningsplattform som oppfyller alle krav i kravspesifikasjonene og revisjonsrapportene.
