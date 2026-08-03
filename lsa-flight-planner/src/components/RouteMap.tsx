import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Waypoint } from '../lib/planning'
import { destinationPoint } from '../lib/geo'
import type { GlideResult } from '../lib/glide'
import type { LivePosition } from '../lib/liveTracking'
import { airstrips } from '../data/strips'
import type { TrafficPatternResult } from '../lib/trafficPattern'

interface Props {
  waypoints: Waypoint[]
  onMoveWaypoint: (id: string, lat: number, lon: number) => void
  onInsertWaypoint: (afterIndex: number, lat: number, lon: number) => void
  onSelectWaypoint: (id: string) => void
  glide?: GlideResult
  livePosition?: LivePosition | null
  visible?: boolean // pass false while the containing panel is display:none
  pattern?: TrafficPatternResult | null
  fullscreen?: boolean
  onToggleFullscreen?: () => void
}

const waypointIcon = L.divIcon({
  className: 'map-waypoint-icon',
  html: '<div class="map-waypoint-dot"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
})

const midpointIcon = L.divIcon({
  className: 'map-midpoint-icon',
  html: '<div class="map-midpoint-dot"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
})

// Every curated strip, shown always (not just ones in the current route) so
// nearby fields are visible for reference — a distinct diamond shape and
// muted color so they never compete visually with the active route/waypoints.
const airfieldIcon = L.divIcon({
  className: 'map-airfield-icon',
  html: '<div class="map-airfield-diamond"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5]
})

// A simple top-down airplane silhouette, nose pointing up (0deg = north),
// rotated to match GPS heading. Uses magenta specifically because it's
// visually distinct from every other color already used on this map (cyan
// for waypoints/route, amber for glide circles/warnings) so it never blends
// into terrain colors on either tile layer.
const LIVE_MARKER_SVG = `
  <svg viewBox="0 0 24 24" width="30" height="30">
    <path d="M12 2 L13.2 8.5 L21.5 13.5 L21.5 15.2 L13.2 12.3 L13.2 17.5 L16.5 19.8 L16.5 21.3 L12 20 L7.5 21.3 L7.5 19.8 L10.8 17.5 L10.8 12.3 L2.5 15.2 L2.5 13.5 L10.8 8.5 Z"
          fill="#ff2ea6" stroke="#0d1117" stroke-width="0.9" stroke-linejoin="round" />
  </svg>
`

