import { useState } from 'react'
import { sb } from '../../lib/supabase'

const BRAND = {
  lavaDeep:  '#0d2b33',
  lavaMid:   '#14424f',
  goldWarm:  '#e7b682',
  goldDim:   '#c49a5f',
  salt:      '#f6efe2',
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=Jost:wght@200;300;400;500&display=swap');
  .collab-login-wrap {
    min-height: 100vh;
    background: ${BRAND.lavaDeep};
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    font-family: 'Jost', sans-serif;
  }
  .collab-login-card {
    background: ${BRAND.lavaMid};
    border: 1px solid rgba(231,182,130,0.25);
    border-radius: 4px;
    padding: 3rem 2.5rem;
    width: 100%;
    max-width: 420px;
    text-align: center;
  }
  .collab-login-wordmark {
    font-family: 'Cormorant Garamond', serif;
    font-size: 2rem;
    font-weight: 300;
    color: ${BRAND.goldWarm};
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 0.25rem;
  }
  .collab-login-subtitle {
    font-family: 'Jost', sans-serif;
    font-size: 0.75rem;
    font-weight: 200;
    color: rgba(246,239,226,0.55);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    margin-bottom: 2.5rem;
  }
  .collab-login-label {
    display: block;
    font-size: 0.7rem;
    font-weight: 400;
    color: rgba(246,239,226,0.6);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    text-align: left;
    margin-bottom: 0.5rem;
  }
  .collab-login-input {
    width: 100%;
    box-sizing: border-box;
    padding: 0.75rem 1rem;
    background: rgba(13,43,51,0.6);
    border: 1px solid rgba(231,182,130,0.3);
    border-radius: 2px;
    color: ${BRAND.salt};
    font-family: 'Jost', sans-serif;
    font-size: 0.95rem;
    font-weight: 300;
    outline: none;
    transition: border-color 0.2s;
    margin-bottom: 1.5rem;
  }
  .collab-login-input:focus {
    border-color: ${BRAND.goldWarm};
  }
  .collab-login-btn {
    width: 100%;
    padding: 0.9rem 1rem;
    background: ${BRAND.goldWarm};
    color: ${BRAND.lavaDeep};
    border: none;
    border-radius: 2px;
    font-family: 'Jost', sans-serif;
    font-size: 0.8rem;
    font-weight: 500;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.2s;
  }
  .collab-login-btn:hover:not(:disabled) {
    background: ${BRAND.goldDim};
  }
  .collab-login-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .collab-login-msg {
    margin-top: 1.5rem;
    font-size: 0.85rem;
    font-weight: 300;
    line-height: 1.6;
  }
  .collab-login-msg.success {
    color: #a8d5b5;
  }
  .collab-login-msg.error {
    color: #e8a598;
  }
  .collab-login-divider {
    border: none;
    border-top: 1px solid rgba(231,182,130,0.15);
    margin: 2rem 0 1.5rem;
  }
  .collab-login-hint {
    font-size: 0.75rem;
    font-weight: 200;
    color: rgba(246,239,226,0.35);
    line-height: 1.6;
  }
`

export default function CollaboratoriLogin() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState(null)

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    setLoading(true)
    setMsg(null)
    const { error } = await sb.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: `${window.location.origin}/collaboratori/dashboard` },
    })
    setLoading(false)
    if (error) {
      setMsg({ type: 'error', text: "Errore nell'invio. Controlla l'indirizzo email." })
    } else {
      setMsg({ type: 'success', text: 'Link inviato! Controlla la tua email e clicca il link per accedere.' })
    }
  }

  return (
    <>
      <style>{css}</style>
      <div className="collab-login-wrap">
        <div className="collab-login-card">
          <div className="collab-login-wordmark">Caellitta</div>
          <div className="collab-login-subtitle">Area Collaboratori</div>
          {msg?.type !== 'success' && (
            <>
              <label className="collab-login-label">La tua email</label>
              <input
                className="collab-login-input"
                type="email"
                placeholder="nome@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                disabled={loading}
                autoFocus
              />
              <button
                className="collab-login-btn"
                onClick={handleSend}
                disabled={loading || !email.trim()}
              >
                {loading ? 'Invio in corso…' : 'Invia link di accesso'}
              </button>
            </>
          )}
          {msg && <p className={`collab-login-msg ${msg.type}`}>{msg.text}</p>}
          <hr className="collab-login-divider" />
          <p className="collab-login-hint">
            Accesso riservato ai collaboratori autorizzati.<br />
            Riceverai un link sicuro via email — nessuna password richiesta.
          </p>
        </div>
      </div>
    </>
  )
}
