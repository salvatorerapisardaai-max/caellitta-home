import React, { useState } from 'react'

const TEMPLATES = {
  it: [
    {
      phase: 'Pre-arrivo', timing: '-7 giorni', name: 'Countdown benvenuto',
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
      phase: 'Pre-arrivo', timing: '-1 giorno', name: 'Istruzioni arrivo',
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
      phase: 'Arrivo', timing: 'Check-in', name: 'Benvenuto + coupon',
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
      phase: 'Durante', timing: 'Mid-stay', name: 'Check intermedio',
      text: (v) => `Ciao ${v.name || '[Nome]'}, come stai trovando Caellitta Home?

Siamo a metà del tuo soggiorno e volevamo assicurarci che tutto sia perfetto ✨

C'è qualcosa che possiamo fare per rendere la tua esperienza ancora migliore?

Ricorda che hai ancora i tuoi coupon da utilizzare — non sprecarli! 🎁

_Caellitta Home_`,
    },
    {
      phase: 'Partenza', timing: 'Check-out', name: 'Saluti + recensione',
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
      phase: 'Pre-arrival', timing: '-7 days', name: 'Welcome countdown',
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
      phase: 'Arrival', timing: 'Check-in', name: 'Welcome + coupons',
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

const VARS_FIELDS = [
  { key: 'name',   label: 'Nome ospite',         ph: 'Marco',              full: true },
  { key: 'code',   label: 'Codice prenotazione',  ph: 'CAELLITTA-2025-001', full: true },
  { key: 'wb',     label: 'Link sito',            ph: 'caellitta-home.vercel.app', full: true },
  { key: 'cin',    label: 'Check-in',             ph: '5 Giu' },
  { key: 'cout',   label: 'Check-out',            ph: '12 Giu' },
  { key: 'nights', label: 'Notti',                ph: '7' },
  { key: 'guests', label: 'N° ospiti',            ph: '2' },
]

export default function WhatsApp() {
  const [lang, setLang]       = useState('it')
  const [active, setActive]   = useState(0)
  const [copied, setCopied]   = useState(false)
  const [vars, setVars]       = useState({ name:'', cin:'', cout:'', nights:'', guests:'', code:'', wb:'' })
  const [mobileTab, setMobileTab] = useState('vars') // 'vars' | 'templates' | 'preview'

  const tpls   = TEMPLATES[lang]
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

  const VarsPanel = () => (
    <div style={{ padding: '1.2rem 1.4rem' }}>
      <div style={{ fontSize: '0.58rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '1rem' }}>Variabili ospite</div>
      {VARS_FIELDS.filter(f => f.full).map(f => (
        <div key={f.key} style={{ marginBottom: '0.7rem' }}>
          <label style={{ display: 'block', fontSize: '0.56rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--salt-faint)', marginBottom: '0.3rem' }}>{f.label}</label>
          <input
            className="form-input"
            style={{ fontSize: '0.8rem' }}
            placeholder={f.ph}
            value={vars[f.key]}
            onChange={e => setVars(p => ({ ...p, [f.key]: e.target.value }))}
          />
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
        {VARS_FIELDS.filter(f => !f.full).map(f => (
          <div key={f.key}>
            <label style={{ display: 'block', fontSize: '0.56rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--salt-faint)', marginBottom: '0.3rem' }}>{f.label}</label>
            <input
              className="form-input"
              style={{ fontSize: '0.8rem' }}
              placeholder={f.ph}
              value={vars[f.key]}
              onChange={e => setVars(p => ({ ...p, [f.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
    </div>
  )

  const TemplatesPanel = () => (
    <div>
      <div style={{ display: 'flex', padding: '0.8rem 1.4rem', gap: '0.5rem', borderBottom: '1px solid var(--gold-dim)' }}>
        {['it','en'].map(l => (
          <button key={l} onClick={() => { setLang(l); setActive(0) }}
            style={{ background: lang===l ? 'var(--gold-dim)' : 'transparent', border: '1px solid var(--gold-dim)', color: lang===l ? 'var(--gold)' : 'var(--salt-faint)', padding: '0.3rem 0.8rem', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Jost,sans-serif' }}>
            {l === 'it' ? '🇮🇹 IT' : '🇬🇧 EN'}
          </button>
        ))}
      </div>
      {tpls.map((t, i) => (
        <div key={i} onClick={() => { setActive(i); setMobileTab('preview') }} style={{
          padding: '0.9rem 1.4rem', cursor: 'pointer',
          borderLeft: active===i ? '2px solid var(--gold)' : '2px solid transparent',
          background: active===i ? 'rgba(201,171,114,.08)' : 'transparent',
          borderBottom: '1px solid var(--gold-dim)',
          transition: 'all .2s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.56rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#25D366', background: 'rgba(37,211,102,0.1)', padding: '0.18rem 0.45rem', whiteSpace: 'nowrap' }}>
              {t.timing}
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 300, color: active===i ? 'var(--gold)' : 'var(--salt-dim)' }}>{t.name}</span>
          </div>
        </div>
      ))}
    </div>
  )

  const PreviewPanel = () => (
    <div style={{ padding: '1.2rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      <div>
        <div style={{ fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#25D366', marginBottom: '0.3rem' }}>{current.phase}</div>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', fontWeight: 300 }}>{current.name}</div>
      </div>

      {/* WA Preview */}
      <div style={{ background: '#0a0f0a', border: '1px solid rgba(37,211,102,.12)', overflow: 'hidden' }}>
        <div style={{ background: '#1f2c1f', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(37,211,102,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>🏠</div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(240,235,225,.7)' }}>Caellitta Home</div>
            <div style={{ fontSize: '0.55rem', color: 'rgba(37,211,102,.6)' }}>in linea</div>
          </div>
        </div>
        <div style={{ background: '#0d1a0d', padding: '0.8rem' }}>
          <div style={{ background: '#1a2e1a', borderRadius: '0 8px 8px 8px', padding: '0.8rem 1rem' }}>
            <div style={{ fontSize: '0.76rem', color: 'rgba(240,235,225,.85)', lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              dangerouslySetInnerHTML={{ __html: formatWhatsapp(rendered) }}
            />
            <div style={{ fontSize: '0.52rem', color: 'rgba(37,211,102,.45)', textAlign: 'right', marginTop: '0.4rem' }}>
              {new Date().toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' })} ✓✓
            </div>
          </div>
        </div>
      </div>

      <button onClick={copy} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
        background: copied ? '#4a8a68' : '#25D366',
        color: copied ? 'var(--salt)' : '#0a0f0a', border: 'none',
        padding: '0.85rem', fontFamily: 'Jost,sans-serif',
        fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase',
        fontWeight: 500, cursor: 'pointer', transition: 'all .22s', width: '100%',
      }}>
        {copied ? '✓ Copiato!' : '⎘ Copia testo WhatsApp'}
      </button>
    </div>
  )

  return (
    <>
      <style>{`
        .wa-desktop { display: grid; grid-template-columns: 300px 1fr; height: calc(100vh - 120px); gap: 0; margin: -2rem; overflow: hidden; }
        .wa-left { background: var(--lava-mid); border-right: 1px solid var(--gold-dim); display: flex; flex-direction: column; overflow: hidden; }
        .wa-left-top { overflow-y: auto; flex-shrink: 0; border-bottom: 1px solid var(--gold-dim); }
        .wa-left-bottom { flex: 1; overflow-y: auto; }
        .wa-right { overflow-y: auto; display: flex; flex-direction: column; }
        .wa-right-header { padding: 1.5rem 2rem; border-bottom: 1px solid var(--gold-dim); flex-shrink: 0; }
        .wa-right-body { flex: 1; padding: 1.5rem 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
        .wa-mobile { display: none; }
        .wa-mobile-tabs { display: flex; border-bottom: 1px solid var(--gold-dim); }
        .wa-mobile-tab { flex: 1; padding: 0.75rem; text-align: center; font-size: 0.62rem; letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer; border: none; background: transparent; font-family: Jost,sans-serif; transition: all .2s; }

        @media (max-width: 768px) {
          .wa-desktop { display: none !important; }
          .wa-mobile { display: flex; flex-direction: column; margin: -1rem; }
        }
      `}</style>

      {/* DESKTOP */}
      <div className="wa-desktop">
        <div className="wa-left">
          <div className="wa-left-top"><VarsPanel /></div>
          <div className="wa-left-bottom"><TemplatesPanel /></div>
        </div>
        <div className="wa-right">
          <div className="wa-right-header">
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#25D366', marginBottom: '0.3rem' }}>{current.phase}</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', fontWeight: 300 }}>{current.name}</div>
          </div>
          <div className="wa-right-body">
            <div style={{ background: '#0a0f0a', border: '1px solid rgba(37,211,102,.12)', maxWidth: 480, overflow: 'hidden' }}>
              <div style={{ background: '#1f2c1f', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(37,211,102,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>🏠</div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(240,235,225,.7)' }}>Caellitta Home</div>
                  <div style={{ fontSize: '0.58rem', color: 'rgba(37,211,102,.6)' }}>in linea</div>
                </div>
              </div>
              <div style={{ background: '#0d1a0d', padding: '1rem' }}>
                <div style={{ background: '#1a2e1a', borderRadius: '0 8px 8px 8px', padding: '0.8rem 1rem' }}>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(240,235,225,.85)', lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    dangerouslySetInnerHTML={{ __html: formatWhatsapp(rendered) }} />
                  <div style={{ fontSize: '0.55rem', color: 'rgba(37,211,102,.45)', textAlign: 'right', marginTop: '0.4rem' }}>
                    {new Date().toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' })} ✓✓
                  </div>
                </div>
              </div>
            </div>
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
        </div>
      </div>

      {/* MOBILE: 3 tab */}
      <div className="wa-mobile">
        <div className="wa-mobile-tabs">
          {[['vars','Variabili'],['templates','Template'],['preview','Anteprima']].map(([id,label]) => (
            <button key={id} className="wa-mobile-tab" onClick={() => setMobileTab(id)}
              style={{ color: mobileTab===id ? 'var(--gold)' : 'var(--salt-faint)', borderBottom: mobileTab===id ? '2px solid var(--gold)' : '2px solid transparent' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {mobileTab === 'vars'      && <VarsPanel />}
          {mobileTab === 'templates' && <TemplatesPanel />}
          {mobileTab === 'preview'   && <PreviewPanel />}
        </div>
      </div>
    </>
  )
}
