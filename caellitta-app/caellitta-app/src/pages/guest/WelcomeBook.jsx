import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sb } from '../../lib/supabase'
import heroFallback from '../../assets/acicastello.jpg'

// Immagine del Benvenuto servita da Supabase Storage (bucket pubblico "site-media").
// Se l'host ha caricato una foto dal Portale Ospiti (guest_portal_content.hero_image_url)
// quella ha priorità; altrimenti si usa la convenzione fissa "benvenuto.jpg", poi il fallback locale.
const HERO_URL_DEFAULT = 'https://ejjatrfeeatgiqpomibd.supabase.co/storage/v1/object/public/site-media/benvenuto.jpg'

// Numero WhatsApp principale di Caellitta Home (solo cifre, per i link wa.me)
const CAELLITTA_WA = '393520124403'

// Tema del Welcome Book: indipendente dal tema (chiaro) del gestionale.
// Applicato come override locale delle CSS custom properties sul contenitore
// radice — così il gestionale può essere chiaro mentre il Welcome Book resta
// nella sua estetica calda "notte mediterranea", senza conflitti.
const WB_THEME = {
  '--lava': '#111009', '--lava-mid': '#1c1710', '--lava-card': '#221d14', '--lava-hover': '#2a2418',
  '--gold': '#c9ab72', '--gold-light': '#e8d0a0', '--gold-dim': 'rgba(201,171,114,0.12)', '--gold-dim2': 'rgba(201,171,114,0.22)',
  '--salt': '#f0ebe1', '--salt-dim': 'rgba(240,235,225,0.58)', '--salt-faint': 'rgba(240,235,225,0.26)',
  '--green': '#4a8a68', '--green-dim': 'rgba(74,138,104,0.15)',
  '--red': '#8a4848', '--red-dim': 'rgba(138,72,72,0.15)',
}
const WIFI_SSID_DEFAULT = 'VodafoneCaellita Home'
const WIFI_PASSWORD_DEFAULT = 'rJT9HdAP2F4Asp96'

// Icone per categoria (coupon_categories.name)
const CAT_ICONS = {
  'Barca & Mare':     '⛵',
  'Etna & Avventura': '🌋',
  'Dal Cielo':        '🚁',
  'Sapori & Cantine': '🍷',
  'Ristoranti':       '🍽️',
  'Bar & Aperitivo':  '🍹',
  'Servizi':          '🛎️',
  'Esperienze':       '🌊',
}
// Ordine di presentazione delle categorie nel portale ospiti (allineato a coupon_categories)
const CAT_ORDER = ['Barca & Mare', 'Etna & Avventura', 'Dal Cielo', 'Sapori & Cantine', 'Ristoranti', 'Bar & Aperitivo', 'Servizi', 'Esperienze']

// Un coupon è "usato" se lo dice lo status (allineato al gestionale) o se ha used_at
const isCouponUsed = (c) => c?.status === 'used' || !!c?.used_at

const CHAPTERS = [
  { id: 'welcome',    icon: '🏠', labelIt: 'Benvenuto',   labelEn: 'Welcome' },
  { id: 'casa',       icon: '🔑', labelIt: 'La casa',     labelEn: 'The house' },
  { id: 'dintorni',   icon: '📍', labelIt: 'Dintorni',    labelEn: 'Nearby' },
  { id: 'regole',     icon: '📋', labelIt: 'Regole',      labelEn: 'Rules' },
  { id: 'esperienze', icon: '🌊', labelIt: 'Esperienze',  labelEn: 'Experiences' },
  { id: 'coupon',     icon: '🎁', labelIt: 'Coupon',      labelEn: 'Coupons' },
  { id: 'contatti',   icon: '💬', labelIt: 'Contatti',    labelEn: 'Contacts' },
]

