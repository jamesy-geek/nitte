import axios from 'axios'
import { useStore } from '../store'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const SCENARIOS = [
  'Road Closure / Construction',
  'Flood / Waterlogging',
  'Festival / Procession',
  'Bus Route Disruption',
  'Garbage Collection Disruption',
  'Ambulance Access Simulation',
  'Electricity Network Failure',
  'Mobile Network Stress',
]

const Toggle = ({ label, val, onChange }: { label: string; val: number; onChange: (v: number) => void }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
    <span style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{label}</span>
    <div
      onClick={() => onChange(val === 1 ? 0 : 1)}
      style={{
        width: 40, height: 22, borderRadius: 11, background: val ? 'var(--accent)' : 'var(--border)',
        cursor: 'pointer', position: 'relative', transition: 'background 0.2s'
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: val ? 21 : 3, width: 16, height: 16,
        borderRadius: '50%', background: '#fff', transition: 'left 0.2s'
      }} />
    </div>
  </div>
)

const Slider = ({ label, min, max, val, onChange }: { label: string; min: number; max: number; val: number; onChange: (v: number) => void }) => (
  <div style={{ marginBottom: '0.8rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text2)', marginBottom: '0.3rem' }}>
      <span>{label}</span><span style={{ color: 'var(--text)' }}>{val}</span>
    </div>
    <input type="range" min={min} max={max} value={val} onChange={(e) => onChange(+e.target.value)}
      style={{ width: '100%', accentColor: 'var(--accent)' }} />
  </div>
)

export default function SimPanel() {
  const { simInputs, updateSimInput, selectedDistrict, setPredictions, setLoading, loading } = useStore()

  const runSim = async () => {
    if (!selectedDistrict) return
    setLoading(true)
    try {
      const res = await axios.post(`${API}/api/predict`, {
        district: selectedDistrict.name,
        ...simInputs,
      })
      setPredictions(res.data.predictions)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.95rem' }}>⚙ Simulation Panel</div>

      <div style={{ marginBottom: '0.8rem' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text2)', marginBottom: '0.3rem' }}>Scenario</div>
        <select
          value={simInputs.scenario}
          onChange={(e) => updateSimInput('scenario', e.target.value)}
          style={{ width: '100%', background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.85rem' }}
        >
          {SCENARIOS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <Slider label="Roads Affected" min={0} max={20} val={simInputs.roads_affected} onChange={(v: number) => updateSimInput('roads_affected', v)} />
      <Slider label="Time of Day (hr)" min={0} max={23} val={simInputs.time_of_day} onChange={(v: number) => updateSimInput('time_of_day', v)} />
      <Slider label="Crowd Count" min={0} max={10000} val={simInputs.crowd_count} onChange={(v: number) => updateSimInput('crowd_count', v)} />

      <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text2)', fontWeight: 600 }}>Conditions</div>
      <Toggle label="Festival / Procession" val={simInputs.is_festival} onChange={(v) => updateSimInput('is_festival', v)} />
      <Toggle label="Construction Zone" val={simInputs.is_construction} onChange={(v) => { updateSimInput('is_construction', v); updateSimInput('construction_zone', v) }} />
      <Toggle label="Bus Disruption" val={simInputs.is_bus_disruption} onChange={(v) => updateSimInput('is_bus_disruption', v)} />
      <Toggle label="Electricity Failure" val={simInputs.is_elec_failure} onChange={(v) => updateSimInput('is_elec_failure', v)} />
      <Toggle label="Mobile Network Stress" val={simInputs.is_mobile_stress} onChange={(v) => updateSimInput('is_mobile_stress', v)} />

      <button
        onClick={runSim}
        disabled={loading}
        style={{
          width: '100%', padding: '0.75rem', marginTop: '1rem', borderRadius: '8px',
          background: loading ? 'var(--border)' : 'var(--accent)', color: '#fff',
          border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.95rem'
        }}
      >
        {loading ? 'Running...' : '▶ Run Simulation'}
      </button>
    </div>
  )
}
