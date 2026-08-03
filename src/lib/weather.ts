// Uses Open-Meteo (open-meteo.com) — a free, no-API-key weather forecast
// service. This is a general numerical-weather-model forecast, not an
// aviation briefing service: it has no METAR/TAF/SIGMET/NOTAM integration.
// Treat it as a convenience for roughing in a wind estimate while planning,
// never as a substitute for an official pre-flight weather briefing.

export interface FetchedWind {
  directionTrueDeg: number
  speedKt: number
  levelHpa: number
  levelAltFt: number // the altitude the data actually came from — may differ from what was asked for
  validTime: string // ISO time string, local to the queried location
}

// Pressure levels Open-Meteo publishes wind for, with their approximate
// standard-atmosphere altitude. Covers the range most LSA VFR flying
// happens in and a bit beyond.
const PRESSURE_LEVELS: { hpa: number; altFt: number }[] = [
  { hpa: 1000, altFt: 364 },
  { hpa: 950, altFt: 1770 },
  { hpa: 900, altFt: 3200 },
  { hpa: 850, altFt: 4780 },
  { hpa: 800, altFt: 6470 },
  { hpa: 700, altFt: 9880 }
]

function levelsByProximity(altitudeFt: number) {
  return [...PRESSURE_LEVELS].sort(
    (a, b) => Math.abs(a.altFt - altitudeFt) - Math.abs(b.altFt - altitudeFt)
  )
}

function hoursByProximity(times: string[]) {
  const now = Date.now()
  return times
    .map((t, i) => ({ i, diff: Math.abs(new Date(t).getTime() - now) }))
    .sort((a, b) => a.diff - b.diff)
}

export async function fetchRouteWind(lat: number, lon: number, altitudeFt: number): Promise<FetchedWind> {
  const levels = levelsByProximity(altitudeFt)
  const hourlyFields = levels.flatMap((l) => [`winddirection_${l.hpa}hPa`, `windspeed_${l.hpa}hPa`])

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=${hourlyFields.join(',')}&windspeed_unit=kn&timezone=auto&forecast_days=2`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Weather service returned ${res.status}`)
  }
  const data = await res.json()

  const times: string[] | undefined = data?.hourly?.time
  if (!times) {
    throw new Error('Unexpected response from weather service')
  }

  const hourOrder = hoursByProximity(times)

  // Try the closest altitude first; within it, try the closest hour first.
  // Only move on to the next-closest altitude if this one has no usable
  // data at any hour in the forecast window.
  for (const level of levels) {
    const dirs: (number | null)[] | undefined = data?.hourly?.[`winddirection_${level.hpa}hPa`]
    const spds: (number | null)[] | undefined = data?.hourly?.[`windspeed_${level.hpa}hPa`]
    if (!dirs || !spds) continue

    for (const { i } of hourOrder) {
      const dir = dirs[i]
      const spd = spds[i]
      if (dir !== null && dir !== undefined && spd !== null && spd !== undefined) {
        return {
          directionTrueDeg: dir,
          speedKt: spd,
          levelHpa: level.hpa,
          levelAltFt: level.altFt,
          validTime: times[i]
        }
      }
    }
  }

  throw new Error('No wind data available from this weather service for this location right now.')
}
