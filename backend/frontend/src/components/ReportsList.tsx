import { useStore } from '../store'

const CATEGORY_COLORS: Record<string, string> = {
  pothole: '#f59e0b',
  'broken streetlamp': '#3b82f6',
  'garbage pile': '#10b981',
  'road damage': '#ef4444',
  waterlogging: '#8b5cf6',
}

export default function ReportsList() {
  const { reports, selectedDistrict } = useStore()
  const filtered = reports.filter(r => r.district === selectedDistrict?.name)

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.95rem' }}>
        📍 Citizen Reports {filtered.length > 0 && <span style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>({filtered.length})</span>}
      </div>
      {filtered.length === 0 ? (
        <div style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>No reports for this district</div>
      ) : (
        filtered.map((r) => (
          <div key={r.id} style={{ background: 'var(--surface2)', borderRadius: '8px', padding: '0.6rem', marginBottom: '0.5rem', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{
                background: CATEGORY_COLORS[r.category] || '#6b7280',
                color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.4rem',
                borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase'
              }}>{r.category}</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{r.description}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text2)', marginTop: '0.25rem' }}>
              {new Date(r.submitted_at).toLocaleString()}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
