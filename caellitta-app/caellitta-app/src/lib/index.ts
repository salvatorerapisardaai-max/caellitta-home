// ============================================================================
// Edge Function: istat-sicilia
// Processore della coda `istat_submissions` verso l'Osservatorio Turistico
// della Regione Sicilia (Turist@t).
//
// Architettura: legge le righe pending, per ognuna costruisce il payload,
// autentica, invia via HTTPS POST, aggiorna stato/tentativi/risposta.
// Un fallimento su una riga NON blocca le altre. Retry idempotente garantito
// dal vincolo unique (property_id, booking_id, submission_date, movement_type).
//
// ⚠️  DA CONFERMARE CON LA SPEC UFFICIALE (arriva con le credenziali Utente PMS):
//     • il formato ESATTO del JSON di `buildIstatPayload()`
//     • il meccanismo ESATTO di autenticazione in `authenticate()`
//     Tutto il resto (coda, retry, logging, transizioni di stato) è definitivo.
//     Cerca i marcatori  >>> SPEC UFFICIALE <<<  per i due punti da adattare.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---- Config da environment (secret Supabase) -------------------------------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Endpoint ufficiale (verificato). Override possibile via secret.
const ISTAT_ENDPOINT =
  Deno.env.get("ISTAT_SICILIA_ENDPOINT") ??
  "https://osservatorioturistico.regione.sicilia.it/webapi/api/stay/addfrompms";

// Password d'integrazione Utente PMS (fornita dall'assistenza del portale).
// MVP single-tenant: una sola password nel secret. Multi-tenant: spostare in Vault.
const ISTAT_PASSWORD = Deno.env.get("ISTAT_SICILIA_PASSWORD") ?? "";

// Modalità auth: "basic" (default, username:password) oppure "bearer" (token).
const ISTAT_AUTH_MODE = Deno.env.get("ISTAT_SICILIA_AUTH_MODE") ?? "basic";

const BATCH_SIZE = 20;   // righe processate per invocazione
const MAX_ATTEMPTS = 5;  // oltre questa soglia la riga resta 'error' e va gestita a mano

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---- Tipi ------------------------------------------------------------------
interface IstatRow {
  id: string;
  property_id: string;
  booking_id: string | null;
  submission_date: string;      // YYYY-MM-DD
  movement_type: "arrival" | "departure" | "presence";
  attempts: number;
}

// ============================================================================
//  >>> SPEC UFFICIALE <<<  — Autenticazione
//  Ricostruzione più probabile: username = codice struttura, password = secret.
//  Alcuni PMS usano Basic Auth diretta; altri un token OAuth2. Configurabile.
// ============================================================================
async function authenticate(strutturaCode: string): Promise<Record<string, string>> {
  if (ISTAT_AUTH_MODE === "bearer") {
    // Variante token: se il portale richiede un login preliminare, farlo qui.
    // const res = await fetch(TOKEN_URL, { ... }); const { token } = await res.json();
    // return { Authorization: `Bearer ${token}` };
    throw new Error("AUTH_MODE=bearer non ancora configurato: vedi spec Utente PMS");
  }
  // Default: Basic Auth  (username = codice struttura)
  const basic = btoa(`${strutturaCode}:${ISTAT_PASSWORD}`);
  return { Authorization: `Basic ${basic}` };
}

