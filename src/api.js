// API client for the NPC e-CRVS backend (medical practitioner endpoints).
// Set VITE_API_URL in .env (e.g. https://api.example.gov.ng). If unset, an in-memory mock is used.
const BASE = import.meta.env.VITE_API_URL || ''
export const MOCK = !BASE
let token = sessionStorage.getItem('crvs_token') || ''
export const setToken = t => { token = t || ''; t ? sessionStorage.setItem('crvs_token', t) : sessionStorage.removeItem('crvs_token') }
export const hasToken = () => !!token

const db = { events: [] }
const wait = ms => new Promise(r => setTimeout(r, ms))
const mock = async (method, path, body) => {
  await wait(350)
  if (path === '/auth/login') return { access_token: 'mock-token' }
  if (path === '/auth/mfa/enroll') return { secret: 'JBSWY3DPEHPK3PXP' }
  if (path === '/auth/mfa/activate') return { ok: true }
  if (path === '/auth/me') return { role: 'MEDICAL_PRACTITIONER', name: 'Dr. Demo Practitioner' }
  if (path.startsWith('/citizens/lookup')) return { nin: '12345678901', crn: 'CRN-0001', first_name: 'Adewale', last_name: 'Okafor' }
  if (path === '/identity/verify-nin') return { first_name: 'Adewale', last_name: 'Okafor', date_of_birth: '1951-04-09', gender: 'Male' }
  if (path === '/ai/cause-of-death/suggest') return { suggestions: [
    { code: 'BA41.0', title: 'Acute myocardial infarction', confidence: 0.82, rationale: 'Chest pain and sudden collapse described.' },
    { code: 'BA80', title: 'Cardiac arrest', confidence: 0.55, rationale: 'Unwitnessed collapse without resuscitation.' },
    { code: 'CB03', title: 'Pulmonary embolism', confidence: 0.21, rationale: 'Possible, but no leg swelling noted.' }] }
  if (path.startsWith('/centers')) return [{ id: 'c1', name: 'Riverside General Hospital' }, { id: 'c2', name: 'Wellness PHC' }]
  if (path === '/registrations/deaths') { const e = { event_id: 'EVT-' + Math.floor(Math.random() * 1e6), status: 'PENDING_VERIFICATION', created_at: new Date().toISOString(), ...body }; db.events.unshift(e); return e }
  if (path === '/registrations/births') { const c = body.child; const e = { event_id: 'EVT-' + Math.floor(Math.random() * 1e6), event_type: 'BIRTH', status: 'PENDING_VERIFICATION', event_date: c.date_of_birth, subject: { first_name: c.first_name, last_name: c.last_name }, created_at: new Date().toISOString() }; db.events.unshift(e); return e }
  if (path === '/registrations') return db.events
  if (path.endsWith('/documents')) return method === 'GET' ? [] : { ok: true }
  throw new Error('Not found')
}

export async function api(method, path, body) {
  if (MOCK) return mock(method, path, body)
  const isForm = body instanceof FormData
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(isForm || !body ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const fields = data.error?.fields?.map(f => `${f.field}: ${f.message}`).join('; ')
    const err = new Error((data.error?.message && fields ? `${data.error.message} ${fields}` : data.error?.message) ||data.detail?.[0]?.msg || data.detail || data.message || `Request failed (${res.status})`)
    err.code = data.error?.code
    throw err
  }
  return data
}
