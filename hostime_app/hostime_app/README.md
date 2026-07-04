# HosTime

App mobile Flutter multi-tenant per host di strutture ricettive (B&B, case
vacanza). Gestionale companion pensato per Play Store, ispirato al design e
al funzionamento del gestionale web di Caellitta Home.

## Stack

- Flutter (stable) — target Android in questa fase, iOS in seguito
- Supabase (Postgres + Auth), pacchetto `supabase_flutter`, sempre con la
  chiave pubblica **anon/publishable** — mai `service_role`
- Riverpod (`flutter_riverpod` + `riverpod_generator`)
- `go_router`
- `flutter_secure_storage` per la sessione (Android Keystore / iOS Keychain)
- `google_fonts` (Jost + Cormorant Garamond, le stesse font del sito)

## Setup locale

1. Copia `.env.example` in `.env` e inserisci l'URL e la anon key del tuo
   progetto Supabase:

   ```
   cp .env.example .env
   ```

2. Applica lo schema e la migration in `supabase/` al tuo progetto Supabase
   (schema originale + trigger di auto-provisioning host), nell'ordine:
   - `supabase/schema/schema_saas_hosting.sql`
   - `supabase/migrations/0002_host_signup_trigger.sql`

3. Installa le dipendenze e genera il codice Riverpod:

   ```
   flutter pub get
   dart run build_runner build --delete-conflicting-outputs
   ```

4. Avvia l'app:

   ```
   flutter run
   ```

In alternativa a `.env`, le credenziali possono essere passate con
`--dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...` (utile
per build CI/release senza portarsi dietro il file `.env`).

## Struttura

```
lib/
  core/       # theme, router, client supabase, widget condivisi
  features/
    auth/         # login, signup, repository/provider auth + host
    onboarding/    # wizard prima struttura
    properties/    # CRUD strutture
    splash/        # schermata di risoluzione routing
  app.dart
  main.dart
```

## Cosa manca (fasi successive)

Prenotazioni, manutenzioni, notifiche push (FCM), integrazioni Airbnb/Booking,
billing — volutamente fuori scope per questa prima versione.
