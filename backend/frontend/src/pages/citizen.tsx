import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import axios from 'axios'
import { useStore } from '../store'
import Link from 'next/link'

const MapView = dynamic(() => import('../components/MapView'), { ssr: false })

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const CATEGORIES = ['pothole', 'broken streetlamp', 'garbage pile', 'road damage', 'waterlogging']

export default function CitizenPortal() {
  const { districts, selectedDistrict, setDistricts, setSelectedDistrict, setReports } = useStore()
  const [form, setForm] = useState({ category: 'pothole', description: '', lat: '', lon: '', district: '' })
  const [submitted, setSubmitted] = useState(false)
  const [chat, setChat] = useState<{ role: string; text: string }[]>([
    { role: 'ai', text: 'Hello! I am CityMind, your Karnataka urban assistant. Ask me about traffic, civic issues, or any district.' }
  ])
  const [msg, setMsg] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    axios.get(`${API}/api/districts`).then((r) => {
      setDistricts(r.data.districts)
      setSelectedDistrict(r.data.districts[2])
      setForm(f => ({ ...f, district: r.data.districts[2].name }))
    })
    axios.get(`${API}/api/reports`).then((r) => setReports(Array.isArray(r.data) ? r.data : []))
  }, [setDistricts, setSelectedDistrict, setReports])

  const submitReport = async () => {
    if (!form.description || !form.lat || !form.lon) return
    await axios.post(`${API}/api/reports`, {
      category: form.category,
      description: form.description,
      lat: parseFloat(form.lat),
      lon: parseFloat(form.lon),
      district: form.district,
    })
    setSubmitted(true)
    axios.get(`${API}/api/reports`).then((r) => setReports(Array.isArray(r.data) ? r.data : []))
    setTimeout(() => setSubmitted(false), 3000)
  }

  const sendChat = async () => {
    if (!msg.trim()) return
    const userMsg = msg
    setMsg('')
    setChat(c => [...c, { role: 'user', text: userMsg }])
    setChatLoading(true)
    try {
      const res = await axios.post('/api/chat', { message: userMsg })
      setChat(c => [...c, { role: 'ai', text: res.data.reply }])
    } catch {
      setChat(c => [...c, { role: 'ai', text: 'Sorry, I could not connect right now. Please try again.' }])
    }
    setChatLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontWeight: 700 }}>🌆 CityMind — Karnataka</span>
        <span style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>Citizen Portal</span>
        <Link href="/gov" style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--accent)' }}>→ Gov Dashboard</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', flex: 1, overflow: 'hidden' }}>
        {/* Map + district selector */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0.5rem 1rem', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>District:</span>
            <select
              value={selectedDistrict?.name || ''}
              onChange={(e) => {
                const d = districts.find(x => x.name === e.target.value)
                if (d) { setSelectedDistrict(d); setForm(f => ({ ...f, district: d.name })) }
              }}
              style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}
            >
              {districts.map(d => <option key={d.name}>{d.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            {selectedDistrict && <MapView />}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Report form */}
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.9rem' }}>📸 Report an Issue</div>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              style={{ width: '100%', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ width: '100%', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem', marginBottom: '0.5rem', fontSize: '0.8rem', outline: 'none' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input placeholder="Latitude" value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem', fontSize: '0.8rem', outline: 'none' }} />
              <input placeholder="Longitude" value={form.lon} onChange={e => setForm(f => ({ ...f, lon: e.target.value }))}
                style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem', fontSize: '0.8rem', outline: 'none' }} />
            </div>
            <button onClick={submitReport}
              style={{ width: '100%', padding: '0.5rem', background: submitted ? 'var(--accent2)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
              {submitted ? '✓ Submitted!' : 'Submit Report'}
            </button>
          </div>

          {/* CityMind Chat */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.9rem' }}>🤖 CityMind AI</div>
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '0.75rem' }}>
              {chat.map((m, i) => (
                <div key={i} style={{
                  marginBottom: '0.5rem', display: 'flex',
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start'
                }}>
                  <div style={{
                    maxWidth: '85%', padding: '0.5rem 0.75rem', borderRadius: '10px', fontSize: '0.8rem',
                    background: m.role === 'user' ? 'var(--accent)' : 'var(--surface2)',
                    color: 'var(--text)', border: m.role === 'ai' ? '1px solid var(--border)' : 'none'
                  }}>{m.text}</div>
                </div>
              ))}
              {chatLoading && <div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>CityMind is thinking...</div>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                value={msg} onChange={e => setMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Ask about Karnataka..."
                style={{ flex: 1, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.8rem', outline: 'none' }}
              />
              <button onClick={sendChat}
                style={{ padding: '0.5rem 0.75rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
