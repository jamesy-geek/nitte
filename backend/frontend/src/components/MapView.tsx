import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useStore } from '../store'

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
  useEffect(() => { map.setView([lat, lon], 11, { animate: true }) }, [lat, lon, map])
  return null
}

export default function MapView() {
  const { selectedDistrict, reports } = useStore()
  if (!selectedDistrict) return null

  return (
    <MapContainer
      center={[selectedDistrict.lat, selectedDistrict.lon]}
      zoom={11}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <Recenter lat={selectedDistrict.lat} lon={selectedDistrict.lon} />
      <Marker position={[selectedDistrict.lat, selectedDistrict.lon]}>
        <Popup>{selectedDistrict.name} — District HQ</Popup>
      </Marker>
      {reports.filter(r => r.district === selectedDistrict.name).map((r) => (
        <Marker key={r.id} position={[r.lat, r.lon]} icon={reportIcon}>
          <Popup>
            <strong>{r.category}</strong><br />
            {r.description}<br />
            <small>{new Date(r.submitted_at).toLocaleString()}</small>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
