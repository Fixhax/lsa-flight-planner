import type { GlideResult } from '../lib/glide'
import type { AircraftProfile } from '../types/aircraft'

export default function GlideSummary({
  glide,
  aircraft,
  altitudeFt
}: {
  glide: GlideResult
  aircraft: AircraftProfile
  altitudeFt: number
}) {
  return (
    <div className="glide-summary">
      <div className="glide-readout">
        <span>Glide range from {altitudeFt.toLocaleString()} ft</span>
        <span className="value ok">{glide.radiusNm.toFixed(1)} nm radius</span>
      </div>
      <div className="totals-grid glide-stats">
        <div>
          <div className="stat-label">Max reach (downwind)</div>
          <div className="stat-value">{glide.maxReachNm.toFixed(1)} nm</div>
        </div>
        <div>
          <div className="stat-label">Min reach (upwind)</div>
          <div className="stat-value">{glide.minReachNm.toFixed(1)} nm</div>
        </div>
      </div>
      <p className="footnote">
        Modeled as a circle of radius {glide.radiusNm.toFixed(1)} nm (still-air glide distance at{' '}
        {aircraft.glideRatio}:1 and {aircraft.bestGlideSpeedKt} kt), shifted{' '}
        {glide.driftNm.toFixed(1)} nm downwind by the current wind &mdash; shown on the map around
        each waypoint at your planned cruise altitude.
        {aircraft.bestGlideSpeedIsEstimate &&
          ' Best glide speed here is estimated (~1.3\u00d7 stall speed), not a published POH figure \u2014 use your aircraft\u2019s actual best glide speed in a real emergency.'}
        {' '}This assumes altitude is height above the terrain you'd actually glide over, which
        isn't always true &mdash; treat it as a planning aid, not a guarantee.
      </p>
    </div>
  )
}
