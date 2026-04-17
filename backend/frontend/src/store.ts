import { create } from 'zustand'

interface District {
  name: string
  lat: number
  lon: number
}

interface Predictions {
  congestion_change: number
  ambulance_delay_min: number
  flood_risk: number
  health_risk: number
  crowd_safety_risk: number
  waste_impact: number
  ksrtc_disruption: number
}

interface Report {
  id: string
  category: string
  description: string
  lat: number
  lon: number
  district: string
  submitted_at: string
}

interface SimInputs {
  scenario: string
  roads_affected: number
  time_of_day: number
  crowd_count: number
  is_festival: number
  construction_zone: number
  is_construction: number
  is_bus_disruption: number
  is_elec_failure: number
  is_mobile_stress: number
}

interface AppStore {
  districts: District[]
  selectedDistrict: District | null
  predictions: Predictions | null
  reports: Report[]
  loading: boolean
  simInputs: SimInputs
  setDistricts: (d: District[]) => void
  setSelectedDistrict: (d: District) => void
  setPredictions: (p: Predictions) => void
  setReports: (r: Report[]) => void
  setLoading: (l: boolean) => void
  updateSimInput: (key: keyof SimInputs, value: number | string) => void
}

export const useStore = create<AppStore>((set) => ({
  districts: [],
  selectedDistrict: null,
  predictions: null,
  reports: [],
  loading: false,
  simInputs: {
    scenario: 'Flood / Waterlogging',
    roads_affected: 2,
    time_of_day: 12,
    crowd_count: 200,
    is_festival: 0,
    construction_zone: 0,
    is_construction: 0,
    is_bus_disruption: 0,
    is_elec_failure: 0,
    is_mobile_stress: 0,
  },
  setDistricts: (districts) => set({ districts }),
  setSelectedDistrict: (selectedDistrict) => set({ selectedDistrict }),
  setPredictions: (predictions) => set({ predictions }),
  setReports: (reports) => set({ reports }),
  setLoading: (loading) => set({ loading }),
  updateSimInput: (key, value) =>
    set((state) => ({ simInputs: { ...state.simInputs, [key]: value } })),
}))
