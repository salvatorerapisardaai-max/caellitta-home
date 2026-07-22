import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Usa le stesse variabili d'ambiente del resto dell'app (Vite)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Palette Caellitta
const COLORS = {
  teal: '#14424f',
  amber: '#e7b682',
  cream: '#f6efe2',
};

const STATUS_STYLE = {
  pending: { bg: '#e5e7eb', fg: '#374151', label: 'In coda' },
  testing: { bg: '#fef3c7', fg: '#92400e', label: 'In verifica' },
  sent:    { bg: '#d1fae5', fg: '#065f46', label: 'Inviato' },
  error:   { bg: '#fee2e2', fg: '#991b1b', label: 'Errore' },
};

function Badge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span style={{
      background: s.bg, color: s.fg, padding: '2px 10px', borderRadius: 999,
      fontSize: 12, fontWeight: 600, fontFamily: 'Jost, sans-serif', whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

export default function Adempimenti() {
  const [propertyId, setPropertyId] = useState(null);
  const [cred, setCred] = useState({
    istat_struttura_code: '', istat_pms_user: '',
    alloggiati_user: '', alloggiati_ws_key: '',
  });
  const [istatRows, setIstatRows] = useState([]);
  const [allogRows, setAllogRows] = useState([]);
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);

    const { data: prop } = await supabase
      .from('properties').select('id').order('created_at').limit(1).single();
    if (!prop) { setLoading(false); return; }
    setPropertyId(prop.id);

    const { data: c } = await supabase
      .from('compliance_credentials').select('*')
      .eq('property_id', prop.id).single();
    if (c) setCred(c);

    const { data: istat } = await supabase
      .from('istat_submissions')
      .select('id, submission_date, movement_type, status, attempts, last_error')
      .eq('property_id', prop.id)
      .order('submission_date', { ascending: false })
      .limit(100);
    setIstatRows(istat || []);

    const { data: allog } = await supabase
      .from('guest_registrations')
      .select('id, status, attempts, last_error, deadline_at, sent_at, receipt_storage_path, booking_id, bookings(guest_name, check_in)')
      .eq('property_id', prop.id)
      .order('deadline_at', { ascending: true })
      .limit(100);
    setAllogRows(allog || []);

    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function saveCredentials(e) {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');
    const { error } = await supabase
      .from('compliance_credentials')
      .upsert({ property_id: propertyId, ...cred }, { onConflict: 'property_id' });
    setSaving(false);
    setSavedMsg(error ? `Errore: ${error.message}` : 'Salvato correttamente.');
  }

  function isDeadlineClose(deadline_at, status) {
    if (!deadline_at || status === 'sent') return false;
    const hoursLeft = (new Date(deadline_at) - new Date()) / 3_600_000;
    return hoursLeft < 6;
  }

  const filteredIstat = filter === 'all' ? istatRows : istatRows.filter(r => r.status === filter);

  if (loading) {
    return <div style={{ padding: 40, fontFamily: 'Jost, sans-serif', color: COLORS.teal }}>Caricamento…</div>;
  }

  return (
    <div style={{
      padding: '24px 16px', maxWidth: 960, margin: '0 auto',
      fontFamily: 'Jost, sans-serif', color: COLORS.teal,
    }}>
      <h1 style={{
        fontFamily: '"Cormorant Garamond", serif', fontSize: 32, fontWeight: 600,
        marginBottom: 4, color: COLORS.teal,
      }}>
        Adempimenti
      </h1>
      <p style={{ color: '#6b7280', marginBottom: 32, fontSize: 14 }}>
        Alloggiati Web (Polizia di Stato) e Osservatorio Turistico Sicilia (ISTAT).
      </p>

      {/* ================= CREDENZIALI ================= */}
      <section style={{
        background: COLORS.cream, borderRadius: 16, padding: 24, marginBottom: 32,
        border: `1px solid ${COLORS.amber}44`,
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Credenziali struttura</h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          Le password NON si inseriscono qui: sono gestite come secret lato server per sicurezza.
        </p>
        <form onSubmit={saveCredentials} style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        }}>
          <Field label="Codice struttura ISTAT (Turist@t)" value={cred.istat_struttura_code}
            onChange={v => setCred({ ...cred, istat_struttura_code: v })} />
          <Field label="Utente PMS ISTAT" value={cred.istat_pms_user}
            onChange={v => setCred({ ...cred, istat_pms_user: v })} />
          <Field label="Utente Alloggiati Web" value={cred.alloggiati_user}
            onChange={v => setCred({ ...cred, alloggiati_user: v })} />
          <Field label="WSKey Alloggiati Web" value={cred.alloggiati_ws_key}
            onChange={v => setCred({ ...cred, alloggiati_ws_key: v })} />
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="submit" disabled={saving} style={{
              background: COLORS.teal, color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Jost, sans-serif',
            }}>
              {saving ? 'Salvataggio…' : 'Salva credenziali'}
            </button>
            {savedMsg && <span style={{ fontSize: 13 }}>{savedMsg}</span>}
          </div>
        </form>
      </section>

      {/* ================= CODA ISTAT ================= */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Coda ISTAT Sicilia</h2>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{
            border: `1px solid ${COLORS.teal}33`, borderRadius: 8, padding: '6px 10px', fontFamily: 'Jost, sans-serif',
          }}>
            <option value="all">Tutti</option>
            <option value="pending">In coda</option>
            <option value="sent">Inviati</option>
            <option value="error">Errori</option>
          </select>
        </div>
        <Table
          rows={filteredIstat}
          empty="Nessuna trasmissione ISTAT in coda. Si popola automaticamente confermando una prenotazione."
          columns={[
            { label: 'Data', render: r => r.submission_date },
            { label: 'Movimento', render: r => r.movement_type === 'arrival' ? 'Arrivo' : r.movement_type === 'departure' ? 'Partenza' : 'Presenza' },
            { label: 'Stato', render: r => <Badge status={r.status} /> },
            { label: 'Tentativi', render: r => r.attempts },
            { label: 'Ultimo errore', render: r => r.last_error ? <span style={{ fontSize: 12, color: '#991b1b' }}>{r.last_error.slice(0, 80)}</span> : '—' },
          ]}
        />
      </section>

      {/* ================= CODA ALLOGGIATI WEB ================= */}
      <section>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Coda Alloggiati Web</h2>
        <Table
          rows={allogRows}
          empty="Nessuna trasmissione Alloggiati Web in coda."
          columns={[
            { label: 'Prenotazione', render: r => r.bookings?.guest_name || '—' },
            { label: 'Check-in', render: r => r.bookings?.check_in || '—' },
            { label: 'Stato', render: r => <Badge status={r.status} /> },
            {
              label: 'Scadenza', render: r => (
                <span style={{ color: isDeadlineClose(r.deadline_at, r.status) ? '#dc2626' : 'inherit', fontWeight: isDeadlineClose(r.deadline_at, r.status) ? 700 : 400 }}>
                  {r.deadline_at ? new Date(r.deadline_at).toLocaleString('it-IT') : '—'}
                </span>
              )
            },
            { label: 'Tentativi', render: r => r.attempts },
            {
              label: 'Ricevuta', render: r => r.receipt_storage_path
                ? <a href={r.receipt_storage_path} target="_blank" rel="noreferrer" style={{ color: COLORS.teal, fontWeight: 600 }}>Scarica PDF</a>
                : '—'
            },
          ]}
        />
      </section>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
      {label}
      <input
        type="text" value={value || ''} onChange={e => onChange(e.target.value)}
        style={{
          border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 10px',
          fontFamily: 'Jost, sans-serif', fontSize: 14,
        }}
      />
    </label>
  );
}

function Table({ rows, columns, empty }) {
  if (!rows.length) {
    return (
      <div style={{
        padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 14,
        background: '#fafafa', borderRadius: 12, border: '1px dashed #e5e7eb',
      }}>
        {empty}
      </div>
    );
  }
  return (
    <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e5e7eb' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
            {columns.map((c, i) => (
              <th key={i} style={{ padding: '10px 12px', fontWeight: 600, color: '#6b7280' }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i} style={{ borderTop: '1px solid #f3f4f6' }}>
              {columns.map((c, j) => (
                <td key={j} style={{ padding: '10px 12px' }}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
