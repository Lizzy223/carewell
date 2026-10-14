import { useEffect, useState } from 'react'
import * as Icons from 'lucide-react'
import { api, setToken, hasToken, MOCK } from './api.js'

const STEPS = ['Find deceased', 'Cause of death', 'Registration details', 'My submissions']
const BIRTH_STEPS = ['Birth details', 'My submissions']
const PLACES = ['HOSPITAL', 'PHC', 'HOME', 'OTHER']
const DUMMY_FACE = { image_base64: 'RkFLRS1GQUNF', liveness_passed: true } // placeholder avatar, no camera capture
const BIRTH_PLACES = ['HOSPITAL', 'PHC', 'HOME', 'LGA']
const Field = ({ label, children, hint }) => <label className="fld"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>

export default function Portal() {
  const [me, setMe] = useState(null)
  const [step, setStep] = useState(0)
  const [deceased, setDeceased] = useState(null) // verified identity
  const [code, setCode] = useState(null)         // confirmed ICD-11 {code,title}
  const [done, setDone] = useState(null)
  const [kind, setKind] = useState('death')      // 'death' | 'birth'

  useEffect(() => { if (hasToken()) api('GET', '/auth/me').then(setMe).catch(() => setToken('')) }, [])
  const signOut = () => { setToken(''); setMe(null); setKind('death'); setStep(0); setDeceased(null); setCode(null); setDone(null) }
  const reset = () => { setStep(0); setDeceased(null); setCode(null); setDone(null) }
  const pickKind = k => { setKind(k); reset() }
  const steps = kind === 'birth' ? BIRTH_STEPS : STEPS
  const last = steps.length - 1
  const locked = i => kind === 'death' && (i === 1 ? !deceased : i === 2 ? !deceased || !code : false)

  if (!me) return <Shell><SignIn onDone={setMe} /></Shell>
  return (
    <Shell me={me} onOut={signOut}>
      <div className="seg" role="radiogroup" aria-label="Registration type">{[['death', 'Register a death'], ['birth', 'Register a birth']].map(([k, l]) => <button type="button" key={k} role="radio" aria-checked={kind === k} className={kind === k ? 'on' : ''} onClick={() => pickKind(k)}>{l}</button>)}</div>
      <ol className="steps">{steps.map((s, i) => <li key={s} className={i === step ? 'on' : i < step ? 'ok' : ''}><button disabled={locked(i)} onClick={() => setStep(i)}>{s}</button></li>)}</ol>
      {kind === 'death' && step === 0 && <Find onVerified={d => { setDeceased(d); setStep(1) }} />}
      {kind === 'death' && step === 1 && deceased && <Cause deceased={deceased} onConfirm={c => { setCode(c); setStep(2) }} />}
      {kind === 'death' && step === 2 && deceased && code && <Register deceased={deceased} code={code} onDone={e => { setDone(e); setStep(3) }} />}
      {kind === 'birth' && step === 0 && <BirthRegister onDone={e => { setDone(e); setStep(1) }} />}
      {step === last && <Track justDone={done} kind={kind} onNew={reset} />}
    </Shell>
  )
}

const Shell = ({ me, onOut, children }) => (
  <div className="portal"><div className="wrap">
    <div className="p-head"><div><a href="#home" className="back"><Icons.ArrowLeft size={14} /> Back to site</a><h1>Medical practitioner portal</h1>
      <p className="lead">Register a death for the NPC e-CRVS platform. Records go to the NPC officer's verification queue.</p></div>
      {me && <div className="who"><span>{me.name || 'Signed in'}</span><button className="btn btn-outline btn-sm" onClick={onOut}>Sign out</button></div>}</div>
    {MOCK && <p className="note"><Icons.Info size={14} /> Demo mode: no backend connected. Set <code>VITE_API_URL</code> to use the live API.</p>}
    {children}
  </div></div>
)

