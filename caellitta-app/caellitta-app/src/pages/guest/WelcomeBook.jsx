import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sb } from '../../lib/supabase'

const CHAPTERS = [
  { id: 'welcome',   icon: '🏠', label: 'Benvenuto' },
  { id: 'casa',      icon: '🔑', label: 'La casa' },
  { id: 'regole',    icon: '📋', label: 'Regole' },
  { id: 'esperienze',icon: '🌊', label: 'Esperienze' },
  { id: 'coupon',    icon: '🎁', label: 'Coupon' },
  { id: 'contatti',  icon: '💬', label: 'Contatti' },
]

export default function WelcomeBook() {
  const { code }  = useParams()
  const navigate  = useNavigate()
  const [booking, setBooking]   = useState(null)
  const [coupons, setCoupons]   = useState([])
  const [chapter, setChapter]   = useState('welcome')
  const [loading, setLoading]   = useState(true)
  const [wifiShown, setWifiShown] = useState(false)
  const [copied, setCopied]     = useState(false)

  useEffect(() => {
    load()
  }, [code])

  async function load() {
    const { data: b } = await sb.from('bookings')
      .select('*').eq('code', code).single()
    if (!b) { navigate('/ospite'); return }
    setBooking(b)

    const { data: gc } = await sb.from('guest_coupons')
      .select('*, coupon_templates(*)')
      .eq('booking_id', b.id)
    setCoupons(gc || [])
    setLoading(false)
  }

  async function useCoupon(id) {
    await sb.from('guest_coupons').update({ used_at: new Date().toISOString() }).eq('id', id)
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, used_at: new Date().toISOString() } : c))
  }

  function copyText(text, cb) {
    navigator.clipboard.writeText(text)
    cb(true); setTimeout(() => cb(false), 1500)
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--lava)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ fontFamily:"'Cormorant Garamond',serif", color:'var(--gold)', fontSize:'1.2rem', fontStyle:'italic' }}>
        Caricamento…
      </div>
    </div>
  )

  const ci = new Date(booking.check_in).toLocaleDateString('it-IT', { day:'numeric', month:'long', year:'numeric' })
  const co = new Date(booking.check_out).toLocaleDateString('it-IT', { day:'numeric', month:'long', year:'numeric' })

  return (
    <div style={{ minHeight:'100vh', background:'var(--lava)', paddingBottom: 80, position:'relative' }}>

      {/* PROGRESS BAR (placeholder) */}
      <div style={{ position:'fixed', top:0, left:0, height:2, background:'var(--gold)', zIndex:8000, width:'30%' }} />

      {/* CONTENT */}
      <div style={{ maxWidth: 700, margin:'0 auto', padding:'0 0 2rem' }}>
        {chapter === 'welcome' && <ChWelcome booking={booking} ci={ci} co={co} wifiShown={wifiShown} setWifiShown={setWifiShown} copyText={copyText} />}
        {chapter === 'casa' && <ChCasa />}
        {chapter === 'regole' && <ChRegole />}
        {chapter === 'esperienze' && <ChEsperienze setChapter={setChapter} />}
        {chapter === 'coupon' && <ChCoupon coupons={coupons} useCoupon={useCoupon} />}
        {chapter === 'contatti' && <ChContatti />}
      </div>

      {/* BOTTOM NAV */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:7000,
        background:'rgba(10,8,7,.96)', backdropFilter:'blur(18px)',
        borderTop:'1px solid var(--gold-dim)',
        display:'flex', overflowX:'auto', padding:'0 0.3rem',
        scrollbarWidth:'none',
      }}>
        {CHAPTERS.map(ch => (
          <button key={ch.id} onClick={() => setChapter(ch.id)} style={{
            flex:'0 0 auto', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            gap:'0.22rem', padding:'0.7rem 0.9rem', cursor:'pointer',
            border:'none', background:'transparent',
            color: chapter === ch.id ? 'var(--gold)' : 'rgba(240,235,225,.28)',
            minWidth: 56, transition:'color .22s', position:'relative',
          }}>
            <span style={{ fontSize:'1.1rem' }}>{ch.icon}</span>
            <span style={{ fontSize:'0.48rem', letterSpacing:'0.08em', textTransform:'uppercase', whiteSpace:'nowrap' }}>{ch.label}</span>
            {ch.id === 'coupon' && coupons.filter(c=>!c.used_at).length > 0 && (
              <span style={{ position:'absolute', top:6, right:8, width:8, height:8, background:'var(--gold)', borderRadius:'50%' }} />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── CHAPTERS ──────────────────────────────────────────────────────────────

function ChWelcome({ booking, ci, co, wifiShown, setWifiShown, copyText }) {
  const [netCopied, setNetCopied] = useState(false)
  const [pwdCopied, setPwdCopied] = useState(false)
  return (
    <div>
      {/* HERO */}
      <div style={{ minHeight:'62vw', maxHeight:320, display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'1.8rem 1.5rem 1.5rem', position:'relative', overflow:'hidden', background:'linear-gradient(155deg,#0c1e2e 0%,#13100e 70%)' }}>
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(201,171,114,.2)', flexDirection:'column', gap:'0.5rem' }}>
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <span style={{ fontSize:'0.58rem', letterSpacing:'0.25em', textTransform:'uppercase' }}>Foto di benvenuto</span>
        </div>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(19,16,14,.96) 0%,rgba(19,16,14,.2) 100%)' }} />
        <p style={{ position:'relative', zIndex:2, fontSize:'0.58rem', letterSpacing:'0.38em', textTransform:'uppercase', color:'var(--gold)', marginBottom:'0.5rem' }}>Caellitta Home · Aci Castello</p>
        <h1 style={{ position:'relative', zIndex:2, fontFamily:"'Cormorant Garamond',serif", fontSize:'clamp(2rem,9vw,2.8rem)', fontWeight:300, lineHeight:1.05 }}>
          Benvenuto<br/><em style={{ fontStyle:'italic', color:'var(--gold)' }}>a casa tua.</em>
        </h1>
      </div>

      <div style={{ padding:'0 1.5rem' }}>
        <div style={{ width:28, height:1, background:'var(--gold)', opacity:.55, margin:'1.5rem 0' }} />

        <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.05rem', fontWeight:300, lineHeight:1.85, color:'rgba(240,235,225,.75)', marginBottom:'1rem' }}>
          Siamo felici di averti qui. Caellitta Home è nata per essere vissuta — non solo abitata. Il mare sotto, il castello di lava alle spalle, il profumo di zagara nell'aria. Questo spazio è tuo.
        </p>
        <p style={{ fontSize:'0.75rem', fontWeight:200, color:'rgba(240,235,225,.28)', fontStyle:'italic', lineHeight:1.85 }}>
          We are glad to have you here. Caellitta Home was built to be lived — not just occupied.
        </p>

        <div style={{ width:28, height:1, background:'var(--gold)', opacity:.55, margin:'1.5rem 0' }} />

        {/* Booking info */}
        <span style={{ fontSize:'0.58rem', letterSpacing:'0.35em', textTransform:'uppercase', color:'var(--gold)', display:'block', marginBottom:'0.7rem' }}>Il tuo soggiorno</span>
        <div style={{ background:'var(--lava-card)', border:'1px solid var(--gold-dim)', padding:'1.2rem 1.3rem', marginBottom:'0.75rem', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,var(--gold),transparent)' }} />
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.05rem', marginBottom:'0.4rem' }}>{booking.guest_name}</div>
          <div style={{ fontSize:'0.78rem', color:'var(--salt-dim)', lineHeight:1.8 }}>
            Check-in: <strong style={{ color:'var(--gold)' }}>{ci}</strong> &nbsp;·&nbsp;
            Check-out: <strong style={{ color:'var(--gold)' }}>{co}</strong>
          </div>
          <div style={{ fontFamily:'monospace', fontSize:'0.72rem', color:'rgba(201,171,114,.6)', marginTop:'0.4rem' }}>{booking.code}</div>
        </div>

        {/* WiFi */}
        <div style={{ background:'var(--lava-card)', border:'1px solid var(--gold-dim)', padding:'1.2rem 1.3rem', marginBottom:'0.75rem' }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.05rem', marginBottom:'0.8rem' }}>🌐 WiFi</div>
          <div style={{ background:'rgba(201,171,114,.06)', border:'1px solid rgba(201,171,114,.18)', padding:'0.8rem 1rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.4rem 0', borderBottom:'1px solid var(--gold-dim)' }}>
              <span style={{ fontSize:'0.6rem', letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(240,235,225,.28)' }}>Rete</span>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <span style={{ fontFamily:'monospace', fontSize:'0.78rem', color:'var(--gold)' }}>Caellitta_Home</span>
                <button onClick={() => copyText('Caellitta_Home', setNetCopied)} style={{ background:'transparent', border:'1px solid rgba(201,171,114,.28)', color: netCopied ? '#7dcca0' : 'var(--gold)', fontSize:'0.55rem', letterSpacing:'0.15em', textTransform:'uppercase', padding:'0.25rem 0.55rem', cursor:'pointer' }}>
                  {netCopied ? 'Copiato' : 'Copia'}
                </button>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.4rem 0' }}>
              <span style={{ fontSize:'0.6rem', letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(240,235,225,.28)' }}>Password</span>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <span style={{ fontFamily:'monospace', fontSize:'0.78rem', color:'var(--gold)' }}>{wifiShown ? 'caellitta2025' : '••••••••••••'}</span>
                <button onClick={() => setWifiShown(!wifiShown)} style={{ background:'transparent', border:'1px solid rgba(201,171,114,.28)', color:'var(--gold)', fontSize:'0.55rem', letterSpacing:'0.15em', textTransform:'uppercase', padding:'0.25rem 0.55rem', cursor:'pointer' }}>
                  {wifiShown ? 'Nascondi' : 'Mostra'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Orari */}
        <div style={{ background:'var(--lava-card)', border:'1px solid var(--gold-dim)', padding:'1.2rem 1.3rem' }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.05rem', marginBottom:'0.4rem' }}>🕐 Orari</div>
          <div style={{ fontSize:'0.78rem', color:'var(--salt-dim)' }}>
            Check-in dalle <strong style={{ color:'var(--gold)' }}>15:00</strong> &nbsp;·&nbsp;
            Check-out entro le <strong style={{ color:'var(--gold)' }}>10:30</strong>
          </div>
          <div style={{ fontSize:'0.7rem', color:'rgba(240,235,225,.28)', fontStyle:'italic', marginTop:'0.3rem' }}>
            Check-in from 3:00 PM · Check-out by 10:30 AM
          </div>
        </div>
      </div>
    </div>
  )
}

function ChCasa() {
  return (
    <div>
      <div style={{ minHeight:'55vw', maxHeight:280, display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'1.8rem 1.5rem 1.5rem', position:'relative', background:'linear-gradient(135deg,#1a3040 0%,#13100e 100%)' }}>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(19,16,14,.95) 0%,rgba(19,16,14,.15) 100%)' }} />
        <p style={{ position:'relative', zIndex:2, fontSize:'0.58rem', letterSpacing:'0.38em', textTransform:'uppercase', color:'var(--gold)', marginBottom:'0.5rem' }}>Info pratiche</p>
        <h2 style={{ position:'relative', zIndex:2, fontFamily:"'Cormorant Garamond',serif", fontSize:'clamp(1.8rem,8vw,2.5rem)', fontWeight:300, lineHeight:1.05 }}>
          La <em style={{ fontStyle:'italic', color:'var(--gold)' }}>tua casa</em>
        </h2>
      </div>
      <div style={{ padding:'0 1.5rem' }}>
        <div style={{ width:28, height:1, background:'var(--gold)', opacity:.55, margin:'1.5rem 0' }} />
        {[
          { icon:'🔑', title:'Accesso', text:'Cassettina codice a sinistra del portone. Il codice ti è stato comunicato via WhatsApp.' },
          { icon:'🅿️', title:'Parcheggio', text:'Parcheggio gratuito in zona. Via [__] — a 2 minuti a piedi dalla casa.' },
          { icon:'🏠', title:'Piano', text:'Appartamento al 2° piano. Ascensore disponibile.' },
          { icon:'🧺', title:'Biancheria', text:'Lenzuola e asciugamani puliti in ogni camera. Cambio biancheria su richiesta.' },
          { icon:'🍳', title:'Cucina', text:'Completamente attrezzata: pentole, stoviglie, caffettiera, microonde, forno.' },
          { icon:'☀️', title:'Terrazza', text:'Tavolo e sedie disponibili. Perfetta per colazione e aperitivo.' },
        ].map(item => (
          <div key={item.title} style={{ background:'var(--lava-card)', border:'1px solid var(--gold-dim)', padding:'1.1rem 1.3rem', marginBottom:'0.65rem', display:'flex', gap:'1rem', alignItems:'flex-start' }}>
            <span style={{ fontSize:'1.1rem', flexShrink:0 }}>{item.icon}</span>
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1rem', marginBottom:'0.3rem' }}>{item.title}</div>
              <div style={{ fontSize:'0.78rem', color:'var(--salt-dim)', lineHeight:1.7, fontWeight:200 }}>{item.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChRegole() {
  const rules = [
    { icon:'🔇', title:'Silenzio notturno', text:'Rispetto del silenzio dalla sera. I vicini ringraziano.' },
    { icon:'🚭', title:'No fumo in casa', text:'Consentito solo in terrazza, con le dovute attenzioni.' },
    { icon:'🐾', title:'Animali', text:'Benvenuti solo se concordato anticipatamente.' },
    { icon:'🗑', title:'Raccolta differenziata', text:'Umido, plastica, carta, vetro. Calendario raccolta in bacheca.' },
    { icon:'🏡', title:'Cura degli spazi', text:'Ti chiediamo di lasciare la casa nelle stesse condizioni in cui l\'hai trovata.' },
    { icon:'💧', title:'Acqua', text:'Evita sprechi. L\'acqua è un bene prezioso in Sicilia.' },
  ]
  return (
    <div>
      <div style={{ minHeight:'45vw', maxHeight:240, display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'1.8rem 1.5rem 1.5rem', position:'relative', background:'linear-gradient(135deg,#1a1a2e 0%,#13100e 100%)' }}>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(19,16,14,.95) 0%,rgba(19,16,14,.15) 100%)' }} />
        <p style={{ position:'relative', zIndex:2, fontSize:'0.58rem', letterSpacing:'0.38em', textTransform:'uppercase', color:'var(--gold)', marginBottom:'0.5rem' }}>Vivere bene insieme</p>
        <h2 style={{ position:'relative', zIndex:2, fontFamily:"'Cormorant Garamond',serif", fontSize:'clamp(1.8rem,8vw,2.5rem)', fontWeight:300, lineHeight:1.05 }}>
          Regole della <em style={{ fontStyle:'italic', color:'var(--gold)' }}>casa</em>
        </h2>
      </div>
      <div style={{ padding:'0 1.5rem' }}>
        <div style={{ width:28, height:1, background:'var(--gold)', opacity:.55, margin:'1.5rem 0' }} />
        <ul style={{ listStyle:'none' }}>
          {rules.map(r => (
            <li key={r.title} style={{ display:'flex', gap:'1rem', alignItems:'flex-start', padding:'0.8rem 0', borderBottom:'1px solid var(--gold-dim)', fontSize:'0.8rem', fontWeight:200, color:'var(--salt-dim)', lineHeight:1.65 }}>
              <span style={{ fontSize:'0.9rem', flexShrink:0, marginTop:'0.05rem' }}>{r.icon}</span>
              <div>
                <strong style={{ color:'var(--salt)', fontWeight:400 }}>{r.title}</strong>
                <br/>{r.text}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function ChEsperienze({ setChapter }) {
  const places = [
    { color:'#2a5f7a', tag:'🌊 Mare', name:'Lido convenzionato', desc:'A 5 minuti a piedi. Ingresso agevolato per gli ospiti Caellitta. Lettino e ombrellone inclusi.', pills:['5 min a piedi','Ingresso agevolato'] },
    { color:'⛵', tag:'⛵ Barca', name:'Giro delle Isole Ciclopi', desc:'Escursione in barca con il nostro partner. Scopri le grotte marine e i fondali cristallini. Disponibile mattino e pomeriggio.', pills:['Prenotabile via WhatsApp','Coupon incluso'] },
    { color:'🌋', tag:'🌋 Etna', name:'Tour dell\'Etna', desc:'Escursione guidata sull\'Etna con il nostro partner locale. Partenza e rientro dalla casa.', pills:['Guida locale','Coupon incluso'] },
    { color:'#c9ab72', tag:'🍽 Ristorante', name:'Da inserire', desc:'Il nostro ristorante del cuore. Cucina siciliana autentica, vista sul mare. Coupon sconto incluso per gli ospiti.', pills:['Coupon 10%','Prenotazione consigliata'] },
  ]
  return (
    <div>
      <div style={{ minHeight:'45vw', maxHeight:240, display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'1.8rem 1.5rem 1.5rem', position:'relative', background:'linear-gradient(135deg,#0c2e1e 0%,#13100e 100%)' }}>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(19,16,14,.95) 0%,rgba(19,16,14,.15) 100%)' }} />
        <p style={{ position:'relative', zIndex:2, fontSize:'0.58rem', letterSpacing:'0.38em', textTransform:'uppercase', color:'var(--gold)', marginBottom:'0.5rem' }}>I nostri preferiti</p>
        <h2 style={{ position:'relative', zIndex:2, fontFamily:"'Cormorant Garamond',serif", fontSize:'clamp(1.8rem,8vw,2.5rem)', fontWeight:300, lineHeight:1.05 }}>
          Esperienze da <em style={{ fontStyle:'italic', color:'var(--gold)' }}>vivere</em>
        </h2>
      </div>
      <div style={{ padding:'0 1.5rem' }}>
        <div style={{ width:28, height:1, background:'var(--gold)', opacity:.55, margin:'1.5rem 0' }} />
        {places.map((p, i) => (
          <div key={i} style={{ background:'var(--lava-card)', border:'1px solid var(--gold-dim)', marginBottom:'0.75rem', overflow:'hidden', display:'flex' }}>
            <div style={{ width:3, background:'var(--gold)', flexShrink:0 }} />
            <div style={{ padding:'1.1rem 1.2rem', flex:1 }}>
              <div style={{ fontSize:'0.55rem', letterSpacing:'0.22em', textTransform:'uppercase', color:'var(--gold)', marginBottom:'0.25rem' }}>{p.tag}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', marginBottom:'0.3rem' }}>{p.name}</div>
              <div style={{ fontSize:'0.76rem', color:'var(--salt-dim)', lineHeight:1.72, fontWeight:200 }}>{p.desc}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', marginTop:'0.8rem' }}>
                {p.pills.map(pill => (
                  <span key={pill} style={{ fontSize:'0.6rem', letterSpacing:'0.1em', color:'rgba(201,171,114,.6)', background:'rgba(201,171,114,.06)', border:'1px solid rgba(201,171,114,.15)', padding:'0.22rem 0.6rem' }}>
                    {pill}
                  </span>
                ))}
              </div>
              {(p.pills.some(pl => pl.includes('Coupon'))) && (
                <button onClick={() => setChapter('coupon')} style={{ marginTop:'0.85rem', fontSize:'0.6rem', letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--lava)', background:'var(--gold)', border:'none', padding:'0.38rem 0.85rem', cursor:'pointer' }}>
                  Vedi coupon →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChCoupon({ coupons, useCoupon }) {
  const ICONS = { Ristorante:'🍽', Barca:'⛵', Etna:'🌋', Mare:'🌊', Bar:'☕', Altro:'🎁' }

  return (
    <div>
      <div style={{ minHeight:'45vw', maxHeight:240, display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'1.8rem 1.5rem 1.5rem', position:'relative', background:'linear-gradient(135deg,#2e1a0c 0%,#13100e 100%)' }}>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(19,16,14,.95) 0%,rgba(19,16,14,.15) 100%)' }} />
        <p style={{ position:'relative', zIndex:2, fontSize:'0.58rem', letterSpacing:'0.38em', textTransform:'uppercase', color:'var(--gold)', marginBottom:'0.5rem' }}>Esclusivo per te</p>
        <h2 style={{ position:'relative', zIndex:2, fontFamily:"'Cormorant Garamond',serif", fontSize:'clamp(1.8rem,8vw,2.5rem)', fontWeight:300, lineHeight:1.05 }}>
          I tuoi <em style={{ fontStyle:'italic', color:'var(--gold)' }}>coupon</em>
        </h2>
      </div>

      <div style={{ padding:'0 1.5rem' }}>
        <div style={{ width:28, height:1, background:'var(--gold)', opacity:.55, margin:'1.5rem 0' }} />

        {coupons.length === 0 ? (
          <div style={{ background:'var(--lava-card)', border:'1px solid var(--gold-dim)', padding:'2rem', textAlign:'center' }}>
            <div style={{ fontSize:'2rem', marginBottom:'0.8rem' }}>🎁</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', marginBottom:'0.5rem' }}>Nessun coupon ancora</div>
            <div style={{ fontSize:'0.78rem', color:'var(--salt-faint)', lineHeight:1.8, fontWeight:200 }}>
              I tuoi coupon saranno disponibili a breve. Scrivi su WhatsApp se hai dubbi.
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize:'0.58rem', letterSpacing:'0.35em', textTransform:'uppercase', color:'var(--gold)', marginBottom:'0.9rem' }}>
              {coupons.filter(c=>!c.used_at).length} coupon disponibili · {coupons.filter(c=>c.used_at).length} utilizzati
            </div>
            {coupons.map(c => {
              const t = c.coupon_templates
              const used = !!c.used_at
              const cat = t?.category || 'Altro'
              const icon = ICONS[cat] || '🎁'
              const discount = t?.discount_type === 'percent' ? `${t.discount_value}% di sconto` : t?.discount_type === 'fixed' ? `€${t.discount_value} di sconto` : t?.description
              return (
                <div key={c.id} style={{
                  background: used ? 'rgba(240,235,225,.03)' : 'var(--lava-card)',
                  border: `1px solid ${used ? 'rgba(201,171,114,.08)' : 'var(--gold-dim)'}`,
                  padding:'1.3rem', marginBottom:'0.75rem', overflow:'hidden', position:'relative',
                  opacity: used ? 0.5 : 1,
                }}>
                  {!used && <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,var(--gold),transparent)' }} />}
                  <div style={{ fontSize:'0.55rem', letterSpacing:'0.22em', textTransform:'uppercase', color:'var(--gold)', marginBottom:'0.35rem' }}>{icon} {cat}</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.2rem', marginBottom:'0.3rem' }}>{t?.name}</div>
                  <div style={{ fontSize:'0.76rem', color:'var(--salt-dim)', lineHeight:1.72, fontWeight:200, marginBottom:'0.8rem' }}>{t?.description}</div>
                  <div style={{ fontFamily:'monospace', fontSize:'0.8rem', color: used ? 'rgba(201,171,114,.3)' : 'var(--gold)', textDecoration: used ? 'line-through' : 'none', marginBottom:'0.8rem' }}>
                    {discount}
                  </div>
                  <div style={{ fontFamily:'monospace', fontSize:'0.72rem', background:'rgba(201,171,114,.08)', color:'var(--gold)', padding:'0.35rem 0.75rem', display:'inline-block', marginBottom:'0.8rem', letterSpacing:'0.08em' }}>
                    {c.code}
                  </div>
                  {used ? (
                    <div style={{ fontSize:'0.6rem', letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--salt-faint)', padding:'0.4rem 0' }}>
                      ✓ Utilizzato il {new Date(c.used_at).toLocaleDateString('it-IT')}
                    </div>
                  ) : (
                    <button onClick={() => { if(confirm('Segnare questo coupon come utilizzato?')) useCoupon(c.id) }} style={{
                      width:'100%', padding:'0.55rem', border:'1px solid rgba(201,171,114,.3)',
                      background:'transparent', color:'rgba(240,235,225,.7)',
                      fontFamily:'Jost,sans-serif', fontSize:'0.65rem', letterSpacing:'0.15em',
                      textTransform:'uppercase', cursor:'pointer', transition:'all .2s',
                    }}
                      onMouseEnter={e=>{ e.target.style.background='rgba(201,171,114,.08)'; e.target.style.color='var(--gold)' }}
                      onMouseLeave={e=>{ e.target.style.background='transparent'; e.target.style.color='rgba(240,235,225,.7)' }}
                    >
                      Segna come utilizzato
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

function ChContatti() {
  return (
    <div>
      <div style={{ minHeight:'40vw', maxHeight:220, display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'1.8rem 1.5rem 1.5rem', position:'relative', background:'linear-gradient(135deg,#1e1a10 0%,#13100e 100%)' }}>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(19,16,14,.95) 0%,rgba(19,16,14,.15) 100%)' }} />
        <p style={{ position:'relative', zIndex:2, fontSize:'0.58rem', letterSpacing:'0.38em', textTransform:'uppercase', color:'var(--gold)', marginBottom:'0.5rem' }}>Siamo qui per te</p>
        <h2 style={{ position:'relative', zIndex:2, fontFamily:"'Cormorant Garamond',serif", fontSize:'clamp(1.8rem,8vw,2.5rem)', fontWeight:300, lineHeight:1.05 }}>
          Contatti & <em style={{ fontStyle:'italic', color:'var(--gold)' }}>emergenze</em>
        </h2>
      </div>
      <div style={{ padding:'0 1.5rem' }}>
        <div style={{ width:28, height:1, background:'var(--gold)', opacity:.55, margin:'1.5rem 0' }} />
        {[
          { avatar:'💬', name:'Caellitta Home', role:'WhatsApp · Contatto principale', num:'+39 XXX XXX XXXX', link:'https://wa.me/39' },
          { avatar:'👤', name:'Salvatore / [Nome]', role:'Proprietario', num:'+39 XXX XXX XXXX', link:'tel:+39' },
        ].map(c => (
          <div key={c.name} style={{ background:'var(--lava-card)', border:'1px solid var(--gold-dim)', padding:'1.2rem 1.3rem', marginBottom:'0.75rem', display:'flex', alignItems:'center', gap:'1.2rem' }}>
            <div style={{ width:42, height:42, borderRadius:'50%', background:'rgba(201,171,114,.09)', border:'1px solid rgba(201,171,114,.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0 }}>
              {c.avatar}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1rem' }}>{c.name}</div>
              <div style={{ fontSize:'0.6rem', letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--salt-faint)', marginTop:'0.1rem' }}>{c.role}</div>
              <div style={{ fontSize:'0.78rem', color:'var(--gold)', marginTop:'0.3rem', fontFamily:'monospace' }}>{c.num}</div>
            </div>
            <a href={c.link} style={{ background:'rgba(201,171,114,.08)', border:'1px solid rgba(201,171,114,.25)', color:'var(--gold)', padding:'0.5rem 0.9rem', fontSize:'0.6rem', letterSpacing:'0.15em', textTransform:'uppercase', textDecoration:'none', whiteSpace:'nowrap' }}>
              Chiama
            </a>
          </div>
        ))}

        <span style={{ fontSize:'0.58rem', letterSpacing:'0.35em', textTransform:'uppercase', color:'var(--gold)', display:'block', margin:'1.5rem 0 0.8rem' }}>Numeri di emergenza</span>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.65rem' }}>
          {[['🚑','Emergenze','118'],['🚒','Vigili del fuoco','115'],['🚓','Carabinieri','112'],['🏥','Pronto soccorso','—']].map(([icon,name,num]) => (
            <div key={name} style={{ background:'rgba(140,74,74,.08)', border:'1px solid rgba(140,74,74,.22)', padding:'1rem', textAlign:'center' }}>
              <div style={{ fontSize:'1.3rem', marginBottom:'0.4rem' }}>{icon}</div>
              <div style={{ fontSize:'0.68rem', fontWeight:300, color:'rgba(240,235,225,.7)', marginBottom:'0.25rem' }}>{name}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.1rem', color:'#e08080' }}>{num}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