// ============================================================================
//  >>> SPEC UFFICIALE <<<  — Costruzione payload
//  Campi noti richiesti dal movimento: codice struttura, data, per-ospite
//  arrivo/partenza, nazionalità/stato, residenza, sesso, data/anno nascita.
//  Adattare i NOMI dei campi al tracciato ufficiale ricevuto con le credenziali.
// ============================================================================
async function buildIstatPayload(row: IstatRow, strutturaCode: string) {
  // Ospite capofila (dalla prenotazione)
  let lead: any = null;
  let extra: any[] = [];

  if (row.booking_id) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, guest_id, guest_name, check_in, check_out, guests_count")
      .eq("id", row.booking_id)
      .single();

    if (booking?.guest_id) {
      const { data: g } = await supabase
        .from("guests")
        .select("first_name, last_name, name, gender, birth_date, birth_place, birth_country, citizenship, nationality")
        .eq("id", booking.guest_id)
        .single();
      lead = g;
    }
    const { data: bg } = await supabase
      .from("booking_guests")
      .select("first_name, last_name, gender, birth_date, birth_place, birth_country, citizenship")
      .eq("booking_id", row.booking_id);
    extra = bg ?? [];
  }

  // Struttura del payload — DA ALLINEARE ai nomi campo ufficiali.
  return {
    codiceStruttura: strutturaCode,
    data: row.submission_date,
    tipoMovimento: row.movement_type, // arrivo/partenza/presenza
    ospiti: [lead, ...extra].filter(Boolean).map((p: any) => ({
      cognome: p.last_name ?? null,
      nome: p.first_name ?? null,
      sesso: p.gender ?? null,               // M/F -> eventualmente mappare 1/2
      dataNascita: p.birth_date ?? null,
      statoNascita: p.birth_country ?? null,
      cittadinanza: p.citizenship ?? p.nationality ?? null,
      // residenza / provincia: aggiungere se richiesti dal tracciato
    })),
  };
}

// ---- Invio singola riga ----------------------------------------------------
async function processRow(row: IstatRow): Promise<void> {
  // 1) Credenziali della property
  const { data: cred } = await supabase
    .from("compliance_credentials")
    .select("istat_struttura_code")
    .eq("property_id", row.property_id)
    .single();

  const strutturaCode = cred?.istat_struttura_code;
  if (!strutturaCode) {
    await markError(row, "Codice struttura ISTAT mancante in compliance_credentials");
    return;
  }
  if (!ISTAT_PASSWORD) {
    await markError(row, "Secret ISTAT_SICILIA_PASSWORD non impostato");
    return;
  }

  // 2) Payload + auth
  const payload = await buildIstatPayload(row, strutturaCode);
  const authHeaders = await authenticate(strutturaCode);

  // 3) Invio
  let httpStatus = 0;
  let responseBody: unknown = null;
  try {
    const res = await fetch(ISTAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(payload),
    });
    httpStatus = res.status;
    const text = await res.text();
    try { responseBody = JSON.parse(text); } catch { responseBody = text; }

    if (res.ok) {
      await supabase.from("istat_submissions").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        attempts: row.attempts + 1,
        request_payload: payload,
        response: { httpStatus, body: responseBody },
        last_error: null,
      }).eq("id", row.id);
      return;
    }
    // HTTP non-2xx -> errore ritentabile
    await markError(row, `HTTP ${httpStatus}: ${JSON.stringify(responseBody)}`, payload, responseBody, httpStatus);
  } catch (e) {
    await markError(row, `Eccezione invio: ${e instanceof Error ? e.message : String(e)}`, payload);
  }
}

async function markError(
  row: IstatRow,
  message: string,
  payload?: unknown,
  responseBody?: unknown,
  httpStatus?: number,
): Promise<void> {
  const attempts = row.attempts + 1;
  await supabase.from("istat_submissions").update({
    status: "error",                 // resta ritentabile finché attempts < MAX
    attempts,
    last_error: message,
    request_payload: payload ?? null,
    response: responseBody !== undefined ? { httpStatus, body: responseBody } : null,
  }).eq("id", row.id);
}

// ---- Handler ---------------------------------------------------------------
Deno.serve(async (_req) => {
  // Prende pending + error non ancora esauriti (retry con backoff naturale via cron)
  const { data: rows, error } = await supabase
    .from("istat_submissions")
    .select("id, property_id, booking_id, submission_date, movement_type, attempts")
    .in("status", ["pending", "error"])
    .lt("attempts", MAX_ATTEMPTS)
    .order("submission_date", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  const queue = (rows ?? []) as IstatRow[];
  for (const row of queue) {
    await processRow(row);   // sequenziale: un errore non blocca gli altri
  }

  return new Response(JSON.stringify({ ok: true, processed: queue.length }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