function SignIn({ onDone }) {
  const [f, setF] = useState({ email: '', password: '', otp: '' })
  const [mfa, setMfa] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const login = async e => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const r = await api('POST', '/auth/login', { email: f.email, password: f.password, otp_code: f.otp }); setToken(r.access_token || r.token)
      const m = await api('GET', '/auth/me')
      if (!String(m.role).toLowerCase().includes('practitioner')) { setToken(''); throw new Error('This account is not a medical practitioner.') }
      onDone(m)
    } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  const enroll = async () => { try { setMfa(await api('POST', '/auth/mfa/enroll', { email: f.email, password: f.password })) } catch (x) { setErr(x.message) } }
  const activate = async () => { try { await api('POST', '/auth/mfa/activate', { email: f.email, password: f.password, otp_code: f.otp }); setMfa(null); setErr('') } catch (x) { setErr(x.message) } }
  return (
    <form className="card p-card narrow" onSubmit={login}>
      <h3>Sign in</h3>
      <Field label="Email"><input type="email" required value={f.email} onChange={set('email')} /></Field>
      <Field label="Password"><input type="password" required value={f.password} onChange={set('password')} /></Field>
      <Field label="MFA code" hint="Multi-factor sign-in is mandatory for staff."><input inputMode="numeric" maxLength={6} required value={f.otp} onChange={set('otp')} /></Field>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn btn-dark" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      {!mfa ? <button type="button" className="link" onClick={enroll}>First time? Set up MFA</button>
        : <div className="mfa"><p>Add this secret to your authenticator app, then enter the 6-digit code above and activate.</p><code>{mfa.secret || mfa.otpauth_url}</code>
          <button type="button" className="btn btn-outline btn-sm" onClick={activate}>Activate MFA</button></div>}
    </form>
  )
}

function Find({ onVerified }) {
  const [kind, setKind] = useState('nin'); const [val, setVal] = useState('')
  const [res, setRes] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const run = async e => {
    e.preventDefault(); setErr(''); setRes(null); setBusy(true)
    try {
      const c = await api('GET', `/citizens/lookup?${kind}=${encodeURIComponent(val.trim())}`)
      const nin = c.nin || val.trim()
      const v = await api('POST', '/identity/verify-nin', { nin })
      setRes({ nin, ...v })
    } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <div className="card p-card narrow">
      <h3>Find the deceased</h3>
      <form onSubmit={run}>
        <div className="seg" role="radiogroup" aria-label="Search by">{['nin', 'crn'].map(k => <button type="button" key={k} role="radio" aria-checked={kind === k} className={kind === k ? 'on' : ''} onClick={() => { setKind(k); setVal('') }}>{k.toUpperCase()}</button>)}</div>
        <Field label={kind === 'nin' ? 'National Identification Number' : 'Civil Registration Number'} hint="Use exactly one identifier."><input required value={val} onChange={e => setVal(e.target.value)} /></Field>
        <button className="btn btn-dark" disabled={busy}>{busy ? 'Checking with NIMC…' : 'Look up and verify'}</button>
      </form>
      {err && <p className="err" role="alert">{err}</p>}
      {res && <div className="verified"><Icons.BadgeCheck size={18} /><div><b>{res.first_name} {res.last_name}</b><small>Born {res.date_of_birth} · {res.gender} · NIMC verified</small></div>
        <button className="btn btn-dark btn-sm" onClick={() => onVerified(res)}>Continue</button></div>}
    </div>
  )
}

function Cause({ deceased, onConfirm }) {
  const [text, setText] = useState(''); const [list, setList] = useState(null); const [pick, setPick] = useState(null)
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const pii = /\b\d{11}\b/.test(text) || (deceased && [deceased.first_name, deceased.last_name].some(n => n && new RegExp(`\\b${n}\\b`, 'i').test(text)))
  const ok = text.trim().length >= 10 && text.length <= 2000 && !pii
  const run = async () => { setErr(''); setBusy(true); setPick(null); try { const r = await api('POST', '/ai/cause-of-death/suggest', { narrative: text }); setList((r.suggestions || r).slice(0, 3)) } catch (x) { setErr(x.message) } finally { setBusy(false) } }
  return (
    <div className="card p-card">
      <h3>Cause of death</h3>
      <p className="muted">Deceased: {deceased?.first_name} {deceased?.last_name}</p>
      <Field label="Clinical narrative" hint={`${text.length}/2000 · 10 characters minimum. Do not include names or NINs.`}><textarea rows={5} value={text} onChange={e => setText(e.target.value)} /></Field>
      {pii && <p className="err">Remove names or 11-digit numbers from the narrative before continuing.</p>}
      <button className="btn btn-dark" disabled={!ok || busy} onClick={run}>{busy ? 'Getting suggestions…' : 'Get ICD-11 suggestions'}</button>
      {err && <p className="err" role="alert">{err}</p>}
      {list && <><p className="muted ai">The AI only suggests. You must confirm the correct code.</p>
        <div className="sugg">{list.map(s => (
          <button key={s.code} className={`card sg ${pick?.code === s.code ? 'on' : ''}`} onClick={() => setPick(s)} aria-pressed={pick?.code === s.code}>
            <b>{s.code}</b><span>{s.title}</span><meter min="0" max="1" value={s.confidence} /><small>{Math.round(s.confidence * 100)}% · {s.rationale}</small></button>))}</div>
        <button className="btn btn-dark" disabled={!pick} onClick={() => onConfirm(pick)}>Confirm {pick ? pick.code : 'code'}</button></>}
    </div>
  )
}

