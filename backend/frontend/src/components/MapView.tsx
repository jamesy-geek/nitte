import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useStore, SelectedRoad } from '../store'
import axios from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Fix leaflet default icon
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const reportIcon = L.divIcon({
  className: '',
  html: `<div style="background:#ef4444;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,0.5)"></div>`,
  iconSize: [12, 12],
})

function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lon], 12, { animate: true }) }, [lat, lon, map])
  return null
}

// Fetches road busyness GeoJSON when district changes
function RoadLoader() {
  const { selectedDistrict, setRoadGeoJSON, setRoadsLoading } = useStore()

  useEffect(() => {
    if (!selectedDistrict) return
    setRoadsLoading(true)
    setRoadGeoJSON(null)

    axios.get(`${API}/api/roads/${encodeURIComponent(selectedDistrict.name)}`)
      .then((res) => setRoadGeoJSON(res.data))
      .catch((err) => console.error('Road fetch failed:', err))
      .finally(() => setRoadsLoading(false))
  }, [selectedDistrict?.name])

  return null
}

// Renders the GeoJSON road layer with busyness colours
function RoadLayer() {
  const { roadGeoJSON, selectedRoad, setSelectedRoad } = useStore()
  // key forces full re-render when district changes (new GeoJSON)
  const geoKey = useRef(0)

  useEffect(() => { geoKey.current += 1 }, [roadGeoJSON])

  if (!roadGeoJSON) return null

  return (
    <GeoJSON
      key={geoKey.current}
      data={roadGeoJSON}
      style={(feature) => {
        if (!feature) return {}
        const props = feature.properties
        const isSelected = selectedRoad?.id === props.id
        return {
          color: isSelected ? '#ffffff' : props.color,
          weight: isSelected ? 5 : roadWeight(props.highway),
          opacity: isSelected ? 1 : 0.85,
        }
      }}
      onEachFeature={(feature, layer) => {
        const p = feature.properties
        layer.on({
          click: () => {
            setSelectedRoad({
              id: p.id,
              name: p.name,
              highway: p.highway,
              busyness: p.busyness,
              color: p.color,
              label: p.label,
            } as SelectedRoad)
          },
          mouseover: (e: L.LeafletMouseEvent) => {
            e.target.setStyle({ weight: 5, opacity: 1 })
            e.target.bindTooltip(
              `<strong>${p.name}</strong><br/>Busyness: ${p.busyness}/10 — ${p.label}`,
              { sticky: true, className: 'road-tooltip' }
            ).openTooltip()
          },
          mouseout: (e: L.LeafletMouseEvent) => {
            const isSelected = useStore.getState().selectedRoad?.id === p.id
            e.target.setStyle({
              weight: isSelected ? 5 : roadWeight(p.highway),
              opacity: isSelected ? 1 : 0.85,
              color: isSelected ? '#ffffff' : p.color,
            })
            e.target.closeTooltip()
          },
        })
      }}
    />
  )
}

function roadWeight(highway: string): number {
  return { trunk: 4, primary: 3.5, secondary: 2.5, tertiary: 2 }[highway] ?? 2
}

// Loading overlay shown while roads are being fetched
function RoadsLoadingOverlay() {
  const { roadsLoading } = useStore()
  if (!roadsLoading) return null
  return (
    <div style={{
      position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '6px 14px',
      borderRadius: 20, fontSize: '0.78rem', zIndex: 1000, pointerEvents: 'none',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
      Loading road busyness data…
    </div>
  )
}

// Legend in bottom-right corner
function BusynessLegend() {
  const { roadGeoJSON } = useStore()
  if (!roadGeoJSON) return null
  return (
    <div style={{
      position: 'absolute', bottom: 28, right: 12, zIndex: 1000,
      background: 'rgba(15,15,20,0.88)', border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 8, padding: '10px 14px', fontSize: '0.72rem', color: '#e2e8f0',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, fontSize: '0.75rem', letterSpacing: '0.05em' }}>
        ROAD BUSYNESS
      </div>
      {[
        { color: '#ef4444', label: 'Very High (8–10)' },
        { color: '#f97316', label: 'High (6–8)' },
        { color: '#eab308', label: 'Moderate (4–6)' },
        { color: '#22c55e', label: 'Low (0–4)' },
      ].map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
          <div style={{ width: 24, height: 4, background: color, borderRadius: 2 }} />
          <span>{label}</span>
        </div>
      ))}
      <div style={{ marginTop: 6, color: '#94a3b8', fontSize: '0.68rem' }}>
        Click any road to select it
      </div>
    </div>
  )
}

export default function MapView() {
  const { selectedDistrict, reports } = useStore()
  if (!selectedDistrict) return null

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .road-tooltip { background: #1e293b; border: 1px solid #334155; color: #e2e8f0; font-size: 0.78rem; }
        .road-tooltip::before { border-top-color: #334155; }
      `}</style>

      <MapContainer
        center={[selectedDistrict.lat, selectedDistrict.lon]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Recenter lat={selectedDistrict.lat} lon={selectedDistrict.lon} />
        <RoadLoader />
        <RoadLayer />

        {/* District HQ marker */}
        <Marker position={[selectedDistrict.lat, selectedDistrict.lon]}>
          <Popup>{selectedDistrict.name} — District HQ</Popup>
        </Marker>

        {/* Citizen reports */}
        {reports
          .filter((r) => r.district === selectedDistrict.name)
          .map((r) => (
            <Marker key={r.id} position={[r.lat, r.lon]} icon={reportIcon}>
              <Popup>
                <strong>{r.category}</strong><br />
                {r.description}<br />
                <small>{new Date(r.submitted_at).toLocaleString()}</small>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      <RoadsLoadingOverlay />
      <BusynessLegend />
    </div>
  )
}