import {
  BatteryCharging,
  BellOff,
  BellRing,
  Lock,
  ShieldAlert,
  Thermometer,
  Wifi,
} from 'lucide-react';
import {
  BatterySimState,
  getChargeStatus,
  getChargeStatusLabel,
} from '../utils/batteryEngine';
import { BatteryGaugeSvg } from './BatteryGaugeSvg';

interface AndroidPhoneSimulatorProps {
  state: BatterySimState;
  onToggleMonitoring: (enabled: boolean) => void;
  onThresholdChange: (value: number) => void;
  onStopAlarmApp: () => void;
  onStopAlarmNotification: () => void;
  onGrantNotificationPermission: () => void;
  onWakeScreen: () => void;
}

export function AndroidPhoneSimulator({
  state,
  onToggleMonitoring,
  onThresholdChange,
  onStopAlarmApp,
  onStopAlarmNotification,
  onGrantNotificationPermission,
  onWakeScreen,
}: AndroidPhoneSimulatorProps) {
  const chargeStatus = getChargeStatus(state.level, state.isPluggedIn);
  const chargeLabel = getChargeStatusLabel(chargeStatus);
  const formattedTemp = state.temperatureC.toFixed(1).replace('.', ',');

  return (
    <div className="flex flex-col items-center">
      {/* Realistic Android 15 Device Bezel (stationary so interactive buttons stay 100% stable) */}
      <div className="relative w-full max-w-[364px]">
        {state.isAlarmRinging && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-2 rounded-[48px] border-2 border-red-500/70 bg-red-500/10 animate-alarm-halo"
          />
        )}
        <div
          data-testid="android-phone-frame"
          data-alarm={state.isAlarmRinging ? 'ringing' : 'idle'}
          className={`relative w-full rounded-[40px] border-[6px] border-slate-800 bg-[#0B1117] p-2.5 text-slate-100 shadow-2xl shadow-slate-900/20 ${
            state.isAlarmRinging ? 'border-red-700' : ''
          }`}
        >
          {/* Inner OLED Screen */}
          <div className="relative flex min-h-[620px] flex-col overflow-hidden rounded-[30px] bg-[#0B1117]">
          {/* Android System Status Bar */}
          <div className="flex items-center justify-between px-5 pt-3 pb-2 text-[11px] font-medium text-slate-300">
            <span className="font-mono tabular-nums">10:27</span>
            <div
              aria-hidden="true"
              className="h-4 w-20 rounded-full bg-slate-950 border border-slate-800/80"
            />
            <div className="flex items-center gap-1.5 font-mono tabular-nums">
              <Wifi className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
              <span>{state.level}%</span>
            </div>
          </div>

          {/* Screen-Off (Veille) / WakeLock Lockscreen Mode */}
          {state.isScreenOff ? (
            <div
              data-testid="screen-off-view"
              className="flex flex-1 flex-col justify-between bg-[#05080C] px-5 py-8 text-center"
            >
              <div className="pt-4">
                <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-slate-400">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                </div>
                <p className="font-display text-5xl font-semibold tracking-tight text-slate-200 tabular-nums">
                  10:27
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Écran en veille · {state.level} % · {chargeLabel}
                </p>
              </div>

              {/* Lockscreen ForegroundService / Alarm Notification */}
              <div className="my-auto space-y-3 text-left">
                {state.isMonitoring ? (
                  <div
                    className={`rounded-2xl border p-4 ${
                      state.isAlarmRinging
                        ? 'border-red-500/70 bg-red-950/75'
                        : 'border-slate-800 bg-slate-900/90'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span className="font-semibold text-white">ChargeGuard 100%</span>
                      <span>
                        {state.isAlarmRinging ? 'Alarme prioritaire · WakeLock' : 'Service actif'}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-white">
                      {state.isAlarmRinging
                        ? `Batterie chargée à ${state.level} % — Débranchez !`
                        : `Surveillance active · ${state.level} % (${chargeLabel})`}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-300 tabular-nums">
                      Seuil : {state.threshold} % · {formattedTemp} °C
                      {state.isAlarmRinging ? ' · Audio USAGE_ALARM + Vibration' : ''}
                    </p>
                    {state.isAlarmRinging && (
                      <button
                        type="button"
                        onClick={onStopAlarmNotification}
                        className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-500 cursor-pointer"
                      >
                        <BellOff className="h-4 w-4" aria-hidden="true" />
                        Arrêter l&apos;alarme
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-xs text-slate-500">
                    Écran éteint — activez la surveillance pour recevoir l&apos;alarme en veille.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onWakeScreen}
                className="mx-auto min-h-[44px] rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 cursor-pointer"
              >
                Rallumer l&apos;écran
              </button>
            </div>
          ) : (
            /* Active Jetpack Compose App Screen */
            <div className="flex flex-1 flex-col px-4 pt-1 pb-3">
              {/* Persistent Android ForegroundService Notification Banner */}
              {state.isMonitoring && (
                <div
                  data-testid="foreground-notification"
                  className={`mb-2 rounded-2xl border px-3 py-2.5 transition-colors ${
                    state.isAlarmRinging
                      ? 'border-red-500/80 bg-red-950/80'
                      : 'border-slate-800 bg-[#141E2B]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <BellRing
                        className={`h-3.5 w-3.5 shrink-0 ${
                          state.isAlarmRinging ? 'text-red-400' : 'text-emerald-400'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="font-semibold text-slate-100">
                        {state.isAlarmRinging
                          ? `Alarme · ${state.level}\u00A0% atteint`
                          : `ChargeGuard · ${state.level}\u00A0% (${chargeLabel})`}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0 tabular-nums">
                      {formattedTemp}&nbsp;°C
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-300 tabular-nums">
                      {state.isAlarmRinging
                        ? 'USAGE_ALARM · Vibration continue'
                        : `Notification persistante · Seuil ${state.threshold}\u00A0%`}
                    </p>
                    {state.isAlarmRinging ? (
                      <button
                        type="button"
                        onClick={onStopAlarmNotification}
                        aria-label="Arrêter l'alarme depuis la notification"
                        className="min-h-[28px] shrink-0 rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-red-500 whitespace-nowrap cursor-pointer"
                      >
                        Arrêter l&apos;alarme
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onToggleMonitoring(false)}
                        className="min-h-[28px] shrink-0 rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:bg-slate-700 whitespace-nowrap cursor-pointer"
                      >
                        Arrêter
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Android 13+ POST_NOTIFICATIONS Permission Prompt if denied */}
              {!state.hasNotificationPermission && (
                <div className="mb-3 rounded-2xl border border-amber-500/40 bg-amber-950/40 p-3 text-xs text-amber-100">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                    <div className="flex-1">
                      <p className="font-semibold">Permission POST_NOTIFICATIONS (Android 13+)</p>
                      <p className="mt-0.5 text-[11px] text-amber-200/80">
                        Autorisez les notifications pour afficher le suivi persistant et le bouton d&apos;arrêt d&apos;alarme.
                      </p>
                      <button
                        type="button"
                        onClick={onGrantNotificationPermission}
                        className="mt-2 min-h-[34px] rounded-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-amber-400 cursor-pointer"
                      >
                        Autoriser les notifications
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Jetpack Compose CenterAlignedTopAppBar */}
              <div className="py-1.5 text-center">
                <h2 className="font-display text-base font-bold tracking-tight text-white">
                  ChargeGuard 100%
                </h2>
              </div>

              {/* Animated Circular Battery Gauge */}
              <div className="my-1">
                <BatteryGaugeSvg
                  level={state.level}
                  status={chargeStatus}
                  temperatureC={state.temperatureC}
                  threshold={state.threshold}
                  isAlarmRinging={state.isAlarmRinging}
                />
              </div>

              {/* Quick Telemetry Row: Status & Temperature */}
              <div className="mt-2 grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border border-slate-800/90 bg-[#131C27] px-3.5 py-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <BatteryCharging className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>État de charge</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-100 truncate">
                    {chargeLabel}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800/90 bg-[#131C27] px-3.5 py-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Thermometer className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Température</span>
                  </div>
                  <p className="mt-1 font-mono text-sm font-semibold text-slate-100 tabular-nums">
                    {formattedTemp} °C
                  </p>
                </div>
              </div>

              {/* BIG RED "Arrêter l'alarme" BUTTON — appears immediately when alarm triggers */}
              {state.isAlarmRinging && (
                <button
                  type="button"
                  data-testid="stop-alarm-app-btn"
                  onClick={onStopAlarmApp}
                  className="mt-2.5 flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-2xl bg-red-600 px-5 py-2.5 text-base font-bold text-white shadow-lg shadow-red-900/40 transition-colors hover:bg-red-500 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 cursor-pointer"
                >
                  <BellOff className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>Arrêter l&apos;alarme</span>
                </button>
              )}

              {/* Master Switch: "Activer la surveillance de charge" */}
              <div
                className={`mt-2.5 rounded-2xl border p-3 transition-colors ${
                  state.isMonitoring
                    ? 'border-emerald-500/50 bg-[#122224]'
                    : 'border-slate-800/90 bg-[#131C27]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor="chargeguard-monitoring-switch"
                      className="block text-[13px] font-semibold text-slate-100 cursor-pointer"
                    >
                      Activer la surveillance de charge
                    </label>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {state.isMonitoring
                        ? `Service actif · Alarme à ${state.threshold}\u00A0%`
                        : 'Lance BatteryMonitorService en arrière-plan'}
                    </p>
                  </div>
                  <button
                    id="chargeguard-monitoring-switch"
                    type="button"
                    role="switch"
                    aria-checked={state.isMonitoring}
                    aria-label="Activer la surveillance de charge"
                    onClick={() => onToggleMonitoring(!state.isMonitoring)}
                    className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 cursor-pointer ${
                      state.isMonitoring ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${
                        state.isMonitoring ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Optional Threshold Slider: 80% - 100% (Default 100%) */}
              <div className="mt-2.5 rounded-2xl border border-slate-800/90 bg-[#131C27] p-3">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="chargeguard-threshold-slider"
                    className="text-xs font-semibold text-slate-200"
                  >
                    Seuil d&apos;alerte
                  </label>
                  <span className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
                    {state.threshold}&nbsp;%
                  </span>
                </div>
                <input
                  id="chargeguard-threshold-slider"
                  type="range"
                  min={80}
                  max={100}
                  step={1}
                  value={state.threshold}
                  onChange={(e) => onThresholdChange(Number(e.target.value))}
                  aria-label="Seuil d'alerte batterie entre 80 et 100 pour cent"
                  className="cg-slider cg-slider-dark mt-2 w-full"
                />
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 tabular-nums">
                  <span>80 %</span>
                  <span>90 %</span>
                  <span>100 % (Défaut)</span>
                </div>
              </div>
            </div>
          )}

          {/* Android Gesture Navigation Pill */}
          <div className="flex justify-center pb-2 pt-1">
            <div aria-hidden="true" className="h-1 w-28 rounded-full bg-slate-700" />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
