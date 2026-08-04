import type { GlideResult } from '../lib/glide'

export default function GlideSummary({
  glide,
  altitudeFt
}: {
  glide: GlideResult
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
    </div>
  )
}
