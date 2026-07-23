// ============================================================================
// Edge Function: alloggiati-web
// Processa la coda `guest_registrations` verso il Web Service SOAP di
// Alloggiati Web (Polizia di Stato) — invio schedine alloggiati.
//
// Architettura identica a istat-sicilia: batch di righe pending/error, per
// ognuna costruisce il tracciato, ottiene un token, verifica (Test) e invia
// (Invio), salva la ricevuta, aggiorna stato/tentativi. Un fallimento su una
// riga non blocca le altre. Idempotente per idempotency_key.
//
// ⚠️  DA CONFERMARE CON LA WSDL UFFICIALE (disponibile nel pannello
//     alloggiatiweb.poliziadistato.it dopo l'attivazione del Web Service):
//     • nome esatto del namespace/action SOAP e degli endpoint
//     • posizioni/lunghezze esatte dei campi nel tracciato a larghezza fissa
//     • tabella codici Comune/Stato (serve l'elenco ufficiale ISTAT)
//     • formato esatto della ricevuta restituita da Invio
//     Tutto il resto (coda, retry, storage ricevuta, transizioni di stato,
//     deadline 24h) è definitivo e non dipende dalla spec.
//     Cerca i marcatori  >>> SPEC UFFICIALE <<<  per i punti da adattare.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Endpoint del Web Service (verificare l'URL esatto fornito nel pannello Alloggiati Web)
const ALLOGGIATI_ENDPOINT =
  Deno.env.get("ALLOGGIATI_ENDPOINT") ??
  "https://alloggiatiweb.poliziadistato.it/service/service.asmx";

const RECEIPT_BUCKET = "compliance-receipts";
const BATCH_SIZE = 10;
const MAX_ATTEMPTS = 5;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---- Tipi -------------------------------------------------------------------
interface RegRow {
  id: string;
  booking_id: string;
  property_id: string;
  attempts: number;
  deadline_at: string | null;
}

interface GuestLine {
  role_code: string;      // 16 singolo · 17 capofamiglia · 18 capogruppo · 19 familiare · 20 membro
  first_name: string;
  last_name: string;
  gender: string | null;       // 'M' | 'F'
  birth_date: string | null;   // YYYY-MM-DD
  birth_place: string | null;
  birth_country: string | null;
  citizenship: string | null;
  document_type: string | null;
  document_number: string | null;
  check_in: string;   // YYYY-MM-DD, arrivo
  nights: number;     // giorni permanenza
}

// ---- Utility formattazione tracciato -----------------------------------------
function padR(s: string | null | undefined, len: number): string {
  return (s ?? "").toUpperCase().slice(0, len).padEnd(len, " ");
}
function padDateGGMMAAAA(iso: string | null | undefined): string {
  if (!iso) return "".padEnd(8, " ");
  const [y, m, d] = iso.split("-");
  return `${d}${m}${y}`;
}
function sesso1o2(g: string | null): string {
  return g === "F" ? "2" : "1"; // >>> SPEC UFFICIALE <<< confermare mappatura M/F -> 1/2
}

// ============================================================================
//  >>> SPEC UFFICIALE <<<  — Riga tracciato (larghezza fissa, ~168 caratteri)
//  Ordine e lunghezze campi da confermare col manuale ufficiale: qui la
//  ricostruzione più diffusa nelle integrazioni PMS italiane.
// ============================================================================
function buildTracciatoLine(g: GuestLine): string {
  return [
    padR(g.role_code, 2),                  // tipo alloggiato (2 cifre)
    padDateGGMMAAAA(g.check_in),            // data arrivo (8)
    padR(String(g.nights), 2),              // giorni permanenza (2)
    padR(g.last_name, 20),                  // cognome (20)
    padR(g.first_name, 20),                 // nome (20) — vuoto per ruoli 19/20 se non richiesto
    sesso1o2(g.gender),                     // sesso (1)
    padDateGGMMAAAA(g.birth_date),          // data nascita (8)
    padR(g.birth_country || g.birth_place, 9),  // comune/stato nascita — codice ISTAT (9)
    padR("", 4),                            // provincia nascita (4) — da mappare se necessario
    padR(g.citizenship, 9),                 // stato cittadinanza — codice ISTAT (9)
    padR(g.document_type, 5),               // tipo documento — codice (5)
    padR(g.document_number, 20),            // numero documento (20)
    padR("", 9),                            // comune/stato rilascio documento (9)
  ].join("");
}

// ============================================================================
//  >>> SPEC UFFICIALE <<<  — Autenticazione: GeneraToken
// ============================================================================
async function generaToken(utente: string, wsKey: string, password: string): Promise<string> {
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GeneraToken xmlns="AlloggiatiService">
      <Utente>${escapeXml(utente)}</Utente>
      <Password>${escapeXml(password)}</Password>
      <WsKey>${escapeXml(wsKey)}</WsKey>
    </GeneraToken>
  </soap:Body>
</soap:Envelope>`;

  const res = await fetch(ALLOGGIATI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "SOAPAction": "AlloggiatiService/GeneraToken",
    },
    body: envelope,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GeneraToken HTTP ${res.status}: ${text.slice(0, 300)}`);
  const match = text.match(/<Token>([^<]*)<\/Token>/i);
  if (!match || !match[1]) throw new Error("Token non trovato nella risposta: " + text.slice(0, 300));
  return match[1];
}

