import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sb } from '../../lib/supabase'
import heroFallback from '../../assets/acicastello.jpg'

// Immagine del Benvenuto servita da Supabase Storage (bucket pubblico "site-media").
// Se l'host ha caricato una foto dal Portale Ospiti (guest_portal_content.hero_image_url)
// quella ha priorità; altrimenti si usa la convenzione fissa "benvenuto.jpg", poi il fallback locale.
const HERO_URL_DEFAULT = 'https://ejjatrfeeatgiqpomibd.supabase.co/storage/v1/object/public/site-media/benvenuto.jpg'


// Converte un colore esadecimale in "r,g,b" per costruire rgba(...) dinamicamente
function hexToRgbTriplet(hex) {
  if (!hex) return '0,0,0'
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const num = parseInt(full, 16)
  if (isNaN(num)) return '0,0,0'
  return `${(num >> 16) & 255},${(num >> 8) & 255},${num & 255}`
}

// Schiarisce/scurisce un colore esadecimale di una percentuale (positivo = più chiaro)
function shade(hex, percent) {
  if (!hex) return hex
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const num = parseInt(full, 16)
  if (isNaN(num)) return hex
  const clamp = v => Math.max(0, Math.min(255, v))
  const r = clamp(((num >> 16) & 255) + Math.round(255 * percent))
  const g = clamp(((num >> 8) & 255) + Math.round(255 * percent))
  const b = clamp((num & 255) + Math.round(255 * percent))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

// Costruisce il tema del Welcome Book: se l'host ha personalizzato i colori in
// Portale Ospiti (guest_portal_content.theme_*) li usa, altrimenti i default
// dell'estetica originale — indipendente dal tema (chiaro) del gestionale.
function buildWbTheme(content) {
  const bg = content?.theme_bg || '#111009'
  const card = content?.theme_card || '#221d14'
  const accent = content?.theme_accent || '#c9ab72'
  const text = content?.theme_text || '#f0ebe1'
  const accentRgb = hexToRgbTriplet(accent)
  const textRgb = hexToRgbTriplet(text)
  return {
    '--lava': bg, '--lava-mid': shade(bg, 0.04), '--lava-card': card, '--lava-hover': shade(card, 0.04),
    '--gold': accent, '--gold-light': shade(accent, 0.15),
    '--gold-dim': `rgba(${accentRgb},0.12)`, '--gold-dim2': `rgba(${accentRgb},0.22)`,
    '--salt': text, '--salt-dim': `rgba(${textRgb},0.72)`, '--salt-faint': `rgba(${textRgb},0.45)`,
    // Gli hero hanno un gradiente scuro fisso (effetto "banner fotografico"), quindi il
    // testo sopra deve restare chiaro anche quando l'host sceglie un tema chiaro —
    // altrimenti diventa scuro su scuro e sparisce.
    '--wb-hero-text': '#f5f0e6',
    '--green': '#4a8a68', '--green-dim': 'rgba(74,138,104,0.15)',
    '--red': '#8a4848', '--red-dim': 'rgba(138,72,72,0.15)',
  }
}
const WIFI_SSID_DEFAULT = 'VodafoneCaellita Home'
const WIFI_PASSWORD_DEFAULT = 'rJT9HdAP2F4Asp96'

// Icone per categoria (coupon_categories.name)
const CAT_ICONS = {
  'Ristoranti':       '🍽️',
  'Bar & Aperitivo':  '🍹',
  'Esperienze':       '🌊',
  'Servizi':          '🛎️',
  'Shopping':         '🛍️',
  'Barca & Mare':     '⛵',
  'Etna & Avventura': '🌋',
  'Dal Cielo':        '🚁',
  'Sapori & Cantine': '🍷',
}
// Ordine di presentazione: prima le categorie note nell'ordine sotto, poi tutte le
// altre (create liberamente dall'host) in ordine alfabetico.
const CAT_ORDER = ['Esperienze', 'Barca & Mare', 'Etna & Avventura', 'Dal Cielo', 'Sapori & Cantine', 'Ristoranti', 'Bar & Aperitivo', 'Shopping', 'Servizi']

// Un coupon è "usato" se lo dice lo status (allineato al gestionale) o se ha used_at
const isCouponUsed = (c) => c?.status === 'used' || !!c?.used_at

// ── SUPPORTO 5 LINGUE ────────────────────────────────────
const LANGS = [
  { code: 'it', flag: '🇮🇹' },
  { code: 'en', flag: '🇬🇧' },
  { code: 'es', flag: '🇪🇸' },
  { code: 'fr', flag: '🇫🇷' },
  { code: 'de', flag: '🇩🇪' },
]

const LOCALE_MAP = { it: 'it-IT', en: 'en-GB', es: 'es-ES', fr: 'fr-FR', de: 'de-DE' }

// Dizionario dei testi fissi dell'interfaccia (non dei contenuti configurabili
// dall'host, quelli restano nelle colonne _it/_en/_es/_fr/_de del database)
const WB_STRINGS = {
  aDuePassiDaQui: { it: 'A due passi da qui', en: 'Just steps away', es: 'A pocos pasos de aquí', fr: "À deux pas d'ici", de: 'Gleich in der Nähe' },
  avventureSiciliane: { it: 'Avventure siciliane', en: 'Sicilian adventures', es: 'Aventuras sicilianas', fr: 'Aventures siciliennes', de: 'Sizilianische Abenteuer' },
  caricamentoEsperienze: { it: 'Caricamento esperienze…', en: 'Loading experiences…', es: 'Cargando experiencias…', fr: 'Chargement des expériences…', de: 'Erlebnisse werden geladen…' },
  chiama: { it: 'Chiama', en: 'Call', es: 'Llamar', fr: 'Appeler', de: 'Anrufen' },
  contattiNonConfigurati: { it: 'Contatti non ancora configurati.', en: 'Contacts not yet configured.', es: 'Contactos aún no configurados.', fr: 'Contacts pas encore configurés.', de: 'Kontakte noch nicht eingerichtet.' },
  copia: { it: 'Copia', en: 'Copy', es: 'Copiar', fr: 'Copier', de: 'Kopieren' },
  copiato: { it: 'Copiato', en: 'Copied', es: 'Copiado', fr: 'Copié', de: 'Kopiert' },
  esclusivoPerTe: { it: 'Esclusivo per te', en: 'Exclusive for you', es: 'Exclusivo para ti', fr: 'Exclusif pour vous', de: 'Exklusiv für Sie' },
  esperienzeInArrivo: { it: 'Esperienze in arrivo a breve.', en: 'Experiences coming soon.', es: 'Experiencias próximamente.', fr: 'Expériences bientôt disponibles.', de: 'Erlebnisse in Kürze verfügbar.' },
  couponInArrivo: { it: 'I tuoi coupon saranno disponibili a breve. Scrivi su WhatsApp se hai dubbi.', en: "Your coupons will be available shortly. Message us on WhatsApp if you have questions.", es: 'Tus cupones estarán disponibles pronto. Escríbenos por WhatsApp si tienes dudas.', fr: 'Vos coupons seront bientôt disponibles. Écrivez-nous sur WhatsApp en cas de doute.', de: 'Ihre Gutscheine sind in Kürze verfügbar. Schreiben Sie uns bei Fragen auf WhatsApp.' },
  ilTuoSoggiorno: { it: 'Il tuo soggiorno', en: 'Your stay', es: 'Tu estancia', fr: 'Votre séjour', de: 'Ihr Aufenthalt' },
  infoPratiche: { it: 'Info pratiche', en: 'Practical info', es: 'Información práctica', fr: 'Infos pratiques', de: 'Praktische Infos' },
  laTuaStruttura: { it: 'La tua struttura', en: 'Your stay', es: 'Tu alojamiento', fr: 'Votre logement', de: 'Ihre Unterkunft' },
  mostra: { it: 'Mostra', en: 'Show', es: 'Mostrar', fr: 'Afficher', de: 'Anzeigen' },
  nascondi: { it: 'Nascondi', en: 'Hide', es: 'Ocultar', fr: 'Masquer', de: 'Verbergen' },
  nessunCouponAncora: { it: 'Nessun coupon ancora', en: 'No coupons yet', es: 'Aún no hay cupones', fr: 'Pas encore de coupons', de: 'Noch keine Gutscheine' },
  numeriEmergenza: { it: 'Numeri di emergenza', en: 'Emergency numbers', es: 'Números de emergencia', fr: "Numéros d'urgence", de: 'Notfallnummern' },
  orari: { it: 'Orari', en: 'Timings', es: 'Horarios', fr: 'Horaires', de: 'Zeiten' },
  prenotaViaWhatsapp: { it: 'Prenota via WhatsApp →', en: 'Book via WhatsApp →', es: 'Reserva por WhatsApp →', fr: 'Réservez via WhatsApp →', de: 'Über WhatsApp buchen →' },
  rete: { it: 'Rete', en: 'Network', es: 'Red', fr: 'Réseau', de: 'Netzwerk' },
  segnaUtilizzato: { it: 'Segna come utilizzato', en: 'Mark as used', es: 'Marcar como usado', fr: 'Marquer comme utilisé', de: 'Als verwendet markieren' },
  confermaUtilizzo: { it: 'Segnare questo coupon come utilizzato?', en: 'Mark this coupon as used?', es: '¿Marcar este cupón como usado?', fr: 'Marquer ce coupon comme utilisé ?', de: 'Diesen Gutschein als verwendet markieren?' },
  sezioneVuota: { it: 'Sezione ancora vuota.', en: 'This section is still empty.', es: 'Sección aún vacía.', fr: 'Section encore vide.', de: 'Abschnitt noch leer.' },
  siamoQuiPerTe: { it: 'Siamo qui per te', en: 'We are here for you', es: 'Estamos aquí para ti', fr: 'Nous sommes là pour vous', de: 'Wir sind für Sie da' },
  utilizzato: { it: 'Utilizzato', en: 'Used', es: 'Usado', fr: 'Utilisé', de: 'Verwendet' },
  vivereBeneInsieme: { it: 'Vivere bene insieme', en: 'Living well together', es: 'Convivir bien', fr: 'Bien vivre ensemble', de: 'Gut zusammenleben' },
  couponDisponibili: { it: 'coupon disponibili', en: 'coupons available', es: 'cupones disponibles', fr: 'coupons disponibles', de: 'verfügbare Gutscheine' },
  dalleOra: { it: 'dalle', en: 'from', es: 'desde las', fr: 'à partir de', de: 'ab' },
  entroLe: { it: 'entro le', en: 'by', es: 'antes de las', fr: 'avant', de: 'bis' },
  ilGiorno: { it: 'il', en: 'on', es: 'el', fr: 'le', de: 'am' },
  utilizzatiPl: { it: 'utilizzati', en: 'used', es: 'usados', fr: 'utilisés', de: 'verwendet' },
}

function t(key, lang) {
  return WB_STRINGS[key]?.[lang] || WB_STRINGS[key]?.it || key
}

// Legge un campo multilingua da un contenuto configurabile dall'host (es. item.title_es).
// Fallback: lingua richiesta → italiano → inglese → stringa vuota.
function pick(obj, field, lang) {
  if (!obj) return ''
  return obj[`${field}_${lang}`] || obj[`${field}_it`] || obj[`${field}_en`] || ''
}

// Titoli hero: [prefisso, parte in corsivo dorato]. "welcome" va su due righe (<br/>),
// gli altri sono su una riga sola.
const HERO = {
  welcome:    { it: ['Benvenuto', 'a casa tua.'], en: ['Welcome', 'to your home.'], es: ['Bienvenido', 'a tu hogar.'], fr: ['Bienvenue', 'chez vous.'], de: ['Willkommen', 'zu Hause.'] },
  casa:       { it: ['La ', 'tua casa'], en: ['Your ', 'home'], es: ['Tu ', 'casa'], fr: ['Votre ', 'maison'], de: ['Ihr ', 'Zuhause'] },
  dintorni:   { it: ['Nei ', 'dintorni'], en: ["What's ", 'nearby'], es: ['En los ', 'alrededores'], fr: ['Dans les ', 'environs'], de: ['In der ', 'Umgebung'] },
  regole:     { it: ['Regole della ', 'casa'], en: ['House ', 'rules'], es: ['Normas de la ', 'casa'], fr: ['Règles de la ', 'maison'], de: ['Haus', 'regeln'] },
  esperienze: { it: ['Esperienze da ', 'vivere'], en: ['Experiences to ', 'live'], es: ['Experiencias para ', 'vivir'], fr: ['Expériences à ', 'vivre'], de: ['Erlebnisse zum ', 'Entdecken'] },
  coupon:     { it: ['I tuoi ', 'coupon'], en: ['Your ', 'coupons'], es: ['Tus ', 'cupones'], fr: ['Vos ', 'coupons'], de: ['Ihre ', 'Gutscheine'] },
  contatti:   { it: ['Contatti & ', 'emergenze'], en: ['Contacts & ', 'emergencies'], es: ['Contactos y ', 'emergencias'], fr: ['Contacts et ', 'urgences'], de: ['Kontakte & ', 'Notfälle'] },
}

function HeroTitle({ chapterKey, lang }) {
  const h = HERO[chapterKey]?.[lang] || HERO[chapterKey]?.it
  const emStyle = { fontStyle: 'italic', color: 'var(--gold)' }
  if (chapterKey === 'welcome') {
    return <>{h[0]}<br/><em style={emStyle}>{h[1]}</em></>
  }
  return <>{h[0]}<em style={emStyle}>{h[1]}</em></>
}

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

  const ci = new Date(booking.check_in).toLocaleDateString(LOCALE_MAP[lang] || 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const co = new Date(booking.check_out).toLocaleDateString(LOCALE_MAP[lang] || 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // Sezioni personalizzate create dall'host: appaiono nel menu dopo "Regole" e prima di "Esperienze"
  const customChapters = (content?.custom_sections || []).map(sec => ({
    id: sec.id, icon: sec.icon || '✨', labelIt: sec.label_it, labelEn: sec.label_en, custom: true,
  }))
  const allChapters = [...CHAPTERS.slice(0, 4), ...customChapters, ...CHAPTERS.slice(4)]
  const activeCustomSection = (content?.custom_sections || []).find(sec => sec.id === chapter)

  return (
    <div style={{ ...buildWbTheme(content), minHeight: '100vh', background: 'var(--lava)', paddingBottom: 80, position: 'relative' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, height: 2, background: 'var(--gold)', zIndex: 8000, width: '30%' }} />

      {/* Lang switch — top right, 5 lingue */}
      <div style={{ position: 'fixed', top: 10, right: 12, zIndex: 9000, display: 'flex', gap: '0.25rem', background: 'rgba(0,0,0,0.15)', padding: '0.25rem', borderRadius: 4 }}>
        {LANGS.map(({ code, flag }) => (
          <button key={code} onClick={() => setLang(code)} title={code.toUpperCase()} style={{
            background: lang === code ? 'rgba(201,171,114,0.18)' : 'none',
            border: `1px solid ${lang === code ? 'rgba(201,171,114,0.5)' : 'transparent'}`,
            fontSize: '0.85rem',
            padding: '0.2rem 0.35rem', cursor: 'pointer', fontFamily: "'Jost', sans-serif", borderRadius: 3,
          }}>
            {flag}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 0 2rem' }}>
        {chapter === 'welcome'    && <ChWelcome booking={booking} ci={ci} co={co} wifiShown={wifiShown} setWifiShown={setWifiShown} lang={lang} content={content} />}
        {chapter === 'casa'       && <ChCasa lang={lang} items={content?.casa_items} />}
        {chapter === 'dintorni'   && <ChDintorni lang={lang} items={content?.dintorni_items} />}
        {chapter === 'regole'     && <ChRegole lang={lang} items={content?.regole_items} />}
        {activeCustomSection      && <ChCustom lang={lang} section={activeCustomSection} />}
        {chapter === 'esperienze' && <ChEsperienze lang={lang} propertyId={booking.property_id} propertyName={booking.property_name}
          waNumber={(content?.contacts_items || []).find(c => c.is_whatsapp)?.phone?.replace(/[^\d]/g, '')} />}
        {chapter === 'coupon'     && <ChCoupon coupons={coupons} useCoupon={useCoupon} lang={lang} />}
        {chapter === 'contatti'   && <ChContatti lang={lang} propertyName={booking.property_name} items={content?.contacts_items} emergencyItems={content?.emergency_items} />}
      </div>

      {/* BOTTOM NAV */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 7000,
        background: 'var(--lava-mid)', backdropFilter: 'blur(18px)',
        borderTop: '1px solid var(--gold-dim)',
        display: 'flex', overflowX: 'auto', padding: '0 0.3rem',
        scrollbarWidth: 'none',
      }}>
        {allChapters.map(ch => (
          <button key={ch.id} onClick={() => setChapter(ch.id)} style={{
            flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '0.22rem', padding: '0.7rem 0.9rem', cursor: 'pointer',
            border: 'none', background: 'transparent',
            color: chapter === ch.id ? 'var(--gold)' : 'var(--salt-faint)',
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
    ? (content?.welcome_text_it || 'Siamo felici di accoglierti personalmente e consegnarti le chiavi. Questa casa è nata per essere vissuta — non solo abitata.')
    : (content?.welcome_text_en || 'We will be happy to welcome you personally and hand you the keys. This home was built to be lived — not just occupied.')

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
        <p style={{ position: 'relative', zIndex: 2, fontSize: '0.58rem', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.5rem' }}>{booking.property_name || (t('laTuaStruttura', lang))}</p>
        <h1 style={{ position: 'relative', zIndex: 2, fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(2rem,9vw,2.8rem)', fontWeight: 300, lineHeight: 1.05, color: 'var(--wb-hero-text)' }}>
          {<HeroTitle chapterKey="welcome" lang={lang} />}
        </h1>
      </div>

      <div style={{ padding: '0 1.5rem' }}>
        <div style={{ width: 28, height: 1, background: 'var(--gold)', opacity: .55, margin: '1.5rem 0' }} />

        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.05rem', fontWeight: 300, lineHeight: 1.85, color: 'var(--salt-dim)', marginBottom: '1rem' }}>
          {welcomeText}
        </p>

        <div style={{ width: 28, height: 1, background: 'var(--gold)', opacity: .55, margin: '1.5rem 0' }} />

        {/* Booking info */}
        <span style={{ fontSize: '0.58rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--gold)', display: 'block', marginBottom: '0.7rem' }}>
          {t('ilTuoSoggiorno', lang)}
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
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--salt-faint)' }}>{t('rete', lang)}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--gold)' }}>{wifiSsid}</span>
                <button onClick={() => copyText(wifiSsid, setNetCopied)} style={{ background: 'transparent', border: '1px solid rgba(201,171,114,.28)', color: netCopied ? '#3d8a5c' : 'var(--gold)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.25rem 0.55rem', cursor: 'pointer' }}>
                  {netCopied ? (t('copiato', lang)) : (t('copia', lang))}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0' }}>
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--salt-faint)' }}>Password</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--gold)' }}>{wifiShown ? wifiPassword : '••••••••••••'}</span>
                <button onClick={() => setWifiShown(!wifiShown)} style={{ background: 'transparent', border: '1px solid rgba(201,171,114,.28)', color: 'var(--gold)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.25rem 0.55rem', cursor: 'pointer' }}>
                  {wifiShown ? (t('nascondi', lang)) : (t('mostra', lang))}
                </button>
                {wifiShown && (
                  <button onClick={() => copyText(wifiPassword, setPwdCopied)} style={{ background: 'transparent', border: '1px solid rgba(201,171,114,.28)', color: pwdCopied ? '#3d8a5c' : 'var(--gold)', fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.25rem 0.55rem', cursor: 'pointer' }}>
                    {pwdCopied ? (t('copiato', lang)) : (t('copia', lang))}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Orari */}
        <div style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '1.2rem 1.3rem' }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.05rem', marginBottom: '0.4rem' }}>🕐 {t('orari', lang)}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--salt-dim)' }}>
            Check-in {t('dalleOra', lang)} <strong style={{ color: 'var(--gold)' }}>15:00</strong> &nbsp;·&nbsp;
            Check-out {t('entroLe', lang)} <strong style={{ color: 'var(--gold)' }}>11:00</strong>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--salt-faint)', fontStyle: 'italic', marginTop: '0.3rem' }}>
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
          {t('infoPratiche', lang)}
        </p>
        <h2 style={{ position: 'relative', zIndex: 2, fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(1.8rem,8vw,2.5rem)', fontWeight: 300, lineHeight: 1.05, color: 'var(--wb-hero-text)' }}>
          {<HeroTitle chapterKey="casa" lang={lang} />}
        </h2>
      </div>
      <div style={{ padding: '0 1.5rem' }}>
        <div style={{ width: 28, height: 1, background: 'var(--gold)', opacity: .55, margin: '1.5rem 0' }} />
        {list.map((item, idx) => (
          <div key={item.title_it || idx} style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '1.1rem 1.3rem', marginBottom: '0.65rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', marginBottom: '0.3rem' }}>
                {pick(item, 'title', lang)}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--salt-dim)', lineHeight: 1.7, fontWeight: 200 }}>
                {pick(item, 'text', lang)}
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
          {t('aDuePassiDaQui', lang)}
        </p>
        <h2 style={{ position: 'relative', zIndex: 2, fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(1.8rem,8vw,2.5rem)', fontWeight: 300, lineHeight: 1.05, color: 'var(--wb-hero-text)' }}>
          {<HeroTitle chapterKey="dintorni" lang={lang} />}
        </h2>
      </div>
      <div style={{ padding: '0 1.5rem' }}>
        <div style={{ width: 28, height: 1, background: 'var(--gold)', opacity: .55, margin: '1.5rem 0' }} />
        {list.map((item, idx) => (
          <div key={item.title_it || idx} style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '1.1rem 1.3rem', marginBottom: '0.65rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', marginBottom: '0.3rem' }}>
                {pick(item, 'title', lang)}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--salt-dim)', lineHeight: 1.7, fontWeight: 200 }}>
                {pick(item, 'text', lang)}
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
          {t('vivereBeneInsieme', lang)}
        </p>
        <h2 style={{ position: 'relative', zIndex: 2, fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(1.8rem,8vw,2.5rem)', fontWeight: 300, lineHeight: 1.05, color: 'var(--wb-hero-text)' }}>
          {<HeroTitle chapterKey="regole" lang={lang} />}
        </h2>
      </div>
      <div style={{ padding: '0 1.5rem' }}>
        <div style={{ width: 28, height: 1, background: 'var(--gold)', opacity: .55, margin: '1.5rem 0' }} />
        <ul style={{ listStyle: 'none' }}>
          {rules.map((r, idx) => (
            <li key={r.title_it || idx} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '0.8rem 0', borderBottom: '1px solid var(--gold-dim)', fontSize: '0.8rem', fontWeight: 200, color: 'var(--salt-dim)', lineHeight: 1.65 }}>
              <span style={{ fontSize: '0.9rem', flexShrink: 0, marginTop: '0.05rem' }}>{r.icon}</span>
              <div>
                <strong style={{ color: 'var(--salt)', fontWeight: 400 }}>{pick(r, 'title', lang)}</strong>
                <br/>{pick(r, 'text', lang)}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── SEZIONE PERSONALIZZATA (creata liberamente dall'host) ──

function ChCustom({ lang, section }) {
  const it = lang === 'it'
  return (
    <div>
      <div style={{ minHeight: '45vw', maxHeight: 240, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.8rem 1.5rem 1.5rem', position: 'relative', background: 'linear-gradient(135deg,#2a2418 0%,#13100e 100%)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(19,16,14,.95) 0%,rgba(19,16,14,.15) 100%)' }} />
        <h2 style={{ position: 'relative', zIndex: 2, fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(1.8rem,8vw,2.5rem)', fontWeight: 300, lineHeight: 1.05, color: 'var(--wb-hero-text)' }}>
          <span style={{ marginRight: '0.5rem' }}>{section.icon}</span>
          <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>{pick(section, 'label', lang)}</em>
        </h2>
      </div>
      <div style={{ padding: '0 1.5rem' }}>
        <div style={{ width: 28, height: 1, background: 'var(--gold)', opacity: .55, margin: '1.5rem 0' }} />
        {(!section.items || section.items.length === 0) ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--salt-faint)' }}>{t('sezioneVuota', lang)}</p>
        ) : section.items.map((item, idx) => (
          <div key={idx} style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '1.1rem 1.3rem', marginBottom: '0.65rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem', marginBottom: '0.3rem' }}>
                {pick(item, 'title', lang)}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--salt-dim)', lineHeight: 1.7, fontWeight: 200 }}>
                {pick(item, 'text', lang)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── ESPERIENZE ────────────────────────────────────────────
// Data-driven: legge le convenzioni attive da Supabase (coupon_templates),
// le stesse che gestisci nel gestionale → sempre allineate.

function ChEsperienze({ lang, propertyId, propertyName, waNumber }) {
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
        const ra = ia === -1 ? 99 : ia; const rb = ib === -1 ? 99 : ib
        // A parità (entrambe categorie personalizzate dell'host), ordine alfabetico
        return ra !== rb ? ra - rb : a.name.localeCompare(b.name)
      })
      setCats(ordered)
      setLoading(false)
    })()
  }, [])

  const waLink = (title) => {
    const msg = it
      ? `Ciao! Sono ospite di ${propertyName || 'questa struttura'} e vorrei informazioni sull'esperienza: ${title}`
      : `Hello! I'm a guest at ${propertyName || 'this property'} and I'd like information about this experience: ${title}`
    return waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}` : null
  }

  return (
    <div>
      <div style={{ minHeight: '45vw', maxHeight: 240, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.8rem 1.5rem 1.5rem', position: 'relative', background: 'linear-gradient(135deg,#0c2e1e 0%,#13100e 100%)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(19,16,14,.95) 0%,rgba(19,16,14,.15) 100%)' }} />
        <p style={{ position: 'relative', zIndex: 2, fontSize: '0.58rem', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.5rem' }}>
          {t('avventureSiciliane', lang)}
        </p>
        <h2 style={{ position: 'relative', zIndex: 2, fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(1.8rem,8vw,2.5rem)', fontWeight: 300, lineHeight: 1.05, color: 'var(--wb-hero-text)' }}>
          {<HeroTitle chapterKey="esperienze" lang={lang} />}
        </h2>
      </div>

      <div style={{ padding: '0 1.5rem' }}>
        <div style={{ width: 28, height: 1, background: 'var(--gold)', opacity: .55, margin: '1.5rem 0' }} />

        {loading ? (
          <div style={{ color: 'var(--salt-faint)', fontStyle: 'italic', fontSize: '0.85rem', padding: '1rem 0' }}>
            {t('caricamentoEsperienze', lang)}
          </div>
        ) : cats.length === 0 ? (
          <div style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '2rem', textAlign: 'center', color: 'var(--salt-faint)', fontSize: '0.85rem' }}>
            {t('esperienzeInArrivo', lang)}
          </div>
        ) : cats.map(cat => (
          <div key={cat.name} style={{ marginBottom: '1.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.6rem', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.8rem' }}>
              <span style={{ fontSize: '0.95rem' }}>{CAT_ICONS[cat.name] || '✨'}</span>
              {cat.name}
            </div>

            {cat.items.map(t => {
              const title = t[`title_${lang}`] || t.title_en || t.title
              const desc  = t[`description_${lang}`] || t.description_en || t.description
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
                    {waNumber && (
                      <a href={waLink(title)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '0.85rem', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--lava)', background: 'var(--gold)', textDecoration: 'none', padding: '0.4rem 0.9rem' }}>
                        {t('prenotaViaWhatsapp', lang)}
                      </a>
                    )}
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
          {t('esclusivoPerTe', lang)}
        </p>
        <h2 style={{ position: 'relative', zIndex: 2, fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(1.8rem,8vw,2.5rem)', fontWeight: 300, lineHeight: 1.05, color: 'var(--wb-hero-text)' }}>
          {<HeroTitle chapterKey="coupon" lang={lang} />}
        </h2>
      </div>
      <div style={{ padding: '0 1.5rem' }}>
        <div style={{ width: 28, height: 1, background: 'var(--gold)', opacity: .55, margin: '1.5rem 0' }} />
        {coupons.length === 0 ? (
          <div style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.8rem' }}>🎁</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              {t('nessunCouponAncora', lang)}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--salt-faint)', lineHeight: 1.8, fontWeight: 200 }}>
              {t('couponInArrivo', lang)}
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.9rem' }}>
              {coupons.filter(c => !isCouponUsed(c)).length} {t('couponDisponibili', lang)} · {coupons.filter(c => isCouponUsed(c)).length} {t('utilizzatiPl', lang)}
            </div>
            {coupons.map(c => {
              const t = c.coupon_templates
              const used = isCouponUsed(c)
              const catName = t?.coupon_categories?.name || 'Altro'
              const icon = CAT_ICONS[catName] || '🎁'
              const title = t?.[`title_${lang}`] || t?.title_en || t?.title
              const desc  = t?.[`description_${lang}`] || t?.description_en || t?.description
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
                      ✓ {t('utilizzato', lang)}{c.used_at ? ` ${t('ilGiorno', lang)} ${new Date(c.used_at).toLocaleDateString(LOCALE_MAP[lang] || 'en-GB')}` : ''}
                    </div>
                  ) : (
                    <button onClick={() => { if (confirm(t('confermaUtilizzo', lang))) useCoupon(c.id) }} style={{ width: '100%', padding: '0.55rem', border: '1px solid rgba(201,171,114,.3)', background: 'transparent', color: 'var(--salt-dim)', fontFamily: 'Jost,sans-serif', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all .2s' }}
                      onMouseEnter={e => { e.target.style.background = 'rgba(201,171,114,.08)'; e.target.style.color = 'var(--gold)' }}
                      onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--salt-dim)' }}
                    >
                      {t('segnaUtilizzato', lang)}
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

const CONTACTS_DEFAULT = []
const EMERGENCY_DEFAULT = [
  { icon: '🚑', name_it: 'Emergenze', name_en: 'Emergency', num: '118' },
  { icon: '🚒', name_it: 'Vigili del fuoco', name_en: 'Fire brigade', num: '115' },
  { icon: '🚓', name_it: 'Carabinieri', name_en: 'Police', num: '112' },
]
const AVATAR_ICON = { chat: '💬', person: '👤' }

function ChContatti({ lang, propertyName, items, emergencyItems }) {
  const it = lang === 'it'
  const contacts = (items && items.length > 0) ? items : CONTACTS_DEFAULT
  const emergency = (emergencyItems && emergencyItems.length > 0) ? emergencyItems : EMERGENCY_DEFAULT

  function contactLink(c) {
    const digits = (c.phone || '').replace(/[^\d+]/g, '').replace(/^\+/, '')
    if (c.is_whatsapp) {
      const CONTACT_MSG = {
        it: `Ciao! Scrivo da ${propertyName || 'qui'}.`,
        en: `Hello! Writing from ${propertyName || 'here'}.`,
        es: `¡Hola! Escribo desde ${propertyName || 'aquí'}.`,
        fr: `Bonjour ! J'écris depuis ${propertyName || 'ici'}.`,
        de: `Hallo! Ich schreibe aus ${propertyName || 'hier'}.`,
      }
      const msg = CONTACT_MSG[lang] || CONTACT_MSG.it
      return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`
    }
    return `tel:+${digits}`
  }

  return (
    <div>
      <div style={{ minHeight: '40vw', maxHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.8rem 1.5rem 1.5rem', position: 'relative', background: 'linear-gradient(135deg,#1e1a10 0%,#13100e 100%)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(19,16,14,.95) 0%,rgba(19,16,14,.15) 100%)' }} />
        <p style={{ position: 'relative', zIndex: 2, fontSize: '0.58rem', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.5rem' }}>
          {t('siamoQuiPerTe', lang)}
        </p>
        <h2 style={{ position: 'relative', zIndex: 2, fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(1.8rem,8vw,2.5rem)', fontWeight: 300, lineHeight: 1.05, color: 'var(--wb-hero-text)' }}>
          {<HeroTitle chapterKey="contatti" lang={lang} />}
        </h2>
      </div>

      <div style={{ padding: '0 1.5rem' }}>
        <div style={{ width: 28, height: 1, background: 'var(--gold)', opacity: .55, margin: '1.5rem 0' }} />

        {contacts.length === 0 && (
          <p style={{ fontSize: '0.78rem', color: 'var(--salt-faint)', marginBottom: '1rem' }}>
            {t('contattiNonConfigurati', lang)}
          </p>
        )}
        {contacts.map((c, idx) => (
          <div key={idx} style={{ background: 'var(--lava-card)', border: '1px solid var(--gold-dim)', padding: '1.2rem 1.3rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(201,171,114,.09)', border: '1px solid rgba(201,171,114,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
              {AVATAR_ICON[c.avatar] || '👤'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1rem' }}>{c.name || propertyName || '—'}</div>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--salt-faint)', marginTop: '0.1rem' }}>{pick(c, 'role', lang)}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gold)', marginTop: '0.3rem', fontFamily: 'monospace' }}>{c.phone}</div>
            </div>
            <a href={contactLink(c)} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(201,171,114,.08)', border: '1px solid rgba(201,171,114,.25)', color: 'var(--gold)', padding: '0.5rem 0.9rem', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {c.is_whatsapp ? 'WhatsApp' : (t('chiama', lang))}
            </a>
          </div>
        ))}

        <span style={{ fontSize: '0.58rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--gold)', display: 'block', margin: '1.5rem 0 0.8rem' }}>
          {t('numeriEmergenza', lang)}
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
          {emergency.map((e, idx) => (
            <div key={idx} style={{ background: 'rgba(140,74,74,.08)', border: '1px solid rgba(140,74,74,.22)', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', marginBottom: '0.4rem' }}>{ICON_MAP[e.icon] || '📞'}</div>
              <div style={{ fontSize: '0.68rem', fontWeight: 300, color: 'var(--salt-dim)', marginBottom: '0.25rem' }}>{pick(e, 'name', lang)}</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', color: '#b8483f' }}>{e.num}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const ICON_MAP = { medical: '🚑', fire: '🚒', police: '🚓', hospital: '🏥' }
