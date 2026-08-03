import type { WeightBreakdown } from '../lib/weight'

export default function WeightSummary({ weight }: { weight: WeightBreakdown }) {
  return (
    <div className="weight-summary">
      <div className="weight-rows">
        <div className="weight-row">
          <span>Empty weight</span>
          <span>{weight.emptyWeightKg.toFixed(0)} kg</span>
        </div>
        <div className="weight-row">
          <span>Fuel onboard</span>
          <span>{weight.fuelWeightKg.toFixed(0)} kg</span>
        </div>
        <div className="weight-row">
          <span>Pilot</span>
          <span>{weight.pilotKg.toFixed(0)} kg</span>
        </div>
        <div className="weight-row">
          <span>Passenger</span>
          <span>{weight.passengerKg.toFixed(0)} kg</span>
        </div>
        <div className="weight-row">
          <span>Luggage</span>
          <span>{weight.luggageKg.toFixed(0)} kg</span>
        </div>
      </div>

      <div className="weight-total-row">
        <span>Total takeoff weight</span>
        <span className={weight.isOverweight ? 'value over' : 'value ok'}>
          {weight.totalWeightKg.toFixed(0)} kg
        </span>
      </div>
      <div className="weight-total-row muted">
        <span>Selected MTOW</span>
        <span>{weight.mtowKg} kg</span>
      </div>

      {weight.isOverweight ? (
        <div className="weight-warning">
          Overweight by {weight.overweightByKg.toFixed(0)} kg &mdash; reduce fuel, payload, or
          select a higher MTOW category before flying this configuration.
        </div>
      ) : (
        <div className="weight-ok-msg">
          {(weight.mtowKg - weight.totalWeightKg).toFixed(0)} kg margin below MTOW
        </div>
      )}
    </div>
  )
}