function Register({ deceased, code, onDone }) {
  const [centers, setCenters] = useState([])
  const [f, setF] = useState({ date_of_death: '', time_of_death: '', place_of_death: 'HOSPITAL', state_code: '', lga_code: '', ward: '', registration_center_id: '', geo_latitude: '', geo_longitude: '' })
  const [inf, setInf] = useState({ first_name: '', last_name: '', relationship_to_deceased: '', phone_number: '', nin: '' })
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const set = k => e => setF({ ...f, [k]: e.target.value }); const seti = k => e => setInf({ ...inf, [k]: e.target.value })
  useEffect(() => { api('GET', `/centers${f.state_code ? `?state_code=${f.state_code}` : ''}`).then(setCenters).catch(() => {}) }, [f.state_code])
  const geo = () => navigator.geolocation?.getCurrentPosition(p => setF(x => ({ ...x, geo_latitude: p.coords.latitude, geo_longitude: p.coords.longitude })), () => setErr('Could not read your location. Enter coordinates manually.'))
  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true)
    const clean = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== ''))
    try {
      const r = await api('POST', '/registrations/deaths', { ...clean(f), geo_latitude: +f.geo_latitude, geo_longitude: +f.geo_longitude, deceased_nin: deceased.nin, cause_of_death_icd11: code.code, informant: clean(inf) })
      const files = e.target.elements.files?.files
      if (files?.length) { const fd = new FormData(); fd.append('file', files[0]); await api('POST', `/registrations/${r.event_id}/documents`, fd) }
      onDone(r)
    } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <form className="card p-card" onSubmit={submit}>
      <h3>Registration details</h3>
      <p className="muted">{deceased.first_name} {deceased.last_name} · cause of death <b>{code.code}</b> {code.title}</p>
      <div className="grid2">
        <Field label="Date of death"><input type="date" required value={f.date_of_death} onChange={set('date_of_death')} /></Field>
        <Field label="Time of death (optional)"><input type="time" value={f.time_of_death} onChange={set('time_of_death')} /></Field>
        <Field label="Place of death"><select value={f.place_of_death} onChange={set('place_of_death')}>{PLACES.map(p => <option key={p}>{p}</option>)}</select></Field>
        <Field label="Registration centre"><select required value={f.registration_center_id} onChange={set('registration_center_id')}><option value="">Select a centre</option>{centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="State code"><input required value={f.state_code} onChange={set('state_code')} /></Field>
        <Field label="LGA code"><input required value={f.lga_code} onChange={set('lga_code')} /></Field>
        <Field label="Ward"><input required value={f.ward} onChange={set('ward')} /></Field>
        <Field label="Geo-tag (latitude, longitude)"><div className="row"><input required placeholder="Latitude" value={f.geo_latitude} onChange={set('geo_latitude')} /><input required placeholder="Longitude" value={f.geo_longitude} onChange={set('geo_longitude')} /><button type="button" className="circle" onClick={geo} aria-label="Use my location"><Icons.LocateFixed size={15} /></button></div></Field>
      </div>
      <h4>Informant</h4>
      <div className="grid2">
        <Field label="First name"><input required value={inf.first_name} onChange={seti('first_name')} /></Field>
        <Field label="Last name"><input required value={inf.last_name} onChange={seti('last_name')} /></Field>
        <Field label="Relationship to deceased"><input required value={inf.relationship_to_deceased} onChange={seti('relationship_to_deceased')} /></Field>
        <Field label="Phone (optional)"><input type="tel" value={inf.phone_number} onChange={seti('phone_number')} /></Field>
        <Field label="NIN (optional)"><input value={inf.nin} onChange={seti('nin')} /></Field>
        <Field label="Supporting file (optional)"><input type="file" name="files" /></Field>
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn btn-dark" disabled={busy}>{busy ? 'Submitting…' : 'Submit death registration'}</button>
    </form>
  )
}

