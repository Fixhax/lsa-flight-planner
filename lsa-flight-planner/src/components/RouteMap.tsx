import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Waypoint } from '../lib/planning'
import { destinationPoint } from '../lib/geo'
import type { GlideResult } from '../lib/glide'

interface Props {
  waypoints: Waypoint[]
  onMoveWaypoint: (id: string, lat: number, lon: number) => void
  onInsertWaypoint: (afterIndex: number, lat: number, lon: number) => void
  onSelectWaypoint: (id: string) => void
  glide?: GlideResult
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

// Default view centered over the Norway/Sweden strip data this app is
// scoped to, used until there are waypoints to fit bounds to.
const DEFAULT_CENTER: L.LatLngExpression = [63, 13]
const DEFAULT_ZOOM = 5

export default function RouteMap({
  waypoints,
  onMoveWaypoint,
  onInsertWaypoint,
  onSelectWaypoint,
  glide
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerGroupRef = useRef<L.LayerGroup | null>(null)
  const prevIdsKeyRef = useRef<string>('')

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

    mapRef.current = map
    layerGroupRef.current = L.layerGroup().addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
      layerGroupRef.current = null
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

  return <div ref={containerRef} className="route-map" />
}