function liveIcon(headingDeg?: number) {
  const rotation = headingDeg ?? 0
  return L.divIcon({
    className: 'map-live-icon',
    html: `<div class="map-live-plane" style="transform: rotate(${rotation}deg)">${LIVE_MARKER_SVG}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  })
}

// Default view centered over the Norway/Sweden strip data this app is
// scoped to, used until there are waypoints to fit bounds to.
const DEFAULT_CENTER: L.LatLngExpression = [63, 13]
const DEFAULT_ZOOM = 5

export default function RouteMap({
  waypoints,
  onMoveWaypoint,
  onInsertWaypoint,
  onSelectWaypoint,
  glide,
  livePosition,
  visible = true,
  pattern,
  fullscreen = false,
  onToggleFullscreen
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerGroupRef = useRef<L.LayerGroup | null>(null)
  const airfieldLayerRef = useRef<L.LayerGroup | null>(null)
  const patternLayerRef = useRef<L.LayerGroup | null>(null)
  const liveMarkerRef = useRef<L.Marker | null>(null)
  const prevIdsKeyRef = useRef<string>('')
  const onToggleFullscreenRef = useRef(onToggleFullscreen)
  onToggleFullscreenRef.current = onToggleFullscreen

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM
    })

    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18
    })

    // Kartverket (Norwegian Mapping Authority) topographic tiles — free,
    // no API key, official government source. Norway coverage only (no
    // Sweden), so this is offered as a switchable layer, not a default.
    const kartverketTopo = L.tileLayer(
      'https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png',
      {
        attribution: '&copy; Kartverket',
        maxZoom: 18,
        bounds: L.latLngBounds([57.6, 3.7], [71.6, 32.0]) // roughly Norway's extent
      }
    )

    osm.addTo(map)
    L.control
      .layers(
        { 'OpenStreetMap (everywhere)': osm, 'Norway topo (Kartverket)': kartverketTopo },
        undefined,
        { position: 'topright' }
      )
      .addTo(map)

    // Fullscreen toggle, as a plain Leaflet control button (top-left).
    const FullscreenControl = L.Control.extend({
      onAdd: function () {
        const btn = L.DomUtil.create('button', 'map-fullscreen-btn')
        btn.type = 'button'
        btn.innerHTML = '&#9974;'
        btn.title = 'Toggle fullscreen map'
        L.DomEvent.disableClickPropagation(btn)
        btn.onclick = () => onToggleFullscreenRef.current?.()
        return btn
      }
    })
    if (onToggleFullscreen) {
      new FullscreenControl({ position: 'topleft' }).addTo(map)
    }

    mapRef.current = map
    layerGroupRef.current = L.layerGroup().addTo(map)
    airfieldLayerRef.current = L.layerGroup().addTo(map)
    patternLayerRef.current = L.layerGroup().addTo(map)

    // Every curated strip is shown on the map at all times, not just ones
    // in the current route — this list never changes at runtime, so it's
    // populated once here rather than in the per-render redraw effect.
    airstrips.forEach((strip) => {
      const marker = L.marker([strip.lat, strip.lon], { icon: airfieldIcon })
      const meta = [
        strip.surface,
        strip.runway ? `rwy ${strip.runway}` : null,
        strip.lengthM ? `${strip.lengthM}m` : null
      ]
        .filter(Boolean)
        .join(' &middot; ')
      marker.bindPopup(`<strong>${strip.name}${strip.icao ? ` (${strip.icao})` : ''}</strong><br/>${meta}`)
      marker.addTo(airfieldLayerRef.current!)
    })

    return () => {
      map.remove()
      mapRef.current = null
      layerGroupRef.current = null
      airfieldLayerRef.current = null
      patternLayerRef.current = null
    }
  }, [])

  // Redraw markers, midpoint handles, and the route line whenever the
  // waypoints change. Only auto-fits the view when waypoints are added or
  // removed (not on every drag/edit), so the map doesn't jump around while
  // you're actively working with it.
  useEffect(() => {
    const map = mapRef.current
    const layerGroup = layerGroupRef.current
    if (!map || !layerGroup) return

    layerGroup.clearLayers()

    const valid = waypoints.filter((w) => Number.isFinite(w.lat) && Number.isFinite(w.lon) && (w.lat !== 0 || w.lon !== 0))

    valid.forEach((wp) => {
      const marker = L.marker([wp.lat, wp.lon], { icon: waypointIcon, draggable: true })
      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        onMoveWaypoint(wp.id, pos.lat, pos.lng)
      })
      marker.on('click', () => onSelectWaypoint(wp.id))
      const label = wp.name || 'Unnamed waypoint'
      const meta = [
        wp.elevationFt !== undefined ? `${wp.elevationFt}ft elev` : null,
        wp.runway ? `rwy ${wp.runway}` : null
      ]
        .filter(Boolean)
        .join(' &middot; ')
      marker.bindPopup(`<strong>${label}</strong>${meta ? `<br/>${meta}` : ''}`)
      marker.addTo(layerGroup)

      if (glide && glide.radiusNm > 0) {
        const center = destinationPoint(wp, glide.downwindBearingDeg, glide.driftNm)
        L.circle([center.lat, center.lon], {
          radius: glide.radiusNm * 1852, // nm to metres
          color: '#f2a93b',
          weight: 1.5,
          fillColor: '#f2a93b',
          fillOpacity: 0.06,
          dashArray: '4 4'
        }).addTo(layerGroup)
      }
    })

    if (valid.length >= 2) {
      L.polyline(
        valid.map((wp) => [wp.lat, wp.lon] as L.LatLngTuple),
        { color: '#4fd1c5', weight: 3, opacity: 0.85 }
      ).addTo(layerGroup)

      // Midpoint drag handles: dragging one inserts a new waypoint between
      // the two it sits between, at the dropped position.
      for (let i = 0; i < valid.length - 1; i++) {
        const a = valid[i]
        const b = valid[i + 1]
        const midLat = (a.lat + b.lat) / 2
        const midLon = (a.lon + b.lon) / 2
        const afterIndex = waypoints.findIndex((w) => w.id === a.id)

        const handle = L.marker([midLat, midLon], { icon: midpointIcon, draggable: true, opacity: 0.85 })
        handle.on('dragend', () => {
          const pos = handle.getLatLng()
          onInsertWaypoint(afterIndex, pos.lat, pos.lng)
        })
        handle.addTo(layerGroup)
      }
    }

    const idsKey = valid.map((w) => w.id).join(',')
    if (idsKey !== prevIdsKeyRef.current) {
      prevIdsKeyRef.current = idsKey
      if (valid.length === 1) {
        map.setView([valid[0].lat, valid[0].lon], 9)
      } else if (valid.length >= 2) {
        const bounds = L.latLngBounds(valid.map((wp) => [wp.lat, wp.lon] as L.LatLngTuple))
        map.fitBounds(bounds, { padding: [32, 32] })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypoints, glide])

  // Traffic pattern overlay — its own layer so it redraws independently of
  // waypoint edits/drags.
  useEffect(() => {
    const patternLayer = patternLayerRef.current
    if (!patternLayer) return
    patternLayer.clearLayers()
    if (!pattern) return

    // Bright, high-contrast colors distinct from everything else already on
    // this map (route line is cyan, glide circles are amber, live marker is
    // magenta) — yellow reads clearly against every tile layer and against
    // the dark UI chrome alike.
    const legColors: Record<string, string> = {
      Runway: '#ffffff',
      Crosswind: '#ffe066',
      Downwind: '#ffe066',
      Base: '#ffe066',
      Final: '#ff6b35'
    }

    pattern.legs.forEach((leg) => {
      const latLngs = leg.points.map((p) => [p.lat, p.lon] as L.LatLngTuple)
      const color = legColors[leg.name] ?? '#ffe066'
      // Dark "casing" line underneath, slightly thicker, so the bright line
      // reads clearly against light and dark map tiles alike.
      L.polyline(latLngs, {
        color: '#0d1117',
        weight: leg.name === 'Runway' ? 8 : 6,
        opacity: 0.75
      }).addTo(patternLayer)
      L.polyline(latLngs, {
        color,
        weight: leg.name === 'Runway' ? 5 : 3.5,
        opacity: 1
      })
        .bindTooltip(leg.name, { permanent: false, direction: 'center' })
        .addTo(patternLayer)
    })
  }, [pattern])

  // Live GPS marker lives outside the main layer group and is updated in
  // place (setLatLng) rather than recreated, so frequent position updates
  // don't cause the rest of the map (markers, glide circles) to redraw.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!livePosition) {
      if (liveMarkerRef.current) {
        liveMarkerRef.current.remove()
        liveMarkerRef.current = null
      }
      return
    }

    const latLng: L.LatLngTuple = [livePosition.lat, livePosition.lon]
    if (liveMarkerRef.current) {
      liveMarkerRef.current.setLatLng(latLng)
      liveMarkerRef.current.setIcon(liveIcon(livePosition.headingDeg))
    } else {
      liveMarkerRef.current = L.marker(latLng, {
        icon: liveIcon(livePosition.headingDeg),
        zIndexOffset: 1000
      }).addTo(map)
    }
  }, [livePosition])

  // Leaflet measures its container at creation/update time. If that
  // container was display:none (e.g. its section wasn't the open one),
  // Leaflet thinks it has 0x0 size and never recovers on its own — this
  // fixes it the moment the panel actually becomes visible. Also needed
  // when toggling fullscreen, since that resizes the container too.
  useEffect(() => {
    if (!visible || !mapRef.current) return
    const id = requestAnimationFrame(() => {
      mapRef.current?.invalidateSize()
    })
    return () => cancelAnimationFrame(id)
  }, [visible, fullscreen])

  return (
    <div
      ref={containerRef}
      className={fullscreen ? 'route-map route-map-fullscreen' : 'route-map'}
    />
  )
}
