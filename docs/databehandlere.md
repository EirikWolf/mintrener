# Oversikt over Databehandlere — Min Trener

**Sist oppdatert:** 2026-08-27  
**Behandlingsansvarlig:** Eirik Wolfenstein (Min Trener)  
**Tjeneste-URL:** [mintrener.web.app](https://mintrener.web.app)

Dette dokumentet gir en fullstendig oversikt over eksterne databehandlere og tekniske underleverandører som benyttes i drift av treningsapplikasjonen **Min Trener**, i samsvar med kravene i EUs personvernforordning (GDPR) artikkel 28.

---

## 1. Hovedprinsipp: Innebygd personvern (Privacy by Design)

Min Trener er bygget etter prinsippet om at brukerens treningsdata primært lagres lokalt på enheten (**Offline-first / Local-first**). Nettsky-synkronisering skjer kun når brukeren aktivt velger å logge inn med Google-konto for sikkerhetskopiering og synkronisering på tvers av enheter.

---

## 2. Liste over Databehandlere

| Databehandler | Formål og Tjeneste | Geografisk Lagringslokasjon | Behandlingsgrunnlag | Sikkerhetsmekanisme |
| :--- | :--- | :--- | :--- | :--- |
| **Google Cloud Platform / Firebase** (Google Ireland Limited, Gordon House, Barrow St, Dublin 4, Irland) | **Brukerautentisering (Firebase Auth):** Behandling av e-post og Google-identifikator ved frivillig innlogging.<br><br>**Database (Cloud Firestore):** Kryptert lagring av treningshistorikk, egne programmer, tilpassede øvelser og styrkelogger.<br><br>**Web Hosting (Firebase Hosting):** Distribusjon av statiske PWA-ressurser via CDN. | **EU/EØS:** Datasenter i Frankfurt / Belgia (`europe-west3` / `eur3`). | GDPR Art. 6 (1) (b) (Avtaleoppfyllelse for innloggede brukere) og Art. 6 (1) (a) (Samtykke). | Google Cloud Data Processing Addendum (DPA) med EUs standardkontrakter (SCC). Kryptering i hvile (AES-256) og i transitt (TLS 1.3). |

---

## 3. Anonym telemetri og aggregert statistikk

Appen benytter en 100 % personvernvennlig løsning for å kartlegge hvilke øvelser og formater som er mest populære:
* **Ingen personopplysninger overføres:** Ingen bruker-ID, IP-adresser eller enhets-fingeravtrykk lagres.
* **Kun globale aggregattellere:** Tellerne i Firestore (`/global_stats/`) oppdateres atomisk som rene summer.
* **Rett til reservasjon (Opt-out):** Brukeren kan når som helst deaktivere anonym statistikkdeling med ett klikk under «Mer / Innstillinger» i appen.

---

## 4. Rutiner for sletting og innsyn (GDPR Art. 15 og Art. 17)

1. **Rett til sletting («Retten til å bli glemt»):**
   * Brukeren kan når som helst trykke «Slett konto & alle data» i appen. Handlingen sletter ugjenkallelig samtlige underkolleksjoner i Firestore (`history`, `workouts`, `custom_exercises`, `strength_logs`), fjerner autentiseringsprofilen og renser lokal lagring på enheten.
2. **Rett til dataportabilitet (Innsyn):**
   * Brukeren kan når som helst laste ned en fullstendig kopi av alle sine lagrede treningsdata som en strukturert `.json`-fil via eksportfunksjonen under «Mer»-fanen.

---

## 5. Kontakt for personvernspørsmål

For henvendelser vedrørende personvern, innsyn eller sletting, kan behandlingsansvarlig kontaktes via appens offisielle GitHub-kodelager: [github.com/EirikWolf/mintrener](https://github.com/EirikWolf/mintrener).
