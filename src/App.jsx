import { useEffect, useMemo, useState } from 'react'

const BASE_URL = import.meta.env.VITE_BACKEND_URL || `${window.location.protocol}//${window.location.hostname.replace('-3000', '-8000')}`

function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token])
  const save = (t) => { localStorage.setItem('token', t); setToken(t) }
  const clear = () => { localStorage.removeItem('token'); setToken('') }
  return { token, headers, save, clear }
}

async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let msg = 'Request failed'
    try { const d = await res.json(); msg = d.detail || JSON.stringify(d) } catch {}
    throw new Error(msg)
  }
  try { return await res.json() } catch { return {} }
}

function Navbar({ user, onLogout }) {
  return (
    <div className="w-full sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-teal-100">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-teal-500" />
          <span className="font-semibold text-teal-700">Explorer</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-slate-600">Hi, {user.name || 'Traveler'}</span>
              <button onClick={onLogout} className="px-3 py-1.5 rounded bg-teal-600 text-white text-sm hover:bg-teal-700">Logout</button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function AuthPanel({ onAuthed }) {
  const auth = useAuth()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'signup') {
        const d = await api('/auth/signup', { method: 'POST', body: { name, email, password } })
        auth.save(d.token)
      } else {
        const d = await api('/auth/login', { method: 'POST', body: { email, password } })
        auth.save(d.token)
      }
      const me = await api('/users/me', { headers: auth.headers })
      onAuthed({ ...me })
    } catch (err) {
      setError(err.message)
    }
  }

  const google = async () => {
    setError('')
    try {
      const d = await api('/auth/google', { method: 'POST', body: { id_token: crypto.randomUUID() } })
      auth.save(d.token)
      const me = await api('/users/me', { headers: auth.headers })
      onAuthed({ ...me })
    } catch (err) { setError(err.message) }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
      <h2 className="text-xl font-semibold mb-4">{mode === 'signup' ? 'Create an account' : 'Welcome back'}</h2>
      {error ? <div className="mb-3 text-sm text-red-600">{error}</div> : null}
      <form onSubmit={submit} className="space-y-3">
        {mode === 'signup' ? (
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full border rounded px-3 py-2" required />
        ) : null}
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" className="w-full border rounded px-3 py-2" required />
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" className="w-full border rounded px-3 py-2" required />
        <button className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded px-3 py-2">{mode === 'signup' ? 'Sign up' : 'Log in'}</button>
      </form>
      <button onClick={google} className="w-full mt-3 bg-black text-white rounded px-3 py-2">Continue with Google</button>
      <div className="text-sm text-slate-600 mt-3">
        {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
        <button className="ml-1 text-teal-700 underline" onClick={()=>setMode(mode === 'signup' ? 'login' : 'signup')}>
          {mode === 'signup' ? 'Log in' : 'Sign up'}
        </button>
      </div>
    </div>
  )
}

function Explore({ user, onFavorite }) {
  const [loc, setLoc] = useState({ lat: 12.9716, lng: 77.5946 })
  const [radius, setRadius] = useState(5)
  const [loading, setLoading] = useState(false)
  const [places, setPlaces] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      })
    }
  }, [])

  const fetchNearby = async () => {
    setLoading(true); setError('')
    try {
      const data = await api('/places/nearby', { method: 'POST', body: { latitude: loc.lat, longitude: loc.lng, radius_km: Number(radius) } })
      setPlaces(data.results || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm text-slate-600">Latitude</label>
          <input type="number" step="any" value={loc.lat} onChange={e=>setLoc(v=>({ ...v, lat: parseFloat(e.target.value) }))} className="border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-slate-600">Longitude</label>
          <input type="number" step="any" value={loc.lng} onChange={e=>setLoc(v=>({ ...v, lng: parseFloat(e.target.value) }))} className="border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-slate-600">Radius</label>
          <select value={radius} onChange={e=>setRadius(e.target.value)} className="border rounded px-3 py-2">
            <option value={1}>1 km</option>
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
            <option value={25}>25 km</option>
          </select>
        </div>
        <button onClick={fetchNearby} className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700">Search nearby</button>
      </div>
      {error ? <div className="mt-3 text-red-600">{error}</div> : null}
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        {places.map((p) => (
          <div key={p.id} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="h-32 bg-gradient-to-br from-teal-100 to-teal-200" />
            <div className="p-4">
              <div className="font-semibold">{p.name}</div>
              <div className="text-sm text-slate-600">{p.category} • {p.distance_km} km away</div>
              <div className="mt-3 flex justify-between items-center">
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`} target="_blank" className="text-teal-700 underline text-sm">Directions</a>
                {user ? (
                  <button onClick={()=>onFavorite(p.id)} className="text-sm px-3 py-1.5 rounded bg-slate-900 text-white">Save</button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const auth = useAuth()
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('explore')
  const [toast, setToast] = useState('')

  useEffect(() => {
    (async () => {
      try {
        if (auth.token) {
          const me = await api('/users/me', { headers: auth.headers })
          setUser(me)
        }
      } catch {}
    })()
  }, [])

  const logout = () => { auth.clear(); setUser(null) }
  const onFavorite = async (id) => {
    try {
      await api(`/users/me/favorites?place_id=${encodeURIComponent(id)}`, { method: 'POST', headers: auth.headers })
      setToast('Saved to favorites')
      setTimeout(()=>setToast(''), 2000)
    } catch (e) { setToast(e.message); setTimeout(()=>setToast(''), 2500) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white text-slate-800">
      <Navbar user={user} onLogout={logout} />
      <header className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900">Find great places around you</h1>
        <p className="mt-3 text-slate-600">Smart discovery with location, categories, and optimized routes.</p>
        <div className="mt-4 flex gap-2">
          <button onClick={()=>setTab('explore')} className={`px-3 py-1.5 rounded ${tab==='explore'?'bg-teal-600 text-white':'bg-white border'}`}>Explore</button>
          <button onClick={()=>setTab('auth')} className={`px-3 py-1.5 rounded ${tab==='auth'?'bg-teal-600 text-white':'bg-white border'}`}>{user? 'Account' : 'Login / Sign up'}</button>
        </div>
      </header>

      {tab === 'auth' ? (
        user ? (
          <div className="max-w-6xl mx-auto px-4 pb-10">
            <div className="bg-white rounded-xl shadow p-6">
              <div className="font-semibold">Your profile</div>
              <div className="text-sm text-slate-600">Plan: {user.plan}</div>
            </div>
          </div>
        ) : (
          <div className="px-4 pb-10 flex items-center justify-center"><AuthPanel onAuthed={(u)=>{ setUser(u); setTab('explore') }} /></div>
        )
      ) : (
        <Explore user={user} onFavorite={onFavorite} />
      )}

      {toast ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full shadow">{toast}</div>
      ) : null}

      <footer className="py-8 text-center text-xs text-slate-500">Explorer • Teal & White UI • {new Date().getFullYear()}</footer>
    </div>
  )
}
