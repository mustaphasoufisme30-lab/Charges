import {
  FastForward,
  KeyRound,
  Moon,
  Plug,
  ShieldCheck,
  Sun,
  Unplug,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  BatteryEventEntry,
  BatterySimState,
  getTemperatureLabel,
  getTemperatureSeverity,
} from '../utils/batteryEngine';

interface HardwareBenchControlsProps {
  state: BatterySimState;
  isAutoCharging: boolean;
  audioEnabled: boolean;
  isPhoneActivated: boolean;
  events: BatteryEventEntry[];
  onTogglePlugged: () => void;
  onLevelChange: (level: number) => void;
  onTempChange: (tempC: number) => void;
  onToggleAutoCharge: () => void;
  onToggleScreenOff: () => void;
  onToggleAudio: () => void;
  onTogglePermission: () => void;
  onTogglePhoneActivation: () => void;
  onLockApp: () => void;
}

export function HardwareBenchControls({
  state,
  isAutoCharging,
  audioEnabled,
  isPhoneActivated,
  events,
  onTogglePlugged,
  onLevelChange,
  onTempChange,
  onToggleAutoCharge,
  onToggleScreenOff,
  onToggleAudio,
  onTogglePermission,
  onTogglePhoneActivation,
  onLockApp,
}: HardwareBenchControlsProps) {
  const tempSeverity = getTemperatureSeverity(state.temperatureC);
  const tempLabel = getTemperatureLabel(tempSeverity);

  return (
    <div className="flex flex-col gap-6">
      {/* Main Hardware Simulation Controls */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Banc de test matériel Android
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Injectez des événements système <code className="text-xs font-semibold text-slate-800">ACTION_BATTERY_CHANGED</code> pour vérifier le service et l&apos;alarme.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            API 35 · Android 15
          </span>
        </div>

        {/* Action Grid: Charger Cable, Fast Charge, Screen State, Audio */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onTogglePlugged}
            className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              state.isPluggedIn
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
            }`}
          >
            {state.isPluggedIn ? (
              <>
                <Unplug className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Débrancher le câble</span>
              </>
            ) : (
              <>
                <Plug className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Brancher le câble</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleAutoCharge}
            className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              isAutoCharging
                ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            <FastForward className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{isAutoCharging ? 'Arrêter la charge rapide' : 'Simuler montée à 100 %'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleScreenOff}
            className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              state.isScreenOff
                ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            {state.isScreenOff ? (
              <>
                <Sun className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Rallumer l&apos;écran</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Tester écran éteint (Veille)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleAudio}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            {audioEnabled ? (
              <>
                <Volume2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                <span>Son d&apos;alarme activé</span>
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <span>Son d&apos;alarme coupé</span>
              </>
            )}
          </button>
        </div>

        {/* Sliders: Battery Level & Battery Temperature */}
        <div className="mt-6 space-y-5 border-t border-slate-100 pt-5">
          <div>
            <div className="flex items-center justify-between text-sm">
              <label htmlFor="sim-battery-level" className="font-medium text-slate-800">
                Niveau de batterie simulé
              </label>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {state.level} %
              </span>
            </div>
            <input
              id="sim-battery-level"
              type="range"
              min={5}
              max={100}
              step={1}
              value={state.level}
              onChange={(e) => onLevelChange(Number(e.target.value))}
              className="cg-slider mt-2 w-full"
            />
            <div className="mt-1 flex justify-between text-xs text-slate-500 tabular-nums">
              <span>5 %</span>
              <span>50 %</span>
              <span>Seuil actuel : {state.threshold} %</span>
              <span>100 %</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm">
              <label htmlFor="sim-battery-temp" className="font-medium text-slate-800">
                Température de la batterie
              </label>
              <span
                className={`font-mono font-semibold tabular-nums ${
                  tempSeverity === 'HIGH'
                    ? 'text-red-600'
                    : tempSeverity === 'WARM'
                      ? 'text-amber-700'
                      : 'text-slate-900'
                }`}
              >
                {state.temperatureC.toFixed(1).replace('.', ',')} °C · {tempLabel}
              </span>
            </div>
            <input
              id="sim-battery-temp"
              type="range"
              min={20}
              max={48}
              step={0.5}
              value={state.temperatureC}
              onChange={(e) => onTempChange(Number(e.target.value))}
              className="cg-slider mt-2 w-full"
            />
          </div>
        </div>

        {/* Permission & Activation rows */}
        <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm text-slate-700">
              <ShieldCheck className="h-4 w-4 text-slate-500 shrink-0" aria-hidden="true" />
              <span>Permission Android 13+ (POST_NOTIFICATIONS)</span>
            </div>
            <button
              type="button"
              onClick={onTogglePermission}
              className="min-h-[36px] rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
            >
              {state.hasNotificationPermission ? 'Révoquer pour tester' : 'Accorder'}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2.5 text-sm text-slate-700">
              <KeyRound className="h-4 w-4 text-slate-500 shrink-0" aria-hidden="true" />
              <span>Écran d&apos;activation Android (ActivationScreen.kt)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onTogglePhoneActivation}
                className="min-h-[36px] rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
              >
                {isPhoneActivated ? 'Tester sur le téléphone' : 'Déverrouiller le téléphone'}
              </button>
              <button
                type="button"
                onClick={onLockApp}
                className="min-h-[36px] rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap cursor-pointer"
              >
                Verrouiller l&apos;accès
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Real-time ForegroundService Lifecycle Event Feed */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-baseline justify-between gap-2 border-b border-slate-100 pb-3">
          <h3 className="font-display text-base font-bold text-slate-900">
            Journal du BatteryMonitorService
          </h3>
          <span className="text-xs text-slate-500 tabular-nums">
            {events.length} événement{events.length > 1 ? 's' : ''}
          </span>
        </div>

        {events.length === 0 ? (
          <p className="py-5 text-sm text-slate-500">
            Activez la surveillance sur le téléphone pour observer les appels système du ForegroundService et du BroadcastReceiver.
          </p>
        ) : (
          <ol className="mt-3 divide-y divide-slate-100">
            {events.slice(0, 6).map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 py-2.5 text-xs">
                <span className="font-mono text-slate-400 tabular-nums shrink-0 pt-0.5">
                  {entry.timestamp}
                </span>
                <div className="min-w-0 flex-1">
                  <span
                    className={`font-mono font-semibold ${
                      entry.severity === 'alarm'
                        ? 'text-red-600'
                        : entry.severity === 'success'
                          ? 'text-emerald-700'
                          : entry.severity === 'warning'
                            ? 'text-amber-700'
                            : 'text-slate-700'
                    }`}
                  >
                    {entry.action}
                  </span>
                  <p className="mt-0.5 text-slate-600 leading-relaxed">{entry.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