function Track({ justDone, kind, onNew }) {
  const [rows, setRows] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { api('GET', '/registrations').then(r => setRows(r.items || r)).catch(x => setErr(x.message)) }, [])
  const noun = kind === 'birth' ? 'birth' : 'death'
  return (
    <div className="card p-card">
      {justDone && <p className="verified"><Icons.CheckCircle2 size={18} /><span>Submitted as <b>{justDone.event_id}</b>. It is now in the NPC officer's verification queue.</span></p>}
      <div className="head-row"><h3>My submissions</h3><button className="btn btn-dark btn-sm" onClick={onNew}>Register another {noun}</button></div>
      {err && <p className="err">{err}</p>}
      {rows && !rows.length && <p className="muted">You haven't submitted any registrations yet.</p>}
      {rows?.length > 0 && <div className="tbl"><table><thead><tr><th>Event</th><th>Type</th><th>Person</th><th>Date</th><th>Cause</th><th>Status</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.event_id}><td>{r.event_id}</td><td>{String(r.event_type || '').toLowerCase()}</td><td>{[r.subject?.first_name, r.subject?.last_name].filter(Boolean).join(' ') || r.deceased_nin || '—'}</td><td>{r.event_date || r.date_of_death}</td><td>{r.cause_of_death_icd11 || '—'}</td><td><span className="tag">{r.status}</span></td></tr>)}</tbody></table></div>}
    </div>
  )
}

