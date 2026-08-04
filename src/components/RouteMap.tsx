import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
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
  glide?: GlideResult // planning circles at each waypoint, based on planned cruise altitude
  liveGlide?: GlideResult // single circle around the live position, based on actual GPS altitude
  livePosition?: LivePosition | null
  visible?: boolean // pass false while the containing panel is display:none
  pattern?: TrafficPatternResult | null
  fullscreen?: boolean
  onToggleFullscreen?: () => void
  historyTrack?: { lat: number; lon: number }[] | null
}

// Icon size doubles as the draggable hit-area (Leaflet centers it on
// iconAnchor), so sizing it well above the visible dot makes these
// meaningfully easier to grab on a touchscreen, not just easier to see.
const waypointIcon = L.divIcon({
  className: 'map-waypoint-icon',
  html: '<div class="map-waypoint-dot"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13]
})

const midpointIcon = L.divIcon({
  className: 'map-midpoint-icon',
  html: '<div class="map-midpoint-dot"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
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

// Zoom level to snap to when "Follow" is first turned on — roughly a 5km
// view width at typical screen sizes and latitudes.
const FOLLOW_ZOOM = 13

export default function RouteMap({
  waypoints,
  onMoveWaypoint,
  onInsertWaypoint,
  onSelectWaypoint,
  glide,
  liveGlide,
  livePosition,
  visible = true,
  pattern,
  fullscreen = false,
  onToggleFullscreen,
  historyTrack
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerGroupRef = useRef<L.LayerGroup | null>(null)
  const airfieldLayerRef = useRef<L.LayerGroup | null>(null)
  const patternLayerRef = useRef<L.LayerGroup | null>(null)
  const historyLayerRef = useRef<L.LayerGroup | null>(null)
  const liveGlideLayerRef = useRef<L.LayerGroup | null>(null)
  const liveMarkerRef = useRef<L.Marker | null>(null)
  const prevIdsKeyRef = useRef<string>('')
  const onToggleFullscreenRef = useRef(onToggleFullscreen)
  onToggleFullscreenRef.current = onToggleFullscreen
  const followBtnRef = useRef<HTMLButtonElement | null>(null)
  const wasFollowingRef = useRef(false)

  // "Follow me" (re-center on GPS position) and manual map rotation (via
  // the on-map rotate knob) are view-only preferences, kept local to the
  // map rather than lifted to App state. rotationDeg is the direction
  // currently pointing "up" on screen — 0 means north-up.
  const [follow, setFollow] = useState(false)
  const [rotationDeg, setRotationDeg] = useState(0)

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

    // OpenAIP aviation overlay (airspace, airports, navaids, reporting
    // points combined — confirmed via OpenAIP's own published OpenAPI spec
    // that the PNG endpoint only has one combined "openaip" layer, not
    // separate per-category ones; an earlier version guessed at
    // "airspaces"/"airports"/etc. layer names from secondhand examples,
    // which 404'd since those aren't real values for this endpoint).
    // Skipped entirely if no API key is configured, rather than showing a
    // broken/empty layer option.
    const openAipKey = import.meta.env.VITE_OPENAIP_API_KEY as string | undefined
    let openAipOverlays: Record<string, L.TileLayer> | undefined
    if (openAipKey) {
      openAipOverlays = {
        'Aviation overlay (OpenAIP)': L.tileLayer(
          `https://api.tiles.openaip.net/api/data/openaip/{z}/{x}/{y}.png?apiKey=${openAipKey}`,
          {
            attribution: '&copy; <a href="https://www.openaip.net">OpenAIP</a>',
            minZoom: 2,
            maxZoom: 14,
            // Confirmed empirically by fetching tiles directly over a busy
            // airport: standard XYZ addressing returns real chart content,
            // while tms:true (flipped Y) lands on a mirrored, empty region
            // and returns the same blank tile everywhere — which is why the
            // overlay drew nothing despite loading successfully (200 OK).
            detectRetina: true,
            opacity: 0.8
          }
        )
      }
    }

    L.control
      .layers(
        { 'OpenStreetMap (everywhere)': osm, 'Norway topo (Kartverket)': kartverketTopo },
        openAipOverlays,
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

    // "Follow me" — re-centers on the live GPS position as it updates.
    const FollowControl = L.Control.extend({
      onAdd: function () {
        const btn = L.DomUtil.create('button', 'map-follow-btn')
        btn.type = 'button'
        btn.innerHTML = '&#9678;'
        btn.title = 'Follow my position'
        L.DomEvent.disableClickPropagation(btn)
        btn.onclick = () => setFollow((f) => !f)
        followBtnRef.current = btn
        return btn
      }
    })
    new FollowControl({ position: 'topleft' }).addTo(map)

    // Manually panning the map means the pilot wants to look elsewhere —
    // drop out of follow mode rather than keep fighting their drag on the
    // next GPS update, matching how phone nav apps behave.
    map.on('dragstart', () => setFollow(false))

    // Rotating grows and re-centers the actual Leaflet container well
    // beyond the visible frame (see the sizing effect below), which would
    // otherwise carry Leaflet's own control buttons — anchored to that
    // container's corners — off-screen with it. Move the control layer out
    // to the stable wrapper instead, which Leaflet's own corner-anchoring
    // CSS positions correctly since the wrapper is themselves `position:
    // relative`.
    const controlContainer = containerRef.current?.querySelector('.leaflet-control-container')
    if (controlContainer && wrapRef.current) {
      wrapRef.current.appendChild(controlContainer)
    }

    mapRef.current = map
    layerGroupRef.current = L.layerGroup().addTo(map)
    airfieldLayerRef.current = L.layerGroup().addTo(map)
    patternLayerRef.current = L.layerGroup().addTo(map)
    historyLayerRef.current = L.layerGroup().addTo(map)
    liveGlideLayerRef.current = L.layerGroup().addTo(map)

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
      historyLayerRef.current = null
      liveGlideLayerRef.current = null
    }
  }, [])

  // Only the on/off state matters for deciding whether to show the
  // per-waypoint planning circles below — using this instead of
  // livePosition itself in the effect's deps keeps that (expensive, redraws
  // every marker/line) effect from re-running on every single GPS tick.
  const hasLivePosition = !!livePosition

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

      // Once GPS is on, a single circle follows the live position instead
      // (see the liveGlide effect below) — showing both would be redundant
      // and clutter the map with numbers that no longer reflect where the
      // aircraft actually is.
      if (!hasLivePosition && glide && glide.radiusNm > 0) {
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
      const routeLatLngs = valid.map((wp) => [wp.lat, wp.lon] as L.LatLngTuple)
      // Dark casing underneath the bright route line, same trick used for
      // the traffic pattern legs — keeps it readable against light terrain
      // tiles, not just dark ones.
      L.polyline(routeLatLngs, { color: '#0d1117', weight: 7, opacity: 0.6 }).addTo(layerGroup)
      L.polyline(routeLatLngs, { color: '#4fd1c5', weight: 4, opacity: 1 }).addTo(layerGroup)

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
        map.setView([valid[0].lat, valid[0].lon], FOLLOW_ZOOM)
      } else if (valid.length >= 2) {
        const bounds = L.latLngBounds(valid.map((wp) => [wp.lat, wp.lon] as L.LatLngTuple))
        // Caps how far it zooms in for close-together waypoints — without
        // this, two waypoints a couple km apart fit so tight the map is
        // barely usable.
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: FOLLOW_ZOOM })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypoints, glide, hasLivePosition])

  // Single glide-range circle that follows the live GPS position, using the
  // aircraft's actual current altitude (falling back to planned cruise
  // altitude when the device doesn't report one) rather than the static
  // per-waypoint circles above, which stop being drawn once GPS is on.
  useEffect(() => {
    const liveGlideLayer = liveGlideLayerRef.current
    if (!liveGlideLayer) return
    liveGlideLayer.clearLayers()
    if (!livePosition || !liveGlide || liveGlide.radiusNm <= 0) return

    const center = destinationPoint(livePosition, liveGlide.downwindBearingDeg, liveGlide.driftNm)
    L.circle([center.lat, center.lon], {
      radius: liveGlide.radiusNm * 1852, // nm to metres
      color: '#f2a93b',
      weight: 1.5,
      fillColor: '#f2a93b',
      fillOpacity: 0.06,
      dashArray: '4 4'
    }).addTo(liveGlideLayer)
  }, [livePosition, liveGlide])

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

  // A saved past flight's GPS breadcrumb trail, shown as a distinct dashed
  // line so it never gets confused with the planned route above. Selecting
  // one also re-fits the view so the whole flown track is visible.
  useEffect(() => {
    const map = mapRef.current
    const historyLayer = historyLayerRef.current
    if (!map || !historyLayer) return
    historyLayer.clearLayers()
    if (!historyTrack || historyTrack.length < 2) return

    const latLngs = historyTrack.map((p) => [p.lat, p.lon] as L.LatLngTuple)
    L.polyline(latLngs, {
      color: '#a78bfa',
      weight: 3,
      opacity: 0.85,
      dashArray: '2 6'
    }).addTo(historyLayer)

    map.fitBounds(L.latLngBounds(latLngs), { padding: [32, 32] })
  }, [historyTrack])

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

  // Re-centers on the live position while follow is on: snaps to the
  // follow zoom level the moment it's turned on, then just pans (keeping
  // whatever zoom the pilot has since chosen) on every update after that.
  useEffect(() => {
    const map = mapRef.current
    if (!follow || !map || !livePosition) {
      wasFollowingRef.current = false
      return
    }
    const latLng: L.LatLngTuple = [livePosition.lat, livePosition.lon]
    if (!wasFollowingRef.current) {
      map.setView(latLng, FOLLOW_ZOOM, { animate: true })
      wasFollowingRef.current = true
    } else {
      map.panTo(latLng, { animate: true })
    }
  }, [livePosition, follow])

  useEffect(() => {
    followBtnRef.current?.classList.toggle('active', follow)
  }, [follow])

  // Rotates the whole map to the manually-chosen direction, by CSS-rotating
  // the container itself — tiles and markers (including the live plane
  // icon) all turn together. Driven entirely by the rotate knob below, not
  // by live heading — continuously re-rotating on every (often noisy) GPS
  // heading update was choppy on real devices, so rotation only changes on
  // deliberate input now. This is a lightweight approach rather than a
  // rotation-aware tile renderer, so dragging/clicking position while
  // rotated will feel offset (best used together with Follow, not while
  // editing the route).
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.transform = rotationDeg ? `rotate(${-rotationDeg}deg)` : ''
    }
  }, [rotationDeg])

  // Leaflet only ever loads tiles to cover its own (unrotated) container
  // size — rotating that container via CSS then visibly exposes the
  // square edge of loaded tiles near the frame's corners, since the
  // rotated square's bounding box is bigger than the square itself. Fix:
  // while rotated, grow the actual Leaflet container to the wrapper's
  // diagonal (so it's guaranteed to cover the frame at any rotation
  // angle) and center it, then let Leaflet re-measure and load tiles for
  // that larger area. Reverts to filling the wrapper exactly at 0°.
  const isRotated = rotationDeg !== 0
  useEffect(() => {
    const wrap = wrapRef.current
    const container = containerRef.current
    if (!wrap || !container) return

    function applySizing() {
      if (!wrap || !container) return
      if (isRotated) {
        const { width, height } = wrap.getBoundingClientRect()
        // The wrapper measures 0×0 while its panel is display:none (e.g. a
        // different accordion section is open) — sizing off that would
        // shrink the actual map container to nothing and leave it that way
        // even after the panel becomes visible again, since nothing else
        // would trigger a recalculation. Just leave sizing as it was; the
        // `visible` dependency below re-runs this once it's back on screen.
        if (width === 0 || height === 0) return
        const diagonal = Math.ceil(Math.sqrt(width * width + height * height))
        container.style.position = 'absolute'
        container.style.width = `${diagonal}px`
        container.style.height = `${diagonal}px`
        container.style.left = `${(width - diagonal) / 2}px`
        container.style.top = `${(height - diagonal) / 2}px`
      } else {
        container.style.position = ''
        container.style.width = ''
        container.style.height = ''
        container.style.left = ''
        container.style.top = ''
      }
      mapRef.current?.invalidateSize()
    }

    applySizing()
    if (!isRotated) return
    // Re-measure on device rotation/resize, and when the panel becomes
    // visible again after being hidden (see the 0×0 guard above).
    window.addEventListener('resize', applySizing)
    return () => window.removeEventListener('resize', applySizing)
  }, [isRotated, fullscreen, visible])

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

  // Toggle the fullscreen class directly via classList instead of through
  // React's className prop. Leaflet adds its own classes (leaflet-container,
  // leaflet-touch, etc.) straight to the inner container DOM node outside
  // of React's knowledge — if className were re-rendered as a template
  // string on that node, React would overwrite the whole attribute and
  // wipe those out, which broke Leaflet's own layout containment
  // (overflow: hidden) and left the map spilling over the rest of the page
  // after leaving fullscreen. The fixed positioning lives on this outer
  // wrapper instead, which React never touches, so that risk doesn't apply
  // here — but keeping it off the className prop for consistency.
  useEffect(() => {
    wrapRef.current?.classList.toggle('route-map-wrap-fullscreen', fullscreen)
  }, [fullscreen])

  return (
    <div ref={wrapRef} className="route-map-wrap">
      <div ref={containerRef} className="route-map" />
      {livePosition && (
        <div className="map-hud">
          {livePosition.speedKt !== undefined && (
            <div className="map-hud-item">
              <span className="map-hud-label">GS</span>
              {Math.round(livePosition.speedKt)} kt
            </div>
          )}
          {livePosition.headingDeg !== undefined && (
            <div className="map-hud-item">
              <span className="map-hud-label">TRK</span>
              {Math.round(livePosition.headingDeg)}&deg;
            </div>
          )}
        </div>
      )}
      <RotateKnob rotationDeg={rotationDeg} onChange={setRotationDeg} />
    </div>
  )
}

