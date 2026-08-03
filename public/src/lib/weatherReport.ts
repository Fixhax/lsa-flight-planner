// General forecast report per point (Open-Meteo, free, no API key) — same
// caveats as the wind fetch: this is a numerical weather model, not an
// aviation briefing service. No METAR/TAF/SIGMET/NOTAM.

export interface WeatherReportPoint {
  label: string
  tempC: number
  precipProbPct: number
  weatherCode: number
  weatherDesc: string
  cloudCoverPct: number
  visibilityM: number
  windDirTrueDeg: number
  windSpeedKt: number
  validTime: string
}

// Standard WMO weather codes (subset actually seen in Open-Meteo's output).
const WEATHER_CODE_DESC: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm, slight hail',
  99: 'Thunderstorm, heavy hail'
}

function nearestIndex(times: string[]): number {
  const now = Date.now()
  let bestIdx = 0
  let bestDiff = Infinity
  times.forEach((t, i) => {
    const diff = Math.abs(new Date(t).getTime() - now)
    if (diff < bestDiff) {
      bestDiff = diff
      bestIdx = i
    }
  })
  return bestIdx
}

export async function fetchWeatherReport(lat: number, lon: number, label: string): Promise<WeatherReportPoint> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,precipitation_probability,weathercode,cloudcover,visibility,windspeed_10m,winddirection_10m` +
    `&windspeed_unit=kn&timezone=auto&forecast_days=2`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Weather service returned ${res.status}`)
  const data = await res.json()

  const times: string[] | undefined = data?.hourly?.time
  if (!times) throw new Error('Unexpected response from weather service')
  const idx = nearestIndex(times)

  const code = data.hourly.weathercode?.[idx] ?? -1

  return {
    label,
    tempC: data.hourly.temperature_2m?.[idx],
    precipProbPct: data.hourly.precipitation_probability?.[idx],
    weatherCode: code,
    weatherDesc: WEATHER_CODE_DESC[code] ?? 'Unknown',
    cloudCoverPct: data.hourly.cloudcover?.[idx],
    visibilityM: data.hourly.visibility?.[idx],
    windDirTrueDeg: data.hourly.winddirection_10m?.[idx],
    windSpeedKt: data.hourly.windspeed_10m?.[idx],
    validTime: times[idx]
  }
}
