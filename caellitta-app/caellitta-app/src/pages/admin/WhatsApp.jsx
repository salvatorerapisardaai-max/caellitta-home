import React, { useState } from 'react'

const TEMPLATES = {
  it: [
    {
      phase: 'Pre-arrivo',
      timing: '-7 giorni',
      name: 'Countdown benvenuto',
      text: (v) => `Ciao ${v.name || '[Nome]'} 🌊

Mancano solo 7 giorni al tuo soggiorno a Caellitta Home!

📅 *Check-in:* ${v.cin || '[Data]'} dalle 15:00
📅 *Check-out:* ${v.cout || '[Data]'} entro le 10:30
👥 *Ospiti:* ${v.guests || '[N]'} · 🌙 *Notti:* ${v.nights || '[N]'}

Nel frattempo, puoi già sfogliare il tuo _Welcome Book_ personale — troverai tutte le info sulla casa, i coupon riservati a te e i nostri posti preferiti del territorio:
👉 ${v.wb || '[link welcome book]'}

Hai domande? Scrivici qui, siamo a disposizione 🤍

_Caellitta Home_`,
    },
    {
      phase: 'Pre-arrivo',
      timing: '-1 giorno',
      name: 'Istruzioni arrivo',
      text: (v) => `Ciao ${v.name || '[Nome]'}!

Domani ti aspettiamo a Caellitta Home 🏡

Ecco tutto quello che ti serve:

🔑 *Accesso casa:*
Il codice cassettina è *[CODICE]*. La trovi a sinistra del portone principale.

🚗 *Parcheggio:*
Puoi lasciare l'auto in Via [__], parcheggio gratuito.

📍 *Indirizzo esatto:*
[Indirizzo], [Città]

Se arrivi fuori orario o hai bisogno di noi, scrivi subito — siamo rapidi!

A domani! 🌅
_Caellitta Home_`,
    },
    {
      phase: 'Arrivo',
      timing: 'Check-in',
      name: 'Benvenuto + coupon',
      text: (v) => `Benvenuto/a a Caellitta Home, ${v.name || '[Nome]'}! 🎉

Speriamo che tutto sia di tuo gradimento. Sei nel posto giusto 🌊

🎁 *I tuoi coupon personali:*
Abbiamo preparato una selezione di sconti esclusivi presso i nostri partner — dal ristorante ai giri in barca.

Accedi con il tuo codice prenotazione:
👉 ${v.wb || '[link]'}/ospite
🔐 Codice: *${v.code || '[CAELLITTA-XXXX]'}*

Per qualsiasi cosa, scrivici qui su WhatsApp — siamo sempre disponibili!

Buona vacanza 🤍
_Caellitta Home_`,
    },
    {
      phase: 'Durante',
      timing: 'Mid-stay',
      name: 'Check intermedio',
      text: (v) => `Ciao ${v.name || '[Nome]'}, come stai trovando Caellitta Home?

Siamo a metà del tuo soggiorno e volevamo assicurarci che tutto sia perfetto ✨

C'è qualcosa che possiamo fare per rendere la tua esperienza ancora migliore?

Ricorda che hai ancora i tuoi coupon da utilizzare — non sprecarli! 🎁

_Caellitta Home_`,
    },
    {
      phase: 'Partenza',
      timing: 'Check-out',
      name: 'Saluti + recensione',
      text: (v) => `Ciao ${v.name || '[Nome]'},

È stato un piacere ospitarti! Speriamo che il soggiorno a Caellitta Home sia stato all'altezza delle aspettative 🌊

📋 *Checklist partenza:*
• Lascia le chiavi in cassettina
• Chiudi tutte le finestre
• Check-out entro le 10:30

Se hai un momento, una recensione su [piattaforma] ci aiuterebbe moltissimo — per noi ogni feedback è prezioso 🙏

Speriamo di rivederti presto! 
_Caellitta Home_ 🤍`,
    },
  ],
  en: [
    {
      phase: 'Pre-arrival',
      timing: '-7 days',
      name: 'Welcome countdown',
      text: (v) => `Hi ${v.name || '[Name]'} 🌊

Only 7 days until your stay at Caellitta Home!

📅 *Check-in:* ${v.cin || '[Date]'} from 3:00 PM
📅 *Check-out:* ${v.cout || '[Date]'} by 10:30 AM
👥 *Guests:* ${v.guests || '[N]'} · 🌙 *Nights:* ${v.nights || '[N]'}

In the meantime, you can already browse your personal _Welcome Book_ — you'll find all the info about the house, your exclusive coupons and our favourite local spots:
👉 ${v.wb || '[welcome book link]'}

Any questions? Write us here, we're happy to help 🤍

_Caellitta Home_`,
    },
    {
      phase: 'Arrival',
      timing: 'Check-in',
      name: 'Welcome + coupons',
      text: (v) => `Welcome to Caellitta Home, ${v.name || '[Name]'}! 🎉

We hope you love everything. You're in the right place 🌊

🎁 *Your personal coupons:*
We've prepared exclusive discounts at our local partners — from restaurants to boat tours.

Access with your booking code:
👉 ${v.wb || '[link]'}/ospite
🔐 Code: *${v.code || '[CAELLITTA-XXXX]'}*

For anything at all, message us here on WhatsApp — we're always available!

Enjoy your holiday 🤍
_Caellitta Home_`,
    },
  ],
}