// A small draggable compass dial for manually rotating the map — kept off
// the map surface entirely (rather than a two-finger twist gesture on the
// map itself) so it never competes with Leaflet's own two-finger
// pinch-to-zoom. Drag left/right anywhere on the dial like a jog wheel —
// rotation tracks how far you've swiped, not your finger's exact position,
// so it stays stable and predictable even with imprecise touch input.
// (An earlier version computed an absolute angle from the dial's center,
// which made tiny movements near that center swing the angle wildly —
// exactly the "choppy, flips direction" feel this replaces.) Double-click/
// tap resets to north-up.
const ROTATE_SENSITIVITY_DEG_PER_PX = 1.2

function RotateKnob({
  rotationDeg,
  onChange
}: {
  rotationDeg: number
  onChange: (deg: number) => void
}) {
  const lastXRef = useRef<number | null>(null)

  function handlePointerDown(e: ReactPointerEvent) {
    lastXRef.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: ReactPointerEvent) {
    const lastX = lastXRef.current
    if (lastX === null) return
    const dx = e.clientX - lastX
    lastXRef.current = e.clientX
    if (dx === 0) return
    onChange(Math.round(rotationDeg + dx * ROTATE_SENSITIVITY_DEG_PER_PX + 360) % 360)
  }

  function handlePointerUp(e: ReactPointerEvent) {
    lastXRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return (
    <div
      className={rotationDeg ? 'map-rotate-knob active' : 'map-rotate-knob'}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={() => onChange(0)}
      title="Drag to rotate the map · double-click to reset to north-up"
    >
      <div className="map-rotate-knob-needle" style={{ transform: `rotate(${rotationDeg}deg)` }} />
      <span className="map-rotate-knob-n" style={{ transform: `rotate(${rotationDeg}deg)` }}>
        N
      </span>
    </div>
  )
}