export default function WelcomeBook() {
  const { code }  = useParams()
  const navigate  = useNavigate()
  const [booking, setBooking]   = useState(null)
  const [coupons, setCoupons]   = useState([])
  const [content, setContent]   = useState(null) // guest_portal_content: testi/foto configurabili
  const [chapter, setChapter]   = useState('welcome')
  const [loading, setLoading]   = useState(true)
  const [wifiShown, setWifiShown] = useState(false)
  const [lang, setLang]         = useState('it')

  useEffect(() => { load() }, [code])

  async function load() {
    const { data } = await sb.rpc('get_booking_by_code', { p_code: code })
    const b = data?.[0]
    if (!b) { navigate('/ospite'); return }
    setBooking(b)
    const { data: gc } = await sb.from('guest_coupons')
      .select('*, coupon_templates(*, coupon_categories(name,color,slug))').eq('booking_id', b.id)
    setCoupons(gc || [])

    // Contenuti configurabili del Portale Ospiti (foto, testi, liste), della STESSA
    // struttura della prenotazione — essenziale ora che esistono più clienti/strutture.
    const { data: pc } = await sb.from('guest_portal_content').select('*').eq('property_id', b.property_id).maybeSingle()
    setContent(pc || null)

    setLoading(false)
  }

  async function useCoupon(id) {
    const now = new Date().toISOString()
    // Allineo status e used_at: così nel gestionale il coupon risulta "Usato"
    await sb.from('guest_coupons').update({ status: 'used', used_at: now }).eq('id', id)
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, status: 'used', used_at: now } : c))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--lava)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", color: 'var(--gold)', fontSize: '1.2rem', fontStyle: 'italic' }}>Caricamento…</div>
    </div>
  )

  const ci = new Date(booking.check_in).toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const co = new Date(booking.check_out).toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ ...WB_THEME, minHeight: '100vh', background: 'var(--lava)', paddingBottom: 80, position: 'relative' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, height: 2, background: 'var(--gold)', zIndex: 8000, width: '30%' }} />

      {/* Lang switch — top right */}
      <div style={{ position: 'fixed', top: 10, right: 12, zIndex: 9000, display: 'flex', gap: '0.3rem' }}>
        {['it', 'en'].map(l => (
          <button key={l} onClick={() => setLang(l)} style={{
            background: lang === l ? 'rgba(201,171,114,0.12)' : 'none',
            border: `1px solid ${lang === l ? 'rgba(201,171,114,0.5)' : 'rgba(201,171,114,0.15)'}`,
            color: lang === l ? 'var(--gold)' : 'rgba(240,235,225,0.3)',
            fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase',
            padding: '0.25rem 0.5rem', cursor: 'pointer', fontFamily: "'Jost', sans-serif",
          }}>
            {l === 'it' ? '🇮🇹' : '🇬🇧'}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 0 2rem' }}>
        {chapter === 'welcome'    && <ChWelcome booking={booking} ci={ci} co={co} wifiShown={wifiShown} setWifiShown={setWifiShown} lang={lang} content={content} />}
        {chapter === 'casa'       && <ChCasa lang={lang} items={content?.casa_items} />}
        {chapter === 'dintorni'   && <ChDintorni lang={lang} items={content?.dintorni_items} />}
        {chapter === 'regole'     && <ChRegole lang={lang} items={content?.regole_items} />}
        {chapter === 'esperienze' && <ChEsperienze lang={lang} propertyId={booking.property_id} />}
        {chapter === 'coupon'     && <ChCoupon coupons={coupons} useCoupon={useCoupon} lang={lang} />}
        {chapter === 'contatti'   && <ChContatti lang={lang} />}
      </div>

      {/* BOTTOM NAV */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 7000,
        background: 'rgba(10,8,7,.96)', backdropFilter: 'blur(18px)',
        borderTop: '1px solid var(--gold-dim)',
        display: 'flex', overflowX: 'auto', padding: '0 0.3rem',
        scrollbarWidth: 'none',
      }}>
        {CHAPTERS.map(ch => (
          <button key={ch.id} onClick={() => setChapter(ch.id)} style={{
            flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '0.22rem', padding: '0.7rem 0.9rem', cursor: 'pointer',
            border: 'none', background: 'transparent',
            color: chapter === ch.id ? 'var(--gold)' : 'rgba(240,235,225,.28)',
            minWidth: 56, transition: 'color .22s', position: 'relative',
          }}>
            <span style={{ fontSize: '1.1rem' }}>{ch.icon}</span>
            <span style={{ fontSize: '0.48rem', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              {lang === 'it' ? ch.labelIt : ch.labelEn}
            </span>
            {ch.id === 'coupon' && coupons.filter(c => !isCouponUsed(c)).length > 0 && (
              <span style={{ position: 'absolute', top: 6, right: 8, width: 8, height: 8, background: 'var(--gold)', borderRadius: '50%' }} />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── WELCOME ───────────────────────────────────────────────

function ChWelcome({ booking, ci, co, wifiShown, setWifiShown, lang, content }) {
  const [netCopied, setNetCopied] = useState(false)
  const [pwdCopied, setPwdCopied] = useState(false)

  function copyText(text, cb) {
    navigator.clipboard.writeText(text)
    cb(true); setTimeout(() => cb(false), 1500)
  }

  const it = lang === 'it'
  const heroUrl = content?.hero_image_url || HERO_URL_DEFAULT
  const wifiSsid = content?.wifi_ssid || WIFI_SSID_DEFAULT
  const wifiPassword = content?.wifi_password || WIFI_PASSWORD_DEFAULT
  const welcomeText = it
    ? (content?.welcome_text_it || 'Siamo felici di accoglierti personalmente e consegnarti le chiavi. Caellitta Home è nata per essere vissuta — non solo abitata. Il mare sotto, il castello di lava alle spalle, il profumo di zagara nell\'aria. Questo spazio è tuo.')
    : (content?.welcome_text_en || 'We will be happy to welcome you personally and hand you the keys. Caellitta Home was built to be lived — not just occupied. The sea below, the lava castle behind you, the scent of orange blossom in the air. This space is yours.')

  return (
    <div>
      {/* HERO — immagine dal bucket "site-media" (o override caricato dal Portale Ospiti), con fallback all'asset locale */}
      <div style={{ minHeight: '62vw', maxHeight: 340, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.8rem 1.5rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
        <img
          src={heroUrl}
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = heroFallback }}
          alt="Aci Castello"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(19,16,14,.96) 0%,rgba(19,16,14,.2) 100%)' }} />
        <p style={{ position: 'relative', zIndex: 2, fontSize: '0.58rem', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.5rem' }}>Caellitta Home · Aci Castello</p>
        <h1 style={{ position: 'relative', zIndex: 2, fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(2rem,9vw,2.8rem)', fontWeight: 300, lineHeight: 1.05 }}>
          {it ? <>Benvenuto<br/><em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>a casa tua.</em></> : <>Welcome<br/><em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>to your home.</em></>}
        </h1>
      </div>

      <div style={{ padding: '0 1.5rem' }}>
        <div style={{ width: 28, height: 1, background: 'var(--gold)', opacity: .55, margin: '1.5rem 0' }} />

        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.05rem', fontWeight: 300, lineHeight: 1.85, color: 'rgba(240,235,225,.75)', marginBottom: '1rem' }}>
          {welcomeText}
        </p>

        <div style={{ width: 28, height: 1, background: 'var(--gold)', opacity: .55, margin: '1.5rem 0' }} />

        {/* Booking info */}
        <span style={{ fontSize: '0.58rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--gold)', display: 'block', marginBottom: '0.7rem' }}>
          {it ? 'Il tuo soggiorno' : 'Your stay'}
        </span>
        <div style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '1.2rem 1.3rem', marginBottom: '0.75rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,var(--gold),transparent)' }} />
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.05rem', marginBottom: '0.4rem' }}>{booking.guest_name}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--salt-dim)', lineHeight: 1.8 }}>
            Check-in: <strong style={{ color: 'var(--gold)' }}>{ci}</strong> &nbsp;·&nbsp;
            Check-out: <strong style={{ color: 'var(--gold)' }}>{co}</strong>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'rgba(201,171,114,.6)', marginTop: '0.4rem' }}>{booking.code}</div>
        </div>

        {/* WiFi */}
        <div style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '1.2rem 1.3rem', marginBottom: '0.75rem' }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.05rem', marginBottom: '0.8rem' }}>🌐 WiFi</div>
          <div style={{ background: 'rgba(201,171,114,.06)', border: '1px solid rgba(201,171,114,.18)', padding: '0.8rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--gold-dim)' }}>
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(240,235,225,.28)' }}>{it ? 'Rete' : 'Network'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--gold)' }}>{wifiSsid}</span>
                <button onClick={() => copyText(wifiSsid, setNetCopied)} style={{ background: 'transparent', border: '1px solid rgba(201,171,114,.28)', color: netCopied ? '#7dcca0' : 'var(--gold)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.25rem 0.55rem', cursor: 'pointer' }}>
                  {netCopied ? (it ? 'Copiato' : 'Copied') : (it ? 'Copia' : 'Copy')}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0' }}>
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(240,235,225,.28)' }}>Password</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--gold)' }}>{wifiShown ? wifiPassword : '••••••••••••'}</span>
                <button onClick={() => setWifiShown(!wifiShown)} style={{ background: 'transparent', border: '1px solid rgba(201,171,114,.28)', color: 'var(--gold)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.25rem 0.55rem', cursor: 'pointer' }}>
                  {wifiShown ? (it ? 'Nascondi' : 'Hide') : (it ? 'Mostra' : 'Show')}
                </button>
                {wifiShown && (
                  <button onClick={() => copyText(wifiPassword, setPwdCopied)} style={{ background: 'transparent', border: '1px solid rgba(201,171,114,.28)', color: pwdCopied ? '#7dcca0' : 'var(--gold)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.25rem 0.55rem', cursor: 'pointer' }}>
                    {pwdCopied ? (it ? 'Copiato' : 'Copied') : (it ? 'Copia' : 'Copy')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Orari */}
        <div style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '1.2rem 1.3rem' }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.05rem', marginBottom: '0.4rem' }}>🕐 {it ? 'Orari' : 'Timings'}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--salt-dim)' }}>
            Check-in {it ? 'dalle' : 'from'} <strong style={{ color: 'var(--gold)' }}>15:00</strong> &nbsp;·&nbsp;
            Check-out {it ? 'entro le' : 'by'} <strong style={{ color: 'var(--gold)' }}>11:00</strong>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(240,235,225,.28)', fontStyle: 'italic', marginTop: '0.3rem' }}>
            Check-in from 3:00 PM · Check-out by 11:00 AM
          </div>
        </div>
      </div>
    </div>
  )
}