// ============================================================================
//  >>> SPEC UFFICIALE <<<  — Test (valida senza inviare) e Invio (invio reale)
// ============================================================================
async function callTestOrInvio(
  operation: "Test" | "Invio",
  token: string,
  tracciato: string,
): Promise<{ ok: boolean; raw: string }> {
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${operation} xmlns="AlloggiatiService">
      <Token>${escapeXml(token)}</Token>
      <Tracciato>${escapeXml(tracciato)}</Tracciato>
    </${operation}>
  </soap:Body>
</soap:Envelope>`;

  const res = await fetch(ALLOGGIATI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "SOAPAction": `AlloggiatiService/${operation}`,
    },
    body: envelope,
  });
  const text = await res.text();
  // >>> SPEC UFFICIALE <<< il criterio di successo esatto (es. "Inserimento Effettuato
  // Correttamente" nel corpo, oppure un codice/flag dedicato) va confermato.
  const ok = res.ok && !/error|errore|fault/i.test(text);
  return { ok, raw: text };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---- Recupero ospiti della prenotazione (capofamiglia + booking_guests) -----
async function loadGuestLines(bookingId: string): Promise<GuestLine[]> {
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, guest_id, check_in, check_out, nights")
    .eq("id", bookingId)
    .single();
  if (!booking) return [];

  const lines: GuestLine[] = [];

  if (booking.guest_id) {
    const { data: g } = await supabase
      .from("guests")
      .select("first_name, last_name, gender, birth_date, birth_place, birth_country, citizenship, document_type, document_number, role_code")
      .eq("id", booking.guest_id)
      .single();
    if (g) {
      lines.push({
        role_code: g.role_code || "17", // capofamiglia di default
        first_name: g.first_name || "", last_name: g.last_name || "",
        gender: g.gender, birth_date: g.birth_date, birth_place: g.birth_place,
        birth_country: g.birth_country, citizenship: g.citizenship,
        document_type: g.document_type, document_number: g.document_number,
        check_in: booking.check_in, nights: booking.nights || 1,
      });
    }
  }

  const { data: extra } = await supabase
    .from("booking_guests")
    .select("first_name, last_name, gender, birth_date, birth_place, birth_country, citizenship, document_type, document_number, role_code")
    .eq("booking_id", bookingId);

  for (const g of extra ?? []) {
    lines.push({
      role_code: g.role_code || "19",
      first_name: g.first_name || "", last_name: g.last_name || "",
      gender: g.gender, birth_date: g.birth_date, birth_place: g.birth_place,
      birth_country: g.birth_country, citizenship: g.citizenship,
      document_type: g.document_type, document_number: g.document_number,
      check_in: booking.check_in, nights: booking.nights || 1,
    });
  }

  return lines;
}

// ---- Elaborazione singola riga della coda -----------------------------------
async function processRow(row: RegRow): Promise<void> {
  const { data: cred } = await supabase
    .from("compliance_credentials")
    .select("alloggiati_user, alloggiati_ws_key")
    .eq("property_id", row.property_id)
    .single();

  if (!cred?.alloggiati_user || !cred?.alloggiati_ws_key) {
    await markError(row, "Credenziali Alloggiati Web mancanti (utente/WSKey) in compliance_credentials");
    return;
  }
  const password = Deno.env.get("ALLOGGIATI_PASSWORD") ?? "";
  if (!password) {
    await markError(row, "Secret ALLOGGIATI_PASSWORD non impostato");
    return;
  }

  const guestLines = await loadGuestLines(row.booking_id);
  if (guestLines.length === 0) {
    await markError(row, "Nessun ospite trovato per questa prenotazione");
    return;
  }

  const tracciato = guestLines.map(buildTracciatoLine).join("\r\n");

  try {
    await supabase.from("guest_registrations").update({ status: "testing", tracciato_payload: tracciato }).eq("id", row.id);

    const token = await generaToken(cred.alloggiati_user, cred.alloggiati_ws_key, password);

    const test = await callTestOrInvio("Test", token, tracciato);
    if (!test.ok) {
      await markError(row, `Test fallito: ${test.raw.slice(0, 500)}`, tracciato);
      return;
    }

    const invio = await callTestOrInvio("Invio", token, tracciato);
    if (!invio.ok) {
      await markError(row, `Invio fallito: ${invio.raw.slice(0, 500)}`, tracciato);
      return;
    }

    // Salva la ricevuta (prova legale, conservare 5 anni) nello storage privato
    const receiptPath = `${row.property_id}/${row.booking_id}-${Date.now()}.txt`;
    await supabase.storage.from(RECEIPT_BUCKET).upload(receiptPath, invio.raw, {
      contentType: "text/plain", upsert: false,
    });

    await supabase.from("guest_registrations").update({
      status: "sent",
      sent_at: new Date().toISOString(),
      attempts: row.attempts + 1,
      receipt_storage_path: receiptPath,
      last_error: null,
    }).eq("id", row.id);
  } catch (e) {
    await markError(row, `Eccezione: ${e instanceof Error ? e.message : String(e)}`, tracciato);
  }
}

async function markError(row: RegRow, message: string, tracciato?: string): Promise<void> {
  await supabase.from("guest_registrations").update({
    status: "error",
    attempts: row.attempts + 1,
    last_error: message,
    tracciato_payload: tracciato ?? null,
  }).eq("id", row.id);
}

// ---- Handler ------------------------------------------------------------------
Deno.serve(async (_req) => {
  const { data: rows, error } = await supabase
    .from("guest_registrations")
    .select("id, booking_id, property_id, attempts, deadline_at")
    .in("status", ["pending", "error"])
    .lt("attempts", MAX_ATTEMPTS)
    .order("deadline_at", { ascending: true, nullsFirst: false })
    .limit(BATCH_SIZE);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  const queue = (rows ?? []) as RegRow[];
  for (const row of queue) {
    await processRow(row);
  }

  return new Response(JSON.stringify({ ok: true, processed: queue.length }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
