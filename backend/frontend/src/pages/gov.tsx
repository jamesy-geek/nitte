import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import axios from 'axios'
import { useStore } from '../store'
import SimPanel from '../components/SimPanel'
import ResultsPanel from '../components/ResultsPanel'
import ReportsList from '../components/ReportsList'

const MapView = dynamic(() => import('../components/MapView'), { ssr: false })

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function GovDashboard() {
  const { districts, selectedDistrict, setDistricts, setSelectedDistrict, setReports } = useStore()
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')

  useEffect(() => {
    axios.get(`${API}/api/districts`).then((r) => {
      setDistricts(r.data.districts)
      setSelectedDistrict(r.data.districts[2])
    })
    axios.get(`${API}/api/reports`).then((r) => setReports(Array.isArray(r.data) ? r.data : []))
  }, [setDistricts, setSelectedDistrict, setReports])

  if (!authed) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border)', minWidth: 320, textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>🏛 MUIP</div>
        <div style={{ color: 'var(--text2)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Government Portal — Karnataka</div>
        <input
          type="password"
          placeholder="Enter access code"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && pw === 'muip2024' && setAuthed(true)}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', marginBottom: '1rem', outline: 'none' }}
        />
        <button
          onClick={() => pw === 'muip2024' && setAuthed(true)}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
        >Login</button>
        <div style={{ color: 'var(--text2)', fontSize: '0.75rem', marginTop: '1rem' }}>Demo code: muip2024</div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>🏛 MUIP</span>
        <span style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>Karnataka Urban Digital Twin</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>District:</span>
          <select
            value={selectedDistrict?.name || ''}
            onChange={(e) => {
              const d = districts.find((x) => x.name === e.target.value)
              if (d) setSelectedDistrict(d)
            }}
            style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.4rem 0.75rem', cursor: 'pointer' }}
          >
            {districts.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 320px', flex: 1, overflow: 'hidden' }}>
        <div style={{ borderRight: '1px solid var(--border)', overflow: 'auto', padding: '1rem' }}>
          <SimPanel />
        </div>
        <div style={{ position: 'relative' }}>
          {selectedDistrict && <MapView />}
        </div>
        <div style={{ borderLeft: '1px solid var(--border)', overflow: 'auto', padding: '1rem' }}>
          <ResultsPanel />
          <ReportsList />
        </div>
      </div>
    </div>
  )
}