export default function WhatsApp() {
  const [lang, setLang]     = useState('it')
  const [active, setActive] = useState(0)
  const [copied, setCopied] = useState(false)
  const [vars, setVars]     = useState({ name: '', cin: '', cout: '', nights: '', guests: '', code: '', wb: '' })

  const tpls = TEMPLATES[lang]
  const current = tpls[active] || tpls[0]
  const rendered = current.text(vars)

  function formatWhatsapp(text) {
    return text
      .replace(/\*(.*?)\*/g, '<b>$1</b>')
      .replace(/_(.*?)_/g, '<i>$1</i>')
      .replace(/\n/g, '<br/>')
  }

  function copy() {
    navigator.clipboard.writeText(rendered)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', height: 'calc(100vh - 120px)', gap: 0, margin: '-2rem', overflow: 'hidden' }}>

      {/* LEFT PANEL */}
      <div style={{ background: 'var(--lava-mid)', borderRight: '1px solid var(--gold-dim)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Variabili */}
        <div style={{ padding: '1.2rem 1.4rem', borderBottom: '1px solid var(--gold-dim)', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: '0.58rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.9rem' }}>Variabili ospite</div>
          {[
            { key: 'name',   label: 'Nome ospite',        ph: 'Marco' },
            { key: 'code',   label: 'Codice prenotazione', ph: 'CAELLITTA-2025-001' },
            { key: 'wb',     label: 'Link Welcome Book',   ph: 'caellitta.vercel.app' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: '0.6rem' }}>
              <label style={{ display: 'block', fontSize: '0.56rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--salt-faint)', marginBottom: '0.3rem' }}>{f.label}</label>
              <input
                style={{ width: '100%', background: 'var(--lava-card)', border: '1px solid rgba(201,171,114,.16)', padding: '0.52rem 0.75rem', fontFamily: 'Jost,sans-serif', fontSize: '0.72rem', color: 'var(--salt)', outline: 'none' }}
                placeholder={f.ph}
                value={vars[f.key]}
                onChange={e => setVars(p => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {[
              { key: 'cin',    label: 'Check-in',   ph: '5 Giu' },
              { key: 'cout',   label: 'Check-out',  ph: '12 Giu' },
              { key: 'nights', label: 'Notti',      ph: '7' },
              { key: 'guests', label: 'N° ospiti',  ph: '2' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: '0.56rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--salt-faint)', marginBottom: '0.3rem' }}>{f.label}</label>
                <input
                  style={{ width: '100%', background: 'var(--lava-card)', border: '1px solid rgba(201,171,114,.16)', padding: '0.52rem 0.75rem', fontFamily: 'Jost,sans-serif', fontSize: '0.72rem', color: 'var(--salt)', outline: 'none' }}
                  placeholder={f.ph}
                  value={vars[f.key]}
                  onChange={e => setVars(p => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Template list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Lang toggle */}
          <div style={{ display: 'flex', padding: '0.8rem 1.4rem', gap: '0.5rem', borderBottom: '1px solid var(--gold-dim)' }}>
            {['it','en'].map(l => (
              <button key={l} onClick={() => { setLang(l); setActive(0) }}
                style={{ background: lang===l ? 'var(--gold-dim)' : 'transparent', border: '1px solid var(--gold-dim)', color: lang===l ? 'var(--gold)' : 'var(--salt-faint)', padding: '0.3rem 0.8rem', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Jost,sans-serif' }}>
                {l === 'it' ? '🇮🇹 IT' : '🇬🇧 EN'}
              </button>
            ))}
          </div>

          {tpls.map((t, i) => (
            <div key={i} onClick={() => setActive(i)} style={{
              padding: '0.75rem 1.4rem', cursor: 'pointer',
              borderLeft: active === i ? '2px solid var(--gold)' : '2px solid transparent',
              background: active === i ? 'rgba(201,171,114,.08)' : 'transparent',
              transition: 'all .2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.56rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#25D366', background: 'rgba(37,211,102,0.1)', padding: '0.18rem 0.45rem', whiteSpace: 'nowrap' }}>
                  {t.timing}
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: 300, color: active === i ? 'var(--gold)' : 'var(--salt-dim)' }}>{t.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--gold-dim)', flexShrink: 0 }}>
          <div style={{ fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#25D366', marginBottom: '0.3rem' }}>{current.phase}</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', fontWeight: 300 }}>{current.name}</div>
        </div>

        <div style={{ flex: 1, padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* WA Preview */}
          <div style={{ background: '#0a0f0a', border: '1px solid rgba(37,211,102,.12)', maxWidth: 480, overflow: 'hidden' }}>
            <div style={{ background: '#1f2c1f', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(37,211,102,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>🏠</div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(240,235,225,.7)' }}>Caellitta Home</div>
                <div style={{ fontSize: '0.58rem', color: 'rgba(37,211,102,.6)' }}>in linea</div>
              </div>
            </div>
            <div style={{ background: '#0d1a0d', padding: '1rem' }}>
              <div style={{ background: '#1a2e1a', borderRadius: '0 8px 8px 8px', padding: '0.8rem 1rem', maxWidth: '90%', position: 'relative' }}>
                <div style={{ fontSize: '0.78rem', color: 'rgba(240,235,225,.85)', lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  dangerouslySetInnerHTML={{ __html: formatWhatsapp(rendered) }}
                />
                <div style={{ fontSize: '0.55rem', color: 'rgba(37,211,102,.45)', textAlign: 'right', marginTop: '0.4rem' }}>
                  {new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} ✓✓
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button onClick={copy} style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              background: copied ? '#4a8a68' : '#25D366',
              color: copied ? 'var(--salt)' : '#0a0f0a', border: 'none',
              padding: '0.7rem 1.4rem', fontFamily: 'Jost,sans-serif',
              fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase',
              fontWeight: 500, cursor: 'pointer', transition: 'all .22s',
            }}>
              {copied ? '✓ Copiato!' : '⎘ Copia testo WhatsApp'}
            </button>
          </div>

          {/* Raw text */}
          <div style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '1.2rem' }}>
            <div style={{ fontSize: '0.56rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--salt-faint)', marginBottom: '0.8rem' }}>Testo raw</div>
            <pre style={{ fontSize: '0.76rem', color: 'var(--salt-dim)', lineHeight: 1.85, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit' }}>
              {rendered}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
