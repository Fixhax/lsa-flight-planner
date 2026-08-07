import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import L from 'leaflet'
import type { Waypoint } from '../lib/planning'
import { destinationPoint, distanceNm } from '../lib/geo'
import type { GlideResult } from '../lib/glide'
import type { LivePosition } from '../lib/liveTracking'
import { airstrips, type AirstripEntry } from '../data/strips'
import type { TrafficPatternResult } from '../lib/trafficPattern'
import type { EngineOutTarget, UnverifiedSite } from '../lib/engineOut'
import MapInfoDrawer from './MapInfoDrawer'
import AirfieldNotes from './AirfieldNotes'
import WindsockOverlay from './WindsockOverlay'
import { useCloseOnOutsideClick } from '../hooks/useCloseOnOutsideClick'

interface Props {
  waypoints: Waypoint[]
  onMoveWaypoint: (id: string, lat: number, lon: number) => void
  onInsertWaypoint: (afterIndex: number, lat: number, lon: number) => void
  onInsertStrip: (afterIndex: number, strip: AirstripEntry) => void
  onSelectWaypoint: (id: string) => void
  glide?: GlideResult // planning circles at each waypoint, based on planned cruise altitude
  liveGlide?: GlideResult // single circle around the live position, based on actual GPS altitude
  livePosition?: LivePosition | null
  fuelBurnLph?: number // aircraft's cruise fuel burn, for the estimated-fuel-used figure on the direct-to badge
  cruiseSpeedKt?: number // fallback ground speed for the direct-to ETA/fuel estimate when live GPS speed isn't usable
  visible?: boolean // pass false while the containing panel is display:none
  pattern?: TrafficPatternResult | null
  fullscreen?: boolean
  onToggleFullscreen?: () => void
  historyTrack?: { lat: number; lon: number }[] | null
  engineOutActive?: boolean
  engineOutTarget?: EngineOutTarget | null
  engineOutSites?: UnverifiedSite[] | null
  engineOutLoading?: boolean
  engineOutError?: string | null
  onToggleEngineOut?: () => void
  userId?: string | null
  userEmail?: string | null
  canUndoWaypoint?: boolean
  onUndoWaypoint?: () => void
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

// Reused as the drag-preview marker shown while pressing and dragging
// anywhere on the route line (see the line-drag handler below) — there's
// no longer a permanently-placed midpoint dot, but the same small-dot
// styling still reads well as a "you're about to drop a waypoint here"
// indicator.
const midpointIcon = L.divIcon({
  className: 'map-midpoint-icon',
  html: '<div class="map-midpoint-dot"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
})

// How far the pointer has to move from where it went down on the route
// line before a drag actually starts (and a new waypoint gets created) —
// below this, it reads as just a tap on the line (which does nothing),
// not an attempt to pull a new waypoint out of it.
const LINE_DRAG_START_PX = 8

// Perpendicular distance in screen pixels from a point to a line segment,
// clamped to the segment's ends — used to figure out which leg of the
// route a press-on-the-line gesture actually landed nearest to.
function pointToSegmentDistancePx(p: L.Point, a: L.Point, b: L.Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

function closestLegIndex(map: L.Map, at: L.LatLng, valid: { lat: number; lon: number }[]): number {
  const p = map.latLngToContainerPoint(at)
  let bestIdx = 0
  let bestDist = Infinity
  for (let i = 0; i < valid.length - 1; i++) {
    const a = map.latLngToContainerPoint([valid[i].lat, valid[i].lon])
    const b = map.latLngToContainerPoint([valid[i + 1].lat, valid[i + 1].lon])
    const dist = pointToSegmentDistancePx(p, a, b)
    if (dist < bestDist) {
      bestDist = dist
      bestIdx = i
    }
  }
  return bestIdx
}

// Every curated strip, shown always (not just ones in the current route) so
// nearby fields are visible for reference — a distinct diamond shape and
// muted color so they never compete visually with the active route/waypoints.
// Same larger-tap-area-than-visible-mark trick as the waypoint/midpoint
// icons above — the previous 10x10 hit area was hard to hit reliably with
// a finger, especially with several fields close together at typical
// zoom levels.
const airfieldIcon = L.divIcon({
  className: 'map-airfield-icon',
  html: '<div class="map-airfield-diamond"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
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
// scoped to, used until there are waypoints to fit bounds to. Zoom 8 puts
// roughly 100nm across a typical phone-width viewport at this latitude
// (156543 * cos(63°) / 2^8 ≈ 278 m/px) — a useful "local area" scale for
// picking a departure field, rather than the whole-Scandinavia view a
// lower zoom would open on.
const DEFAULT_CENTER: L.LatLngExpression = [63, 13]
const DEFAULT_ZOOM = 8

// Zoom level to snap to when "Follow" is first turned on — roughly a 5km
// view width at typical screen sizes and latitudes.
const FOLLOW_ZOOM = 13

export default function RouteMap({
  waypoints,
  onMoveWaypoint,
  onInsertWaypoint,
  onInsertStrip,
  onSelectWaypoint,
  glide,
  liveGlide,
  livePosition,
  fuelBurnLph,
  cruiseSpeedKt,
  visible = true,
  pattern,
  fullscreen = false,
  onToggleFullscreen,
  historyTrack,
  engineOutActive = false,
  engineOutTarget,
  engineOutSites,
  engineOutLoading = false,
  engineOutError,
  onToggleEngineOut,
  userId = null,
  userEmail = null,
  canUndoWaypoint = false,
  onUndoWaypoint
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerGroupRef = useRef<L.LayerGroup | null>(null)
  const airfieldLayerRef = useRef<L.LayerGroup | null>(null)
  const patternLayerRef = useRef<L.LayerGroup | null>(null)
  const historyLayerRef = useRef<L.LayerGroup | null>(null)
  const liveGlideLayerRef = useRef<L.LayerGroup | null>(null)
  const directToLayerRef = useRef<L.LayerGroup | null>(null)
  const engineOutLayerRef = useRef<L.LayerGroup | null>(null)
  const etaBarLayerRef = useRef<L.LayerGroup | null>(null)
  const liveMarkerRef = useRef<L.Marker | null>(null)
  const prevIdsKeyRef = useRef<string>('')
  const onToggleFullscreenRef = useRef(onToggleFullscreen)
  onToggleFullscreenRef.current = onToggleFullscreen
  const onToggleEngineOutRef = useRef(onToggleEngineOut)
  onToggleEngineOutRef.current = onToggleEngineOut
  const onUndoWaypointRef = useRef(onUndoWaypoint)
  onUndoWaypointRef.current = onUndoWaypoint
  const followBtnRef = useRef<HTMLButtonElement | null>(null)
  const infoBtnRef = useRef<HTMLButtonElement | null>(null)
  const engineOutBtnRef = useRef<HTMLButtonElement | null>(null)
  const undoBtnRef = useRef<HTMLButtonElement | null>(null)
  const wasFollowingRef = useRef(false)
  const longPressMenuRef = useRef<HTMLDivElement | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null)
  const airfieldPanelRef = useRef<HTMLDivElement | null>(null)

  // "Follow me" (re-center on GPS position) and manual map rotation (via
  // the on-map rotate knob) are view-only preferences, kept local to the
  // map rather than lifted to App state. rotationDeg is the direction
  // currently pointing "up" on screen — 0 means north-up.
  const [follow, setFollow] = useState(false)
  const [rotationDeg, setRotationDeg] = useState(0)

  // Push-and-hold on empty map space opens a small "add waypoint here" /
  // "direct to here" menu at that spot. screenX/screenY are relative to
  // wrapRef, for positioning the menu; lat/lon are the tapped location.
  const [longPressMenu, setLongPressMenu] = useState<{
    screenX: number
    screenY: number
    lat: number
    lon: number
  } | null>(null)

  // Tapping a curated airfield diamond opens this info panel instead of a
  // plain Leaflet popup, so it can show richer info (frequencies, PPR
  // contact) and offer the same start/destination/waypoint actions the
  // long-press menu has, prefilled with everything known about the field
  // rather than just bare coordinates. Fixed-centered on screen (see the
  // CSS) rather than anchored to the tapped marker, so it's readable and
  // reachable regardless of where on the map you tapped.
  const [selectedAirfield, setSelectedAirfield] = useState<AirstripEntry | null>(null)

  // "Direct to" target, only meaningful while GPS is on — draws a live
  // guidance line from the aircraft's current position to this point
  // without touching the planned route. (With GPS off there's no live
  // position to draw from, so "Direct to" falls back to inserting a
  // waypoint instead — see the menu handler below.)
  const [directTo, setDirectTo] = useState<{ lat: number; lon: number } | null>(null)

  // Collapsible drawer with nearby radio frequencies and an OpenAIP
  // airspace-ceiling lookup — toggled from a button on the map itself so
  // it's reachable without leaving this panel while flying.
  const [showInfoDrawer, setShowInfoDrawer] = useState(false)

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

    // Nearby-info drawer — radio frequencies within range and an OpenAIP
    // airspace-ceiling lookup, without leaving the map.
    const InfoControl = L.Control.extend({
      onAdd: function () {
        const btn = L.DomUtil.create('button', 'map-info-btn')
        btn.type = 'button'
        btn.innerHTML = '&#8505;'
        btn.title = 'Nearby frequencies & airspace'
        L.DomEvent.disableClickPropagation(btn)
        btn.onclick = () => setShowInfoDrawer((s) => !s)
        infoBtnRef.current = btn
        return btn
      }
    })
    new InfoControl({ position: 'topleft' }).addTo(map)

    // Engine out — direct-to line to the nearest curated airfield still
    // inside the live glide footprint, plus an unverified fields/roads
    // reference overlay. All the actual targeting logic lives in App.tsx
    // (lib/engineOut.ts); this button just toggles it.
    const EngineOutControl = L.Control.extend({
      onAdd: function () {
        const btn = L.DomUtil.create('button', 'map-engineout-btn')
        btn.type = 'button'
        btn.innerHTML = '&#9888;'
        btn.title = 'Engine out — direct to nearest reachable field'
        L.DomEvent.disableClickPropagation(btn)
        btn.onclick = () => onToggleEngineOutRef.current?.()
        engineOutBtnRef.current = btn
        return btn
      }
    })
    new EngineOutControl({ position: 'topleft' }).addTo(map)

    // Undo the last route edit — same action as the Undo button in the
    // waypoint list below, exposed here too so it's reachable without
    // scrolling away from the map while actively tapping/dragging waypoints.
    const UndoControl = L.Control.extend({
      onAdd: function () {
        const btn = L.DomUtil.create('button', 'map-undo-btn')
        btn.type = 'button'
        btn.innerHTML = '&#8630;'
        btn.title = 'Undo last route edit'
        L.DomEvent.disableClickPropagation(btn)
        btn.onclick = () => onUndoWaypointRef.current?.()
        undoBtnRef.current = btn
        return btn
      }
    })
    new UndoControl({ position: 'topleft' }).addTo(map)

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

    // Push-and-hold anywhere on the map (that isn't a marker/popup/control)
    // opens the add-waypoint/direct-to menu at that point. Desktop right-
    // click opens the same menu, since holding a mouse button down isn't a
    // natural gesture there. Plain native listeners rather than Leaflet
    // events, since Leaflet has no built-in long-press concept.
    const LONG_PRESS_MS = 550
    const LONG_PRESS_MOVE_CANCEL_PX = 12

    function clearLongPressTimer() {
      if (longPressTimerRef.current !== null) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    }

    function openLongPressMenuAt(clientX: number, clientY: number) {
      const wrap = wrapRef.current
      if (!wrap) return
      const latlng = map.mouseEventToLatLng({ clientX, clientY } as unknown as MouseEvent)
      const rect = wrap.getBoundingClientRect()
      setSelectedAirfield(null)
      setLongPressMenu({ screenX: clientX - rect.left, screenY: clientY - rect.top, lat: latlng.lat, lon: latlng.lng })
    }

    function isOnInteractiveElement(target: EventTarget | null) {
      const el = target as HTMLElement | null
      return !!el?.closest('.leaflet-marker-icon, .leaflet-popup, .leaflet-control, .route-line-hit-area')
    }

    function handlePointerDown(e: PointerEvent) {
      if (isOnInteractiveElement(e.target)) return
      longPressStartRef.current = { x: e.clientX, y: e.clientY }
      clearLongPressTimer()
      const { clientX, clientY } = e
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null
        openLongPressMenuAt(clientX, clientY)
      }, LONG_PRESS_MS)
    }

    function handlePointerMove(e: PointerEvent) {
      const start = longPressStartRef.current
      if (!start) return
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > LONG_PRESS_MOVE_CANCEL_PX) {
        clearLongPressTimer()
        longPressStartRef.current = null
      }
    }

    function handlePointerEnd() {
      clearLongPressTimer()
      longPressStartRef.current = null
    }

    function handleContextMenu(e: MouseEvent) {
      if (isOnInteractiveElement(e.target)) return
      e.preventDefault()
      openLongPressMenuAt(e.clientX, e.clientY)
    }

    const container = containerRef.current!
    container.addEventListener('pointerdown', handlePointerDown)
    container.addEventListener('pointermove', handlePointerMove)
    container.addEventListener('pointerup', handlePointerEnd)
    container.addEventListener('pointercancel', handlePointerEnd)
    container.addEventListener('contextmenu', handleContextMenu)

    mapRef.current = map
    layerGroupRef.current = L.layerGroup().addTo(map)
    airfieldLayerRef.current = L.layerGroup().addTo(map)
    patternLayerRef.current = L.layerGroup().addTo(map)
    historyLayerRef.current = L.layerGroup().addTo(map)
    liveGlideLayerRef.current = L.layerGroup().addTo(map)
    directToLayerRef.current = L.layerGroup().addTo(map)
    engineOutLayerRef.current = L.layerGroup().addTo(map)
    etaBarLayerRef.current = L.layerGroup().addTo(map)

    // Every curated strip is shown on the map at all times, not just ones
    // in the current route — this list never changes at runtime, so it's
    // populated once here rather than in the per-render redraw effect.
    airstrips.forEach((strip) => {
      const marker = L.marker([strip.lat, strip.lon], { icon: airfieldIcon })
      marker.on('click', () => {
        setLongPressMenu(null)
        setSelectedAirfield(strip)
      })
      marker.addTo(airfieldLayerRef.current!)
    })

    return () => {
      clearLongPressTimer()
      container.removeEventListener('pointerdown', handlePointerDown)
      container.removeEventListener('pointermove', handlePointerMove)
      container.removeEventListener('pointerup', handlePointerEnd)
      container.removeEventListener('pointercancel', handlePointerEnd)
      container.removeEventListener('contextmenu', handleContextMenu)
      map.remove()
      mapRef.current = null
      layerGroupRef.current = null
      airfieldLayerRef.current = null
      patternLayerRef.current = null
      historyLayerRef.current = null
      liveGlideLayerRef.current = null
      directToLayerRef.current = null
      engineOutLayerRef.current = null
      etaBarLayerRef.current = null
    }
  }, [])

  useCloseOnOutsideClick(longPressMenuRef, !!longPressMenu, () => setLongPressMenu(null))
  useCloseOnOutsideClick(airfieldPanelRef, !!selectedAirfield, () => setSelectedAirfield(null))

  useEffect(() => {
    setLongPressMenu(null)
    setSelectedAirfield(null)
  }, [fullscreen])

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
          color: '#ffb703',
          weight: 2.5,
          fillColor: '#ffb703',
          fillOpacity: 0.14,
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

      // Invisible, much wider line laid on top purely as a touch/click
      // target — the visible line above is only 4px wide, nowhere near
      // enough to reliably grab with a finger, same reasoning as the
      // oversized waypoint/midpoint/airfield icon hit areas elsewhere in
      // this file. className lets the long-press handler's
      // isOnInteractiveElement check recognize it and skip its own
      // long-press timer, so the two gestures never both fire.
      const hitLine = L.polyline(routeLatLngs, {
        color: '#000',
        weight: 24,
        opacity: 0,
        className: 'route-line-hit-area'
      }).addTo(layerGroup)

      // Press anywhere on the line and drag to pull a new waypoint out of
      // whichever leg you grabbed, dropped wherever you release — replaces
      // the old fixed-at-the-midpoint drag handles with something you can
      // start from any point along the route, not just its exact center.
      // A plain tap (no real movement) intentionally does nothing, so
      // tapping the line to glance at it doesn't accidentally insert a
      // waypoint at zero drag distance.
      hitLine.on('mousedown', (evt) => {
        // Cast inside the body rather than typing the callback parameter
        // itself as LeafletMouseEvent — Leaflet's .on() typings expect a
        // plain LeafletEvent handler, and a narrower parameter type there
        // fails TypeScript's contravariant parameter check.
        const e = evt as L.LeafletMouseEvent
        const orig = e.originalEvent as PointerEvent
        L.DomEvent.stop(orig)
        const startX = orig.clientX
        const startY = orig.clientY
        const afterIndex = waypoints.findIndex((w) => w.id === valid[closestLegIndex(map, e.latlng, valid)].id)

        let started = false
        let previewMarker: L.Marker | null = null

        function handlePointerMove(ev: PointerEvent) {
          const latlng = map.mouseEventToLatLng(ev as unknown as MouseEvent)
          if (!started) {
            if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < LINE_DRAG_START_PX) return
            started = true
            previewMarker = L.marker(latlng, { icon: midpointIcon, opacity: 0.9, interactive: false }).addTo(map)
          }
          previewMarker?.setLatLng(latlng)
        }

        function endDrag(ev: PointerEvent) {
          window.removeEventListener('pointermove', handlePointerMove)
          window.removeEventListener('pointerup', endDrag)
          window.removeEventListener('pointercancel', endDrag)
          if (started && previewMarker) {
            const finalLatLng = map.mouseEventToLatLng(ev as unknown as MouseEvent)
            previewMarker.remove()
            onInsertWaypoint(afterIndex, finalLatLng.lat, finalLatLng.lng)
          }
        }

        window.addEventListener('pointermove', handlePointerMove)
        window.addEventListener('pointerup', endDrag)
        window.addEventListener('pointercancel', endDrag)
      })
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
      color: '#ffb703',
      weight: 2.5,
      fillColor: '#ffb703',
      fillOpacity: 0.14,
      dashArray: '4 4'
    }).addTo(liveGlideLayer)
  }, [livePosition, liveGlide])

  // Clears the "direct to" target once GPS goes off — a stale guidance
  // line with no live position to anchor it to is just confusing.
  useEffect(() => {
    if (!hasLivePosition) setDirectTo(null)
  }, [hasLivePosition])

  // Draws (and keeps redrawing, following the aircraft) a dashed guidance
  // line from the live position straight to the "direct to" target picked
  // from the long-press menu. Bright red-orange, with a dark casing
  // underneath (same trick as the route line and pattern legs) so it stays
  // readable against any base tile — distinct from the cyan planned route,
  // amber glide circles, magenta live marker, and purple history track.
  useEffect(() => {
    const layer = directToLayerRef.current
    if (!layer) return
    layer.clearLayers()
    if (!livePosition || !directTo) return

    const latLngs: L.LatLngTuple[] = [
      [livePosition.lat, livePosition.lon],
      [directTo.lat, directTo.lon]
    ]
    L.polyline(latLngs, { color: '#0d1117', weight: 7, opacity: 0.6 }).addTo(layer)
    L.polyline(latLngs, { color: '#ff3b3b', weight: 4, opacity: 1, dashArray: '2 10' }).addTo(layer)
  }, [livePosition, directTo])

  // A "how far will I get" bar along the current track — ticked every 5
  // minutes of flight time (converted to distance via current ground
  // speed, falling back to planned cruise speed the same way the direct-to
  // HUD estimate does) rather than fixed-distance rings, since time-to-fly
  // is usually the more useful question in the air. Mint green specifically
  // because every other color on this map is already spoken for (cyan
  // route, amber glide, red-orange direct-to, heavier red engine-out,
  // magenta live marker, purple history, yellow pattern).
  useEffect(() => {
    const layer = etaBarLayerRef.current
    if (!layer) return
    layer.clearLayers()
    if (!livePosition || livePosition.headingDeg === undefined) return

    const usingGpsSpeed = livePosition.speedKt !== undefined && livePosition.speedKt > 5
    const speedKt = usingGpsSpeed ? livePosition.speedKt! : cruiseSpeedKt
    if (!speedKt || speedKt <= 0) return

    const course = livePosition.headingDeg
    const minuteMarks = [5, 10, 15, 20, 25, 30]
    const points = minuteMarks.map((min) => ({
      min,
      point: destinationPoint(livePosition, course, speedKt * (min / 60))
    }))

    const barLatLngs: L.LatLngTuple[] = [
      [livePosition.lat, livePosition.lon],
      ...points.map(({ point }) => [point.lat, point.lon] as L.LatLngTuple)
    ]
    L.polyline(barLatLngs, { color: '#0d1117', weight: 5, opacity: 0.5 }).addTo(layer)
    L.polyline(barLatLngs, { color: '#6ee7b7', weight: 2.5, opacity: 0.9, dashArray: '1 8' }).addTo(layer)

    const tickHalfLengthNm = 0.6
    points.forEach(({ min, point }) => {
      const tickA = destinationPoint(point, course + 90, tickHalfLengthNm)
      const tickB = destinationPoint(point, course - 90, tickHalfLengthNm)
      L.polyline(
        [
          [tickA.lat, tickA.lon],
          [tickB.lat, tickB.lon]
        ],
        { color: '#6ee7b7', weight: 2.5, opacity: 0.9 }
      ).addTo(layer)
      L.marker([point.lat, point.lon], {
        icon: L.divIcon({
          className: 'map-eta-tick-icon',
          html: `<div class="map-eta-tick-label">${min}m</div>`,
          iconSize: [28, 16],
          iconAnchor: [14, 8]
        }),
        interactive: false
      }).addTo(layer)
    })
  }, [livePosition, cruiseSpeedKt])

  // Engine-out mode: a heavier, more alarming line to the targeted
  // airfield (distinct from the manual direct-to line above), plus the
  // unverified OSM fields/roads reference layer. Neither is auto-selected
  // as a target beyond the one curated strip — the fields/roads are purely
  // visual, see lib/engineOut.ts for exactly what they don't account for.
  useEffect(() => {
    const layer = engineOutLayerRef.current
    if (!layer) return
    layer.clearLayers()
    if (!livePosition || !engineOutActive) return

    if (engineOutTarget) {
      const { strip, distanceNm: targetDistanceNm, marginFt } = engineOutTarget
      const latLngs: L.LatLngTuple[] = [
        [livePosition.lat, livePosition.lon],
        [strip.lat, strip.lon]
      ]
      L.polyline(latLngs, { color: '#0d1117', weight: 9, opacity: 0.75 }).addTo(layer)
      L.polyline(latLngs, { color: '#ff2e2e', weight: 5, opacity: 1, dashArray: '3 8' }).addTo(layer)
      L.marker([strip.lat, strip.lon], {
        icon: L.divIcon({
          className: 'map-engineout-target-icon',
          html: '<div class="map-engineout-target-dot">&#9888;</div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        }),
        zIndexOffset: 900
      })
        .bindTooltip(`${strip.name} — ${targetDistanceNm.toFixed(1)} nm, ${Math.round(marginFt)} ft margin`, {
          permanent: true,
          direction: 'top',
          className: 'map-engineout-tooltip'
        })
        .addTo(layer)
    }

    ;(engineOutSites ?? []).forEach((site) => {
      const latLngs = site.points.map((p) => [p.lat, p.lon] as L.LatLngTuple)
      if (site.kind === 'field') {
        L.polygon(latLngs, {
          color: '#ffb703',
          weight: 1.5,
          fillColor: '#ffb703',
          fillOpacity: 0.12,
          dashArray: '4 4'
        }).addTo(layer)
      } else {
        L.polyline(latLngs, { color: '#ffb703', weight: 2, opacity: 0.6, dashArray: '2 6' }).addTo(layer)
      }
    })
  }, [livePosition, engineOutActive, engineOutTarget, engineOutSites])

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

  useEffect(() => {
    infoBtnRef.current?.classList.toggle('active', showInfoDrawer)
  }, [showInfoDrawer])

  useEffect(() => {
    engineOutBtnRef.current?.classList.toggle('active', engineOutActive)
  }, [engineOutActive])

  useEffect(() => {
    if (undoBtnRef.current) undoBtnRef.current.disabled = !canUndoWaypoint
  }, [canUndoWaypoint])

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
      {engineOutError && <div className="map-engineout-error">{engineOutError}</div>}
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
          {directTo &&
            (() => {
              const directDistanceNm = distanceNm(livePosition, directTo)
              // Ignore near-zero/noisy GPS speed rather than trusting it for
              // ETA/fuel — fall back to planned cruise speed instead (same
              // approach the Live tracking panel's ETA already uses), so
              // this doesn't just silently disappear whenever GPS speed
              // isn't usable (no fix on speed yet, or stationary on the
              // ground while testing).
              const usingGpsSpeed = livePosition.speedKt !== undefined && livePosition.speedKt > 5
              const groundSpeedKt = usingGpsSpeed ? livePosition.speedKt! : cruiseSpeedKt
              const etaMin =
                groundSpeedKt !== undefined && groundSpeedKt > 0
                  ? Math.round((directDistanceNm / groundSpeedKt) * 60)
                  : null
              // Estimated, not measured — time-based off the aircraft's
              // cruise burn rate, same approach the nav log uses per leg.
              // Only shown once there's a real ETA to base it on.
              const fuelUsedL =
                etaMin !== null && fuelBurnLph !== undefined ? (etaMin / 60) * fuelBurnLph : null
              return (
                <button
                  type="button"
                  className="map-hud-item map-hud-directto"
                  onClick={() => setDirectTo(null)}
                  title="Cancel direct-to"
                >
                  <span className="map-hud-label">DIRECT</span>
                  {directDistanceNm.toFixed(1)} nm
                  {etaMin !== null && ` · ${etaMin} min${usingGpsSpeed ? '' : ' (planned)'}`}
                  {fuelUsedL !== null && ` · ${fuelUsedL.toFixed(1)} L`} &times;
                </button>
              )
            })()}
          {engineOutActive && (
            <button
              type="button"
              className="map-hud-item map-hud-engineout"
              onClick={onToggleEngineOut}
              title="Cancel engine-out"
            >
              <span className="map-hud-label">&#9888; ENGINE OUT</span>
              {engineOutTarget
                ? `${engineOutTarget.strip.name} · ${engineOutTarget.distanceNm.toFixed(1)} nm · ${Math.round(engineOutTarget.marginFt)} ft margin`
                : 'No airfield in glide range — assess terrain visually'}
              {engineOutLoading && ' · loading sites…'} &times;
            </button>
          )}
        </div>
      )}
      <WindsockOverlay livePosition={livePosition ?? null} waypoints={waypoints} rotationDeg={rotationDeg} />
      <RotateKnob rotationDeg={rotationDeg} onChange={setRotationDeg} />
      {showInfoDrawer && (
        <MapInfoDrawer
          waypoints={waypoints}
          livePosition={livePosition}
          onClose={() => setShowInfoDrawer(false)}
        />
      )}
      {longPressMenu && (
        <div
          ref={longPressMenuRef}
          className="map-longpress-menu"
          style={{ left: longPressMenu.screenX, top: longPressMenu.screenY }}
        >
          <button
            type="button"
            onClick={() => {
              // Inserts just before the current last waypoint rather than
              // appending after it — once a start and destination are set
              // (via the two buttons below), every further tap fills in
              // the route between them instead of pushing the destination
              // further down the list.
              onInsertWaypoint(waypoints.length - 2, longPressMenu.lat, longPressMenu.lon)
              setLongPressMenu(null)
            }}
          >
            + Add waypoint here
          </button>
          <button
            type="button"
            onClick={() => {
              // afterIndex -1 splices at index 0 — becomes the new first
              // waypoint, pushing the rest of the route after it. Lets you
              // plan a route by tapping your departure point first, then
              // adding the rest afterward with "Add waypoint here".
              onInsertWaypoint(-1, longPressMenu.lat, longPressMenu.lon)
              setLongPressMenu(null)
            }}
          >
            &#128747; Set as start
          </button>
          <button
            type="button"
            onClick={() => {
              // Appends at the very end — becomes the new last waypoint
              // (destination). "Add waypoint here" above then fills in
              // between whatever's currently first and last, rather than
              // pushing this back down the list.
              onInsertWaypoint(waypoints.length - 1, longPressMenu.lat, longPressMenu.lon)
              setLongPressMenu(null)
            }}
          >
            &#127937; Set destination
          </button>
          <button
            type="button"
            onClick={() => {
              if (livePosition) {
                // GPS is on: draw a live guidance line from wherever the
                // aircraft actually is to this point, rather than editing
                // the planned route (the waypoint list has no "current
                // position" entry to draw from in the first place).
                setDirectTo({ lat: longPressMenu.lat, lon: longPressMenu.lon })
              } else {
                // No live position to draw from — fall back to inserting
                // this as the immediate next waypoint (afterIndex -1
                // splices at index 0).
                onInsertWaypoint(-1, longPressMenu.lat, longPressMenu.lon)
              }
              setLongPressMenu(null)
            }}
          >
            &#10148; Direct to here
          </button>
        </div>
      )}
      {selectedAirfield &&
        (() => {
          const strip = selectedAirfield
          return (
            <div className="map-airfield-backdrop" onClick={() => setSelectedAirfield(null)}>
              <div
                ref={airfieldPanelRef}
                className="map-airfield-panel"
                onClick={(e) => e.stopPropagation()}
              >
              <button
                type="button"
                className="map-airfield-panel-close"
                aria-label="Close"
                onClick={() => setSelectedAirfield(null)}
              >
                &times;
              </button>
              <p className="map-airfield-panel-title">
                {strip.name}
                {strip.icao ? ` (${strip.icao})` : ''}
              </p>
              {strip.note && <p className="map-airfield-panel-note">{strip.note}</p>}
              <div className="map-airfield-panel-facts">
                <div>
                  <span>Surface</span>
                  {strip.surface}
                </div>
                <div>
                  <span>Runway</span>
                  {strip.runway ?? '—'}
                </div>
                <div>
                  <span>Length</span>
                  {strip.lengthM ? `${strip.lengthM} m` : '—'}
                </div>
                <div>
                  <span>Elevation</span>
                  {strip.elevationFt !== undefined ? `${strip.elevationFt} ft` : '—'}
                </div>
                {strip.customsCleared && (
                  <div>
                    <span>Customs</span>
                    Cleared aerodrome
                  </div>
                )}
              </div>
              <p className="map-airfield-panel-subhead">Frequencies</p>
              {strip.frequencies && strip.frequencies.length > 0 ? (
                strip.frequencies.map((f, i) => (
                  <p className="map-airfield-panel-freq" key={i}>
                    {f.type}: {f.mhz.toFixed(3)} MHz{f.note ? ` — ${f.note}` : ''}
                  </p>
                ))
              ) : (
                <p className="map-airfield-panel-muted">None confirmed/published.</p>
              )}
              <p className="map-airfield-panel-subhead">Contact</p>
              {strip.pprContact ? (
                <p className="map-airfield-panel-contact">
                  {strip.pprContact.name} —{' '}
                  <a href={`tel:${strip.pprContact.phone}`}>{strip.pprContact.phone}</a>
                </p>
              ) : (
                <p className="map-airfield-panel-muted">No contact number on file.</p>
              )}
              <p className="map-airfield-panel-subhead">Pilot notes</p>
              <AirfieldNotes stripId={strip.id} userId={userId} userEmail={userEmail} />
              <div className="map-airfield-panel-actions">
                <button
                  type="button"
                  onClick={() => {
                    onInsertStrip(-1, strip)
                    setSelectedAirfield(null)
                  }}
                >
                  &#128747; Set as start
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onInsertStrip(waypoints.length - 1, strip)
                    setSelectedAirfield(null)
                  }}
                >
                  &#127937; Set destination
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onInsertStrip(waypoints.length - 2, strip)
                    setSelectedAirfield(null)
                  }}
                >
                  + Add waypoint
                </button>
              </div>
              </div>
            </div>
          )
        })()}
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
