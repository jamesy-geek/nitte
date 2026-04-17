import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Cell } from 'recharts'
import { useStore } from '../store'

const METRICS = [
  { key: 'congestion_change', label: 'Congestion', unit: '%', color: '#ef4444', max: 100 },
  { key: 'ambulance_delay_min', label: 'Ambulance Delay', unit: 'min', color: '#f59e0b', max: 30 },
  { key: 'flood_risk', label: 'Flood Risk', unit: '%', color: '#3b82f6', max: 100 },
  { key: 'health_risk', label: 'Health Risk', unit: '%', color: '#8b5cf6', max: 100 },
  { key: 'crowd_safety_risk', label: 'Crowd Safety', unit: '%', color: '#ec4899', max: 100 },
  { key: 'waste_impact', label: 'Waste Impact', unit: '%', color: '#10b981', max: 100 },
  { key: 'ksrtc_disruption', label: 'KSRTC Disruption', unit: '%', color: '#f97316', max: 100 },
]

export default function ResultsPanel() {
  const { predictions } = useStore()

  if (!predictions) return (
    <div style={{ color: 'var(--text2)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
      Run a simulation to see predictions
    </div>
  )

  const chartData = METRICS.map((m) => ({
    name: m.label,
    value: Math.round((predictions as Record<string, number>)[m.key] * 10) / 10,
    fill: m.color,
  }))

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.95rem' }}>📊 Simulation Results</div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} width={90} />
          <Tooltip
            contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
            formatter={(v: number | string) => [`${v}`, '']}
          />
          <Bar dataKey="value" radius={4}>
            {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
        {METRICS.map((m) => {
          const val = Math.round((predictions as Record<string, number>)[m.key] * 10) / 10
          const pct = Math.min(100, (val / m.max) * 100)
          return (
            <div key={m.key} style={{ background: 'var(--surface2)', borderRadius: '8px', padding: '0.6rem', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text2)', marginBottom: '0.25rem' }}>{m.label}</div>
              <div style={{ fontWeight: 700, color: m.color, fontSize: '1rem' }}>{val}{m.unit}</div>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginTop: '0.35rem' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: m.color, borderRadius: 2, transition: 'width 0.5s' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
