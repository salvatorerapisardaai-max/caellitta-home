# 🛎️ Caellitta — property-management showcase

> 🇬🇧 [English](#-english) · 🇮🇹 [Italiano](#-italiano)

![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)

---

## 🇬🇧 English

### Description

Caellitta is a bespoke property-management system (PMS) designed to run short-term rental operations end-to-end: bookings, calendar, guest-facing Welcome Book, expense tracking and basic operational tools. This showcase describes the implemented features and architecture without including source code or sensitive data.

### Why I built it

Commercial PMS products are powerful but generic and carry recurring costs. I built Caellitta to have a lightweight, privacy-conscious system tailored to local processes and regulatory needs (Italy-specific checks and identifiers).

### Features (implemented)

- 📅 Bookings & calendar — create and manage reservations, visual calendar with check-ins/check-outs.
- 👤 Guest records — guest contact info and stay details used by the Welcome Book flow.
- 💶 Expense tracking — record operational expenses with categories and simple reporting in the dashboard.
- 🎁 Coupons & partner templates — define coupon templates and assign guest-facing codes per booking.
- 📱 Guest portal (Welcome Book) — guests access a localized welcome book using a booking code; contains house rules, local tips and coupons.
- 💬 WhatsApp templates — pre-built message templates to automate guest communications across phases of the stay.
- 🔐 Role-based access — admin/protected area (Supabase Auth) and limited public guest access by booking code.

### Architecture

| Layer | Tech |
|-------|------|
| Front-end | React (Vite), JavaScript, React Router |
| Back-end / DB | Supabase (Postgres, Auth, Row-Level Security) |
| Hosting | Vercel (environment variables for secrets) |

```
 Browser ─► React (Vite) ─► Supabase (Postgres + Auth)
                  │
                  └─► Supabase JS Client
```

### Roadmap (key gaps)

- 🔌 Channel manager — two-way calendar sync with Airbnb and Booking.com (primary gap vs commercial PMS).
- 🤖 Instagram automation pipeline integration for marketing (external Python pipeline, Cloudinary, GitHub Actions).
- 📊 Advanced revenue reporting and tax-oriented exports.

### What I learned

Designing a relational schema for real business use, securing it via Supabase Row-Level Security, and shipping a responsive React UI with a small operational backend. The hardest part in practice is reliable two-way synchronization with external booking platforms.

---

## 🇮🇹 Italiano

### Descrizione

Caellitta è un gestionale su misura per locazioni turistiche: prenotazioni, calendario, Welcome Book per gli ospiti, tracciamento spese e strumenti operativi. Questa vetrina descrive funzionalità e architettura senza esporre codice sorgente o dati sensibili.

### Perché l'ho costruito

Le soluzioni PMS commerciali sono potenti ma generiche e costose. Ho costruito Caellitta per avere uno strumento leggero, attento alla privacy e adattato ai flussi locali e agli adempimenti (es. specificità italiane).

### Funzionalità (implementate)

- 📅 Gestione prenotazioni e calendario — creazione e gestione prenotazioni, calendario con check-in/check-out.
- 👤 Anagrafica ospiti — informazioni di contatto e dettagli del soggiorno usati dal Welcome Book.
- 💶 Tracciamento spese — registrazione delle spese operative con categorie e report semplici in dashboard.
- 🎁 Coupon e template partner — definizione di template coupon e assegnazione di codici guest-facing per prenotazione.
- 📱 Portale ospiti (Welcome Book) — accesso via codice prenotazione al Welcome Book multilingua con regole della casa, suggerimenti locali e coupon.
- 💬 Template WhatsApp — messaggi predefiniti per automatizzare le comunicazioni con gli ospiti nelle varie fasi del soggiorno.
- 🔐 Accesso differenziato — area admin protetta (Supabase Auth) e accesso pubblico limitato per ospiti con codice prenotazione.

### Architettura

| Livello | Tecnologia |
|---------|------------|
| Front-end | React (Vite), JavaScript, React Router |
| Back-end / DB | Supabase (Postgres, Auth, Row-Level Security) |
| Hosting | Vercel (variabili d'ambiente per i segreti) |

```
 Browser ─► React (Vite) ─► Supabase (Postgres + Auth)
                  │
                  └─► Supabase JS Client
```

### Roadmap (gap chiave)

- 🔌 Channel manager — sincronizzazione bidirezionale del calendario con Airbnb e Booking.com (gap principale rispetto ai PMS commerciali).
- 🤖 Integrazione con pipeline di automazione Instagram per marketing (Python, Meta Graph API, Cloudinary, GitHub Actions).
- 📊 Reportistica ricavi e export per adempimenti fiscali.

### Cosa ho imparato

Progettare uno schema relazionale utilizzabile, metterlo in sicurezza con Row-Level Security di Supabase e costruire un'interfaccia React performante per operazioni reali.

---

Nota sulla disponibilità del codice

EN: "🔒 Source code is kept in a private repository to protect guest data and business logic. Available on request — happy to walk through it live."

IT: "🔒 Il codice sorgente è in un repository privato per tutelare i dati degli ospiti e la logica di business. Disponibile su richiesta — volentieri lo illustro dal vivo."

---

_Built and maintained by Salvatore Rapisarda._
