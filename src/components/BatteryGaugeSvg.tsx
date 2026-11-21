import { ChargeStatus, getChargeStatusLabel } from '../utils/batteryEngine';

interface BatteryGaugeSvgProps {
  level: number;
  status: ChargeStatus;
  temperatureC: number;
  threshold: number;
  isAlarmRinging: boolean;
}

export function BatteryGaugeSvg({
  level,
  status,
  temperatureC,
  threshold,
  isAlarmRinging,
}: BatteryGaugeSvgProps) {
  const size = 192;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // 270 degree arc (3/4 of full circle), matching BatteryCircularGauge.kt
  const arcFraction = 270 / 360;
  const maxArcLength = circumference * arcFraction;
  const activeLength = maxArcLength * (Math.max(0, Math.min(100, level)) / 100);

  // Threshold marker position along 270° arc starting at 135°
  const thresholdAngleDeg = 135 + 270 * (threshold / 100);
  const thresholdAngleRad = (thresholdAngleDeg * Math.PI) / 180;
  const markerX = size / 2 + radius * Math.cos(thresholdAngleRad);
  const markerY = size / 2 + radius * Math.sin(thresholdAngleRad);

  const strokeColor = isAlarmRinging
    ? '#DC2626'
    : status === 'UNPLUGGED'
      ? '#64748B'
      : temperatureC >= 42
        ? '#D97706'
        : '#10B981';

  const statusText = isAlarmRinging ? 'Alarme déclenchée' : getChargeStatusLabel(status);
  const formattedTemp = temperatureC.toFixed(1).replace('.', ',');

  return (
    <div className="relative mx-auto flex h-[192px] w-[192px] items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Batterie à ${level} pour cent, ${statusText}, ${formattedTemp} degrés Celsius`}
        className="overflow-visible"
      >
        {/* Background track (270 deg) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#223040"
          strokeWidth={strokeWidth}
          strokeDasharray={`${maxArcLength} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(135 ${size / 2} ${size / 2})`}
        />

        {/* Animated progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${activeLength} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(135 ${size / 2} ${size / 2})`}
          style={{
            transition: 'stroke-dasharray 320ms cubic-bezier(0.16, 1, 0.3, 1), stroke 250ms ease',
          }}
        />

        {/* Threshold tick marker */}
        <circle
          cx={markerX}
          cy={markerY}
          r={4}
          fill="#F8FAFC"
          stroke="#0B1117"
          strokeWidth={2}
        />
      </svg>

      {/* Center Readout */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className={`font-display text-[42px] leading-none font-extrabold tracking-tight tabular-nums ${
            isAlarmRinging ? 'text-red-500' : 'text-slate-50'
          }`}
        >
          {level}%
        </span>
        <span
          className="mt-1 text-xs font-semibold tracking-wide"
          style={{ color: strokeColor }}
        >
          {statusText}
        </span>
        <span className="mt-1.5 font-mono text-xs text-slate-400 tabular-nums">
          {formattedTemp} °C
        </span>
      </div>
    </div>
  );
}