// ── LA CASA ───────────────────────────────────────────────
// items: opzionale, da guest_portal_content.casa_items. Se assente/vuoto, usa i valori di default.

const CASA_DEFAULT = [
  { icon: '🔑', title_it: 'Check-in', title_en: 'Check-in', text_it: 'Saremo felici di accoglierti personalmente e consegnarti le chiavi della porta al tuo arrivo.', text_en: 'We will be happy to welcome you personally and hand you the door keys upon your arrival.' },
  { icon: '🅿️', title_it: 'Parcheggio', title_en: 'Parking', text_it: 'Parcheggio a pagamento su strada secondo il tariffario orario lungo il lungomare su cui si trova la casa.', text_en: 'Paid on-street parking at hourly rates along the seafront promenade where the house is located.' },
  { icon: '🏠', title_it: 'Piano', title_en: 'Floor', text_it: 'Appartamento al primo piano. Si accede tramite scala (no ascensore).', text_en: 'Apartment on the first floor. Access via stairs (no lift).' },
  { icon: '🧺', title_it: 'Biancheria', title_en: 'Linen', text_it: 'Lenzuola e asciugamani puliti. Cambio biancheria su richiesta.', text_en: 'Clean bed linen and towels provided. Linen change available on request.' },
  { icon: '🍳', title_it: 'Cucina', title_en: 'Kitchen', text_it: 'Completamente attrezzata: pentole, stoviglie, macchina del caffè, friggitrice ad aria, piano a induzione, forno.', text_en: 'Fully equipped: pots, dishes, coffee machine, air fryer, induction hob, oven.' },
]

