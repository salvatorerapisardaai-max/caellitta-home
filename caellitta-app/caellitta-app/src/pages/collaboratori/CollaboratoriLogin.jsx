import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sb } from '../../lib/supabase'
import { setStoredCode } from '../../lib/collaboratorAuth'

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
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState(null)
  const navigate = useNavigate()

  const handleAccess = async () => {
    const trimmed = code.trim()
    if (!trimmed) return
    setLoading(true)
    setMsg(null)
    const { data, error } = await sb.rpc('validate_collaborator_code', { p_code: trimmed })
    setLoading(false)
    if (error || !data?.[0]) {
      setMsg({ type: 'error', text: 'Codice non valido. Controlla e riprova.' })
      return
    }
    setStoredCode(trimmed.toUpperCase())
    navigate('/collaboratori/dashboard')
  }

  return (
    <>
      <style>{css}</style>
      <div className="collab-login-wrap">
        <div className="collab-login-card">
          <div className="collab-login-wordmark">Caellitta</div>
          <div className="collab-login-subtitle">Area Collaboratori</div>
          <label className="collab-login-label">Codice di accesso</label>
          <input
            className="collab-login-input"
            style={{ fontFamily: 'monospace', letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center' }}
            placeholder="ES. A1B2C3D4"
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAccess()}
            disabled={loading}
            autoFocus
          />
          <button
            className="collab-login-btn"
            onClick={handleAccess}
            disabled={loading || !code.trim()}
          >
            {loading ? 'Verifica…' : 'Accedi'}
          </button>
          {msg && <p className={`collab-login-msg ${msg.type}`}>{msg.text}</p>}
          <hr className="collab-login-divider" />
          <p className="collab-login-hint">
            Accesso riservato ai collaboratori autorizzati.<br />
            Il codice ti viene fornito da Salvatore — nessuna email richiesta.
          </p>
        </div>
      </div>
    </>
  )
}
