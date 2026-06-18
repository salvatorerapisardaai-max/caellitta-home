# 🛎️ Caellitta — gestionale / property management system

> 🇬🇧 [English](#-english) · 🇮🇹 [Italiano](#-italiano)

![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

> ℹ️ Personal product for **[Caellitta Home](https://www.caellittahome.com)** (Aci Castello, Sicily). Published as a portfolio reference — guest data and credentials are handled off-repo via environment variables.
> Prodotto personale per **[Caellitta Home](https://www.caellittahome.com)** (Aci Castello, Sicilia). Pubblicato come riferimento di portfolio — dati ospiti e credenziali restano fuori dal repo, gestiti tramite variabili d'ambiente.

---

## 🇬🇧 English

A custom **property-management system** built to run a short-term rental end-to-end: bookings, calendar, guests and operations in one place. A self-hosted alternative to off-the-shelf PMS like Kross Booking, tailored to Italian tourism-rental compliance.

### Why I built it

Commercial PMS platforms (Kross Booking, Smoobu, Hostaway) are powerful but generic, recurring-cost, and not tuned to how I actually run the property or to Italian regulatory specifics (CIN, tourist tax, AlloggiatiWeb). I built my own to **own the data, remove subscription cost, and shape the workflow around the operation** — and to learn a full production stack from database to deploy.

### Features

- 📅 **Bookings & calendar** — manage reservations, track availability, view occupancy at a glance.
- 👤 **Guest records** — store contacts, stay details, and compliance documentation.
- 💶 **Expense tracking** — categorize costs (cleaning, maintenance, utilities, linens, materials, commissions) and monitor property operations.
- 🎁 **Partner coupons & discounts** — manage templates for local partners, assign coupons to bookings, and generate guest-facing coupon codes.
- 📱 **Guest portal** — booking code access to personalized Welcome Book with house rules, local tips, and exclusive partner discounts.
- 💬 **WhatsApp templates** — pre-built message templates for booking lifecycle phases (7-day countdown, arrival instructions, mid-stay check-in, checkout reminders).
- 🔐 **Role-based access** — admin area (password-protected) for property managers; public guest access with booking code validation.

### Architecture

| Layer | Tech |
|-------|------|
| Front-end | React (via Vite), TypeScript, React Router |
| Back-end / DB | Supabase (PostgreSQL, Auth, Row-Level Security) |
| Build / Dev | Vite, npm |
| Hosting | Vercel (environment variables for secrets) |

```
 Browser ─► React (Vite) ─► Supabase (Postgres + Auth)
                 │
                 └─► Supabase JS Client
```

### Project structure

```
caellitta-app/
├── src/
│   ├── App.jsx                 # Main router (admin/guest routes)
│   ├── lib/
│   │   └── supabase.js         # Supabase client initialization
│   ├── components/
│   │   ├── AuthGuard.jsx       # Session-based route protection
│   │   ├── AdminLayout.jsx     # Admin sidebar + navigation
│   │   └── Modal.jsx           # Reusable modal component
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── Login.jsx       # Supabase email/password auth
│   │   │   ├── Dashboard.jsx   # Bookings overview
│   │   │   ├── Prenotazioni.jsx # Booking management CRUD
│   │   │   ├── Spese.jsx       # Expense tracking with categories
│   │   │   ├── Convenzioni.jsx # Partner coupons & templates
│   │   │   └── WhatsApp.jsx    # Message templates by phase
│   │   └── guest/
│   │       ├── GuestAccess.jsx # Booking code verification
│   │       └── WelcomeBook.jsx # Guest portal (multi-language)
│   └── assets/
└── package.json
```

### Data model

Core tables in Supabase PostgreSQL:

- **bookings** — id, code, guest_name, check_in, check_out, guests_count, nights, status, …
- **expenses** — id, description, amount, category, date, property_id
- **coupon_templates** — id, partner, title, discount, description, active
- **guest_coupons** — id, booking_id, template_id, code, status, used_at
- **accounts** — admin users (managed via Supabase Auth)

### Roadmap

- 🔌 **Channel manager** — two-way calendar sync with Airbnb and Booking.com (the key gap vs. commercial PMS; the feature that makes a self-hosted gestionale fully competitive).
- 🤖 Integration with the Caellitta **Instagram automation pipeline** (Python · Meta Graph API · Cloudinary · GitHub Actions) for marketing.
- 📊 **Revenue reporting** — dashboards and export for income per booking, seasonal trends, and tax reporting.

### What I learned

Designing a relational schema for a real business, securing it with Supabase Row-Level Security, and shipping React + Vite on a modern dev stack. Most of all: understanding *why* commercial PMS charge what they do — the hard part isn't the CRUD, it's the channel-manager synchronisation against external booking platforms and the operational complexity at scale.

### Local development

```bash
# Install dependencies
npm install

# Copy example environment file
cp .env.example .env.local

# Add your Supabase credentials to .env.local:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key

# Start dev server (Vite)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

> Never commit `.env.local`. Store secrets in Vercel environment variables (or your hosting provider).

---

## 🇮🇹 Italiano

Un **gestionale** sviluppato su misura per gestire una locazione turistica dall'inizio alla fine: prenotazioni, calendario, ospiti e operatività in un unico posto. Un'alternativa self-hosted ai PMS commerciali come Kross Booking, costruita attorno alla normativa italiana sulle locazioni turistiche.

### Perché l'ho costruito

Le piattaforme PMS commerciali (Kross Booking, Smoobu, Hostaway) sono potenti ma generiche, con costo ricorrente, e non calibrate né sul mio modo di gestire la struttura né sulle specificità normative italiane (CIN, tassa di soggiorno, AlloggiatiWeb). Ho preferito costruire il mio per **possedere i dati, eliminare il canone e modellare il flusso di lavoro sull'operatività reale** — oltre che per imparare uno stack di produzione completo, dal database al deploy.

### Funzionalità

- 📅 **Gestione prenotazioni e calendario** — prenotazioni, disponibilità, occupazione a colpo d'occhio.
- 👤 **Anagrafica ospiti** — contatti, dettagli del soggiorno, tracciamento documenti/adempimenti.
- 💶 **Tracciamento spese** — categorie operative (pulizie, manutenzione, utenze, biancheria, materiali, commissioni) e monitoraggio della gestione.
- 🎁 **Coupon e convenzioni** — gestisci template per partner locali, assegna coupon a prenotazioni e genera codici esclusivi per gli ospiti.
- 📱 **Portale ospiti** — accesso via codice prenotazione al Welcome Book personalizzato con regole, consigli locali e coupon partner.
- 💬 **Template WhatsApp** — messaggi preimpostati per le fasi della prenotazione (countdown 7 giorni, istruzioni arrivo, controllo intermedio, reminder checkout).
- 🔐 **Accesso differenziato** — area admin protetta da password per i gestori; accesso pubblico ospiti con validazione codice prenotazione.

### Architettura

| Livello | Tecnologia |
|---------|-----------|
| Front-end | React (via Vite), TypeScript, React Router |
| Back-end / DB | Supabase (PostgreSQL, Auth, Row-Level Security) |
| Build / Dev | Vite, npm |
| Hosting | Vercel (variabili d'ambiente per i segreti) |

```
 Browser ─► React (Vite) ─► Supabase (Postgres + Auth)
                 │
                 └─► Supabase JS Client
```

### Struttura del progetto

```
caellitta-app/
├── src/
│   ├── App.jsx                 # Router principale (route admin/ospiti)
│   ├── lib/
│   │   └── supabase.js         # Inizializzazione client Supabase
│   ├── components/
│   │   ├── AuthGuard.jsx       # Protezione route basata su sessione
│   │   ├── AdminLayout.jsx     # Sidebar admin + navigazione
│   │   └── Modal.jsx           # Componente modal riutilizzabile
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── Login.jsx       # Auth Supabase email/password
│   │   │   ├── Dashboard.jsx   # Panoramica prenotazioni
│   │   │   ├── Prenotazioni.jsx # CRUD gestione prenotazioni
│   │   │   ├── Spese.jsx       # Tracciamento spese con categorie
│   │   │   ├── Convenzioni.jsx # Template coupon e partner
│   │   │   └── WhatsApp.jsx    # Template messaggi per fase
│   │   └── guest/
│   │       ├── GuestAccess.jsx # Verifica codice prenotazione
│   │       └── WelcomeBook.jsx # Portale ospiti (multilingua)
│   └── assets/
└── package.json
```

### Modello dati

Tabelle principali in Supabase PostgreSQL:

- **bookings** — id, code, guest_name, check_in, check_out, guests_count, nights, status, …
- **expenses** — id, description, amount, category, date, property_id
- **coupon_templates** — id, partner, title, discount, description, active
- **guest_coupons** — id, booking_id, template_id, code, status, used_at
- **accounts** — utenti admin (gestiti via Supabase Auth)

### Roadmap

- 🔌 **Channel manager** — sincronizzazione bidirezionale del calendario con Airbnb e Booking.com (il gap chiave rispetto ai PMS commerciali; la funzionalità che rende un gestionale self-hosted pienamente competitivo).
- 🤖 Integrazione con la **pipeline di automazione Instagram** di Caellitta (Python · Meta Graph API · Cloudinary · GitHub Actions) per il marketing.
- 📊 **Reportistica ricavi** — dashboard e export per incassi per prenotazione, trend stagionali e adempimenti fiscali.

### Cosa ho imparato

Progettare uno schema relazionale per un'attività reale, metterlo in sicurezza con la Row-Level Security di Supabase e realizzare React + Vite con uno stack moderno. Soprattutto: capire *perché* i PMS commerciali costano quanto costano — la parte difficile non è il CRUD, ma la sincronizzazione del channel manager con le piattaforme esterne e la complessità operativa in scala.

### Sviluppo locale

```bash
# Installa dipendenze
npm install

# Copia il file ambiente di esempio
cp .env.example .env.local

# Aggiungi le credenziali Supabase a .env.local:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key

# Avvia il dev server (Vite)
npm run dev

# Build per la produzione
npm run build

# Anteprima build di produzione localmente
npm run preview
```

> Non committare mai `.env.local`. Usa le variabili d'ambiente di Vercel (o del tuo provider di hosting).

---

_Built and maintained by / Realizzato e mantenuto da Salvatore Rapisarda._