function ChCasa({ lang, items }) {
  const it = lang === 'it'
  const list = (items && items.length > 0) ? items : CASA_DEFAULT

  return (
    <div>
      <div style={{ minHeight: '55vw', maxHeight: 280, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.8rem 1.5rem 1.5rem', position: 'relative', background: 'linear-gradient(135deg,#1a3040 0%,#13100e 100%)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(19,16,14,.95) 0%,rgba(19,16,14,.15) 100%)' }} />
        <p style={{ position: 'relative', zIndex: 2, fontSize: '0.58rem', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.5rem' }}>
          {it ? 'Info pratiche' : 'Practical info'}
        </p>
        <h2 style={{ position: 'relative', zIndex: 2, fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(1.8rem,8vw,2.5rem)', fontWeight: 300, lineHeight: 1.05 }}>
          {it ? <>La <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>tua casa</em></> : <>Your <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>home</em></>}
        </h2>
      </div>
      <div style={{ padding: '0 1.5rem' }}>
        <div style={{ width: 28, height: 1, background: 'var(--gold)', opacity: .55, margin: '1.5rem 0' }} />
        {list.map((item, idx) => (
          <div key={item.title_it || idx} style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '1.1rem 1.3rem', marginBottom: '0.65rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', marginBottom: '0.3rem' }}>
                {it ? item.title_it : item.title_en}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--salt-dim)', lineHeight: 1.7, fontWeight: 200 }}>
                {it ? item.text_it : item.text_en}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── DINTORNI ──────────────────────────────────────────────

const DINTORNI_DEFAULT = [
  { icon: '🛒', title_it: 'Supermercato', title_en: 'Supermarket', text_it: 'A pochi passi da casa, in Via Re Martino 4, trovi un supermercato appena aperto per la spesa quotidiana.', text_en: 'Just a short walk away, at Via Re Martino 4, you\'ll find a newly opened supermarket for your daily shopping.' },
  { icon: '🌊', title_it: 'Il lungomare', title_en: 'The seafront promenade', text_it: 'La casa si affaccia direttamente sul lungomare: scendi e sei tra locali, bar e american bar, perfetti per un aperitivo al tramonto o una passeggiata serale sul mare.', text_en: 'The house looks directly onto the seafront promenade: step outside and you\'re among local venues, bars and cocktail spots, perfect for a sunset drink or an evening stroll by the sea.' },
  { icon: '🏰', title_it: 'Il Castello Normanno', title_en: 'The Norman Castle', text_it: 'A pochi minuti a piedi puoi visitare il Castello Normanno di Aci Castello, uno dei simboli della costa, con una vista sul mare che vale la salita.', text_en: 'A short walk away you can visit the Norman Castle of Aci Castello, one of the landmarks of this coast, with a sea view well worth the climb.' },
]

function ChDintorni({ lang, items }) {
  const it = lang === 'it'
  const list = (items && items.length > 0) ? items : DINTORNI_DEFAULT

  return (
    <div>
      <div style={{ minHeight: '45vw', maxHeight: 240, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.8rem 1.5rem 1.5rem', position: 'relative', background: 'linear-gradient(135deg,#0c2438 0%,#13100e 100%)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(19,16,14,.95) 0%,rgba(19,16,14,.15) 100%)' }} />
        <p style={{ position: 'relative', zIndex: 2, fontSize: '0.58rem', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.5rem' }}>
          {it ? 'A due passi da qui' : 'Just steps away'}
        </p>
        <h2 style={{ position: 'relative', zIndex: 2, fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(1.8rem,8vw,2.5rem)', fontWeight: 300, lineHeight: 1.05 }}>
          {it ? <>Nei <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>dintorni</em></> : <>What's <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>nearby</em></>}
        </h2>
      </div>
      <div style={{ padding: '0 1.5rem' }}>
        <div style={{ width: 28, height: 1, background: 'var(--gold)', opacity: .55, margin: '1.5rem 0' }} />
        {list.map((item, idx) => (
          <div key={item.title_it || idx} style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '1.1rem 1.3rem', marginBottom: '0.65rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', marginBottom: '0.3rem' }}>
                {it ? item.title_it : item.title_en}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--salt-dim)', lineHeight: 1.7, fontWeight: 200 }}>
                {it ? item.text_it : item.text_en}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── REGOLE ────────────────────────────────────────────────

const REGOLE_DEFAULT = [
  { icon: '🔇', title_it: 'Silenzio notturno', title_en: 'Quiet hours', text_it: 'Rispetto del silenzio dalla sera. I vicini ringraziano.', text_en: 'Please respect quiet hours in the evening. Your neighbours will thank you.' },
  { icon: '🚭', title_it: 'No fumo in casa', title_en: 'No smoking indoors', text_it: 'Ti chiediamo di non fumare all\'interno dell\'appartamento.', text_en: 'Please do not smoke inside the apartment.' },
  { icon: '🐾', title_it: 'Animali', title_en: 'Pets', text_it: 'Benvenuti solo se concordato anticipatamente.', text_en: 'Welcome only if agreed in advance.' },
  { icon: '🗑', title_it: 'Raccolta differenziata', title_en: 'Recycling', text_it: 'Umido, plastica, carta, vetro. Calendario raccolta in bacheca.', text_en: 'Organic, plastic, paper, glass. Collection calendar on the noticeboard.' },
  { icon: '🏡', title_it: 'Cura degli spazi', title_en: 'Care of the space', text_it: 'Ti chiediamo di lasciare la casa nelle stesse condizioni in cui l\'hai trovata.', text_en: 'Please leave the house in the same condition as you found it.' },
  { icon: '💧', title_it: 'Acqua', title_en: 'Water', text_it: 'Evita sprechi. L\'acqua è un bene prezioso in Sicilia.', text_en: 'Avoid waste. Water is precious in Sicily.' },
]

function ChRegole({ lang, items }) {
  const it = lang === 'it'
  const rules = (items && items.length > 0) ? items : REGOLE_DEFAULT

  return (
    <div>
      <div style={{ minHeight: '45vw', maxHeight: 240, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.8rem 1.5rem 1.5rem', position: 'relative', background: 'linear-gradient(135deg,#1a1a2e 0%,#13100e 100%)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(19,16,14,.95) 0%,rgba(19,16,14,.15) 100%)' }} />
        <p style={{ position: 'relative', zIndex: 2, fontSize: '0.58rem', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.5rem' }}>
          {it ? 'Vivere bene insieme' : 'Living well together'}
        </p>
        <h2 style={{ position: 'relative', zIndex: 2, fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(1.8rem,8vw,2.5rem)', fontWeight: 300, lineHeight: 1.05 }}>
          {it ? <>Regole della <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>casa</em></> : <>House <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>rules</em></>}
        </h2>
      </div>
      <div style={{ padding: '0 1.5rem' }}>
        <div style={{ width: 28, height: 1, background: 'var(--gold)', opacity: .55, margin: '1.5rem 0' }} />
        <ul style={{ listStyle: 'none' }}>
          {rules.map((r, idx) => (
            <li key={r.title_it || idx} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '0.8rem 0', borderBottom: '1px solid var(--gold-dim)', fontSize: '0.8rem', fontWeight: 200, color: 'var(--salt-dim)', lineHeight: 1.65 }}>
              <span style={{ fontSize: '0.9rem', flexShrink: 0, marginTop: '0.05rem' }}>{r.icon}</span>
              <div>
                <strong style={{ color: 'var(--salt)', fontWeight: 400 }}>{it ? r.title_it : r.title_en}</strong>
                <br/>{it ? r.text_it : r.text_en}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── ESPERIENZE ────────────────────────────────────────────
// Data-driven: legge le convenzioni attive da Supabase (coupon_templates),
// le stesse che gestisci nel gestionale → sempre allineate.

function ChEsperienze({ lang, propertyId }) {
  const it = lang === 'it'
  const [cats, setCats]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await sb
        .from('coupon_templates')
        .select('id, partner, title, title_en, discount, description, description_en, coupon_categories(name,color,slug)')
        .eq('property_id', propertyId)
        .eq('active', true)
        .order('title')

      const groups = {}
      ;(data || []).forEach(t => {
        const name  = t.coupon_categories?.name  || 'Altro'
        const color = t.coupon_categories?.color || '#c9ab72'
        if (!groups[name]) groups[name] = { name, color, items: [] }
        groups[name].items.push(t)
      })

      const ordered = Object.values(groups).sort((a, b) => {
        const ia = CAT_ORDER.indexOf(a.name); const ib = CAT_ORDER.indexOf(b.name)
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
      })
      setCats(ordered)
      setLoading(false)
    })()
  }, [])

  const waLink = (title) => {
    const msg = it
      ? `Ciao! Sono ospite di Caellitta Home e vorrei informazioni sull'esperienza: ${title}`
      : `Hello! I'm a Caellitta Home guest and I'd like information about this experience: ${title}`
    return `https://wa.me/${CAELLITTA_WA}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div>
      <div style={{ minHeight: '45vw', maxHeight: 240, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.8rem 1.5rem 1.5rem', position: 'relative', background: 'linear-gradient(135deg,#0c2e1e 0%,#13100e 100%)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(19,16,14,.95) 0%,rgba(19,16,14,.15) 100%)' }} />
        <p style={{ position: 'relative', zIndex: 2, fontSize: '0.58rem', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.5rem' }}>
          {it ? 'Avventure siciliane' : 'Sicilian adventures'}
        </p>
        <h2 style={{ position: 'relative', zIndex: 2, fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(1.8rem,8vw,2.5rem)', fontWeight: 300, lineHeight: 1.05 }}>
          {it ? <>Esperienze da <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>vivere</em></> : <>Experiences to <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>live</em></>}
        </h2>
      </div>

      <div style={{ padding: '0 1.5rem' }}>
        <div style={{ width: 28, height: 1, background: 'var(--gold)', opacity: .55, margin: '1.5rem 0' }} />

        {loading ? (
          <div style={{ color: 'var(--salt-faint)', fontStyle: 'italic', fontSize: '0.85rem', padding: '1rem 0' }}>
            {it ? 'Caricamento esperienze…' : 'Loading experiences…'}
          </div>
        ) : cats.length === 0 ? (
          <div style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '2rem', textAlign: 'center', color: 'var(--salt-faint)', fontSize: '0.85rem' }}>
            {it ? 'Esperienze in arrivo a breve.' : 'Experiences coming soon.'}
          </div>
        ) : cats.map(cat => (
          <div key={cat.name} style={{ marginBottom: '1.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.6rem', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.8rem' }}>
              <span style={{ fontSize: '0.95rem' }}>{CAT_ICONS[cat.name] || '✨'}</span>
              {cat.name}
            </div>

            {cat.items.map(t => {
              const title = it ? t.title : (t.title_en || t.title)
              const desc  = it ? t.description : (t.description_en || t.description)
              return (
                <div key={t.id} style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', marginBottom: '0.75rem', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: 3, background: cat.color, flexShrink: 0 }} />
                  <div style={{ padding: '1.1rem 1.2rem', flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', marginBottom: '0.3rem' }}>{title}</div>
                    {t.discount && (
                      <div style={{ fontSize: '0.68rem', color: 'rgba(201,171,114,.75)', lineHeight: 1.5, marginBottom: '0.45rem' }}>{t.discount}</div>
                    )}
                    {desc && (
                      <div style={{ fontSize: '0.76rem', color: 'var(--salt-dim)', lineHeight: 1.72, fontWeight: 200 }}>{desc}</div>
                    )}
                    <a href={waLink(title)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '0.85rem', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--lava)', background: 'var(--gold)', textDecoration: 'none', padding: '0.4rem 0.9rem' }}>
                      {it ? 'Prenota via WhatsApp →' : 'Book via WhatsApp →'}
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── COUPON ────────────────────────────────────────────────

function ChCoupon({ coupons, useCoupon, lang }) {
  const it = lang === 'it'

  return (
    <div>
      <div style={{ minHeight: '45vw', maxHeight: 240, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.8rem 1.5rem 1.5rem', position: 'relative', background: 'linear-gradient(135deg,#2e1a0c 0%,#13100e 100%)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(19,16,14,.95) 0%,rgba(19,16,14,.15) 100%)' }} />
        <p style={{ position: 'relative', zIndex: 2, fontSize: '0.58rem', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.5rem' }}>
          {it ? 'Esclusivo per te' : 'Exclusive for you'}
        </p>
        <h2 style={{ position: 'relative', zIndex: 2, fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(1.8rem,8vw,2.5rem)', fontWeight: 300, lineHeight: 1.05 }}>
          {it ? <>I tuoi <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>coupon</em></> : <>Your <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>coupons</em></>}
        </h2>
      </div>
      <div style={{ padding: '0 1.5rem' }}>
        <div style={{ width: 28, height: 1, background: 'var(--gold)', opacity: .55, margin: '1.5rem 0' }} />
        {coupons.length === 0 ? (
          <div style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.8rem' }}>🎁</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              {it ? 'Nessun coupon ancora' : 'No coupons yet'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--salt-faint)', lineHeight: 1.8, fontWeight: 200 }}>
              {it ? 'I tuoi coupon saranno disponibili a breve. Scrivi su WhatsApp se hai dubbi.' : 'Your coupons will be available shortly. Message us on WhatsApp if you have questions.'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.9rem' }}>
              {coupons.filter(c => !isCouponUsed(c)).length} {it ? 'coupon disponibili' : 'coupons available'} · {coupons.filter(c => isCouponUsed(c)).length} {it ? 'utilizzati' : 'used'}
            </div>
            {coupons.map(c => {
              const t = c.coupon_templates
              const used = isCouponUsed(c)
              const catName = t?.coupon_categories?.name || 'Altro'
              const icon = CAT_ICONS[catName] || '🎁'
              const title = it ? t?.title : (t?.title_en || t?.title)
              const desc  = it ? t?.description : (t?.description_en || t?.description)
              const value = t?.discount
              return (
                <div key={c.id} style={{ background: used ? 'rgba(240,235,225,.03)' : 'var(--lava-card)', border: `1px solid ${used ? 'rgba(201,171,114,.08)' : 'var(--gold-dim)'}`, padding: '1.3rem', marginBottom: '0.75rem', overflow: 'hidden', position: 'relative', opacity: used ? 0.5 : 1 }}>
                  {!used && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,var(--gold),transparent)' }} />}
                  <div style={{ fontSize: '0.55rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.35rem' }}>{icon} {catName}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.2rem', marginBottom: '0.3rem' }}>{title}</div>
                  {desc && <div style={{ fontSize: '0.76rem', color: 'var(--salt-dim)', lineHeight: 1.72, fontWeight: 200, marginBottom: '0.8rem' }}>{desc}</div>}
                  {value && <div style={{ fontSize: '0.72rem', color: used ? 'rgba(201,171,114,.3)' : 'rgba(201,171,114,.85)', marginBottom: '0.8rem', lineHeight: 1.5 }}>{value}</div>}
                  <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', background: 'rgba(201,171,114,.08)', color: 'var(--gold)', padding: '0.35rem 0.75rem', display: 'inline-block', marginBottom: '0.8rem', letterSpacing: '0.08em' }}>{c.code}</div>
                  {used ? (
                    <div style={{ fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--salt-faint)', padding: '0.4rem 0' }}>
                      ✓ {it ? 'Utilizzato' : 'Used'}{c.used_at ? ` ${it ? 'il' : 'on'} ${new Date(c.used_at).toLocaleDateString(it ? 'it-IT' : 'en-GB')}` : ''}
                    </div>
                  ) : (
                    <button onClick={() => { if (confirm(it ? 'Segnare questo coupon come utilizzato?' : 'Mark this coupon as used?')) useCoupon(c.id) }} style={{ width: '100%', padding: '0.55rem', border: '1px solid rgba(201,171,114,.3)', background: 'transparent', color: 'rgba(240,235,225,.7)', fontFamily: 'Jost,sans-serif', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all .2s' }}
                      onMouseEnter={e => { e.target.style.background = 'rgba(201,171,114,.08)'; e.target.style.color = 'var(--gold)' }}
                      onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'rgba(240,235,225,.7)' }}
                    >
                      {it ? 'Segna come utilizzato' : 'Mark as used'}
                    </button>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

// ── CONTATTI ──────────────────────────────────────────────

function ChContatti({ lang }) {
  const it = lang === 'it'

  const contacts = [
    {
      avatar: '💬',
      nameIt: 'Caellitta Home',
      nameEn: 'Caellitta Home',
      roleIt: 'WhatsApp · Contatto principale',
      roleEn: 'WhatsApp · Main contact',
      num: '+39 352 0124403',
      link: `https://wa.me/${CAELLITTA_WA}?text=${encodeURIComponent(it ? 'Ciao! Scrivo da Caellitta Home.' : 'Hello! Writing from Caellitta Home.')}`,
      action: 'WhatsApp',
    },
    {
      avatar: '👤',
      nameIt: 'Salvatore',
      nameEn: 'Salvatore',
      roleIt: 'Host',
      roleEn: 'Host',
      num: '+39 327 931 2378',
      link: 'tel:+393279312378',
      action: it ? 'Chiama' : 'Call',
    },
    {
      avatar: '👤',
      nameIt: 'Rosario',
      nameEn: 'Rosario',
      roleIt: 'Host',
      roleEn: 'Host',
      num: '+39 379 144 5274',
      link: 'tel:+393791445274',
      action: it ? 'Chiama' : 'Call',
    },
  ]

  const emergency = [
    { icon: '🚑', nameIt: 'Emergenze', nameEn: 'Emergency', num: '118' },
    { icon: '🚒', nameIt: 'Vigili del fuoco', nameEn: 'Fire brigade', num: '115' },
    { icon: '🚓', nameIt: 'Carabinieri', nameEn: 'Police', num: '112' },
    { icon: '🏥', nameIt: 'Pronto soccorso', nameEn: 'A&E', num: '095 7261111' },
  ]

  return (
    <div>
      <div style={{ minHeight: '40vw', maxHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.8rem 1.5rem 1.5rem', position: 'relative', background: 'linear-gradient(135deg,#1e1a10 0%,#13100e 100%)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(19,16,14,.95) 0%,rgba(19,16,14,.15) 100%)' }} />
        <p style={{ position: 'relative', zIndex: 2, fontSize: '0.58rem', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.5rem' }}>
          {it ? 'Siamo qui per te' : 'We are here for you'}
        </p>
        <h2 style={{ position: 'relative', zIndex: 2, fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(1.8rem,8vw,2.5rem)', fontWeight: 300, lineHeight: 1.05 }}>
          {it ? <>Contatti & <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>emergenze</em></> : <>Contacts & <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>emergencies</em></>}
        </h2>
      </div>

      <div style={{ padding: '0 1.5rem' }}>
        <div style={{ width: 28, height: 1, background: 'var(--gold)', opacity: .55, margin: '1.5rem 0' }} />

        {contacts.map(c => (
          <div key={c.nameIt} style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '1.2rem 1.3rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(201,171,114,.09)', border: '1px solid rgba(201,171,114,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
              {c.avatar}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem' }}>{it ? c.nameIt : c.nameEn}</div>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--salt-faint)', marginTop: '0.1rem' }}>{it ? c.roleIt : c.roleEn}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gold)', marginTop: '0.3rem', fontFamily: 'monospace' }}>{c.num}</div>
            </div>
            <a href={c.link} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(201,171,114,.08)', border: '1px solid rgba(201,171,114,.25)', color: 'var(--gold)', padding: '0.5rem 0.9rem', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {c.action}
            </a>
          </div>
        ))}

        <span style={{ fontSize: '0.58rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--gold)', display: 'block', margin: '1.5rem 0 0.8rem' }}>
          {it ? 'Numeri di emergenza' : 'Emergency numbers'}
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
          {emergency.map(e => (
            <div key={e.nameIt} style={{ background: 'rgba(140,74,74,.08)', border: '1px solid rgba(140,74,74,.22)', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', marginBottom: '0.4rem' }}>{e.icon}</div>
              <div style={{ fontSize: '0.68rem', fontWeight: 300, color: 'rgba(240,235,225,.7)', marginBottom: '0.25rem' }}>{it ? e.nameIt : e.nameEn}</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', color: '#e08080' }}>{e.num}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