function BirthRegister({ onDone }) {
  const [centers, setCenters] = useState([])
  const [f, setF] = useState({ state_code: '', lga_code: '', ward: '', registration_center_id: '', geo_latitude: '', geo_longitude: '', hospital_notice_reference: '' })
  const [child, setChild] = useState({ first_name: '', last_name: '', date_of_birth: '', gender: 'F', place_of_birth: 'HOSPITAL', facility_id: '' })
  const blank = () => ({ nin: '', relationship: 'MOTHER', first_name: '', last_name: '', face: DUMMY_FACE, nimc: null, nimcErr: '', checking: false })
  const [parents, setParents] = useState([blank()])
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const set = k => e => setF({ ...f, [k]: e.target.value }); const setc = k => e => setChild({ ...child, [k]: e.target.value })
  const setp = (i, patch) => setParents(ps => ps.map((x, j) => j === i ? { ...x, ...patch } : x))
  const clean = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null))
  const verifyNin = async (i, nin) => {
    if (!/^\d{11}$/.test(nin)) return setp(i, { nimc: null, nimcErr: 'NIN must be 11 digits.' })
    setp(i, { checking: true, nimcErr: '' })
    try { const v = await api('POST', '/identity/verify-nin', { nin }); setp(i, { nimc: v, checking: false, first_name: v.first_name || '', last_name: v.last_name || '' }) }
    catch (x) { setp(i, { nimc: null, checking: false, nimcErr: x.message }) }
  }
  useEffect(() => { api('GET', `/centers${f.state_code ? `?state_code=${f.state_code}` : ''}`).then(setCenters).catch(() => {}) }, [f.state_code])
  const geo = () => navigator.geolocation?.getCurrentPosition(p => setF(x => ({ ...x, geo_latitude: p.coords.latitude, geo_longitude: p.coords.longitude })), () => setErr('Could not read your location. Enter coordinates manually.'))
  const submit = async e => {
    e.preventDefault(); setErr('')
    if (parents.some(p => !p.nimc)) return setErr('Verify each parent/guardian NIN with NIMC before submitting.')
    setBusy(true)
    try {
      const r = await api('POST', '/registrations/births', { ...clean(f), geo_latitude: +f.geo_latitude, geo_longitude: +f.geo_longitude, child: clean(child), parents: parents.map(({ nimc, nimcErr, checking, ...x }) => clean(x)) })
      onDone(r)
    } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <form className="card p-card" onSubmit={submit}>
      <h3>Birth registration</h3>
      <h4>Child (age 0–17)</h4>
      <div className="grid2">
        <Field label="First name"><input required maxLength={50} value={child.first_name} onChange={setc('first_name')} /></Field>
        <Field label="Last name"><input required maxLength={50} value={child.last_name} onChange={setc('last_name')} /></Field>
        <Field label="Date of birth"><input type="date" required max={new Date().toISOString().slice(0, 10)} value={child.date_of_birth} onChange={setc('date_of_birth')} /></Field>
        <Field label="Gender"><select value={child.gender} onChange={setc('gender')}><option value="F">Female</option><option value="M">Male</option></select></Field>
        <Field label="Place of birth"><select value={child.place_of_birth} onChange={setc('place_of_birth')}>{BIRTH_PLACES.map(p => <option key={p}>{p}</option>)}</select></Field>
        <Field label="Facility ID (optional)"><input maxLength={40} value={child.facility_id} onChange={setc('facility_id')} /></Field>
      </div>
      <h4>Parent / guardian (at least one, verified against NIMC)</h4>
      {parents.map((p, i) => (
        <div key={i} className="card p-card">
          <div className="grid2">
            <Field label="NIN"><input required pattern="\d{11}" inputMode="numeric" maxLength={11} value={p.nin} onChange={e => setp(i, { nin: e.target.value, nimc: null, nimcErr: '' })} onBlur={e => e.target.value && !p.nimc && verifyNin(i, e.target.value)} /></Field>
            <Field label="Relationship"><select value={p.relationship} onChange={e => setp(i, { relationship: e.target.value })}><option>MOTHER</option><option>FATHER</option><option>GUARDIAN</option></select></Field>
            <Field label="First name (optional)"><input maxLength={50} value={p.first_name} onChange={e => setp(i, { first_name: e.target.value })} /></Field>
            <Field label="Last name (optional)"><input maxLength={50} value={p.last_name} onChange={e => setp(i, { last_name: e.target.value })} /></Field>
          </div>
          {p.checking && <p className="muted">Checking with NIMC…</p>}
          {p.nimc && <p className="verified"><Icons.BadgeCheck size={18} /><span><b>{p.nimc.first_name} {p.nimc.last_name}</b> · NIMC verified</span></p>}
          {p.nimcErr && <p className="err" role="alert">{p.nimcErr}</p>}
          <p className="muted"><Icons.UserCircle size={28} style={{ verticalAlign: 'middle' }} /> Placeholder photo (demo): no face capture.</p>
          {parents.length > 1 && <button type="button" className="link" onClick={() => setParents(ps => ps.filter((_, j) => j !== i))}>Remove this parent/guardian</button>}
        </div>))}
      {parents.length < 2 && <button type="button" className="btn btn-outline btn-sm" onClick={() => setParents(ps => [...ps, { ...blank(), relationship: 'FATHER' }])}>Add second parent/guardian</button>}
      <h4>Location</h4>
      <div className="grid2">
        <Field label="Registration centre" hint="Leave as ONLINE for self-service."><select value={f.registration_center_id} onChange={set('registration_center_id')}><option value="">ONLINE</option>{centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="State code"><input required maxLength={10} value={f.state_code} onChange={set('state_code')} /></Field>
        <Field label="LGA code"><input required maxLength={10} value={f.lga_code} onChange={set('lga_code')} /></Field>
        <Field label="Ward"><input required maxLength={50} value={f.ward} onChange={set('ward')} /></Field>
        <Field label="Geo-tag (latitude, longitude)" hint="Within Nigeria."><div className="row"><input required type="number" step="any" min="4" max="14" placeholder="Latitude" value={f.geo_latitude} onChange={set('geo_latitude')} /><input required type="number" step="any" min="2.5" max="15" placeholder="Longitude" value={f.geo_longitude} onChange={set('geo_longitude')} /><button type="button" className="circle" onClick={geo} aria-label="Use my location"><Icons.LocateFixed size={15} /></button></div></Field>
        <Field label="Hospital notice reference (optional)"><input value={f.hospital_notice_reference} onChange={set('hospital_notice_reference')} /></Field>
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn btn-dark" disabled={busy}>{busy ? 'Submitting…' : 'Submit birth registration'}</button>
    </form>
  )
}
