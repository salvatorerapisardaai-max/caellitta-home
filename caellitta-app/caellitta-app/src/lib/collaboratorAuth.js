// Accesso collaboratori tramite codice personale (niente più email/magic-link):
// il codice viene verificato via RPC e tenuto in localStorage sul dispositivo.
const STORAGE_KEY = 'caellitta_collab_code'

export function getStoredCode() {
  return localStorage.getItem(STORAGE_KEY) || ''
}

export function setStoredCode(code) {
  localStorage.setItem(STORAGE_KEY, code)
}

export function clearStoredCode() {
  localStorage.removeItem(STORAGE_KEY)
}
