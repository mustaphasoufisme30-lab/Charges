import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { validateActivationKey } from '../utils/activation';

interface ActivationGateProps {
  onActivated: () => void;
}

export function ActivationGate({ onActivated }: ActivationGateProps) {
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateActivationKey(keyInput);
    if (!result.valid) {
      setError(result.error);
      return;
    }
    setError(null);
    onActivated();
  }

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-slate-900 flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1160px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            ChargeGuard 100%
          </span>
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
            Activation requise
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1160px] flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-[920px] grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left Panel: Brand & Security Overview */}
          <div className="flex flex-col justify-between bg-[#0B1117] p-7 text-slate-100 sm:p-10">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </div>

              <p className="mt-6 text-xs font-medium text-slate-400">
                Application Android · Kotlin &amp; Jetpack Compose
              </p>
              <h1 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Activez ChargeGuard 100% avant le lancement
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Saisissez votre clé d&apos;activation pour accéder au simulateur Android interactif,
                au code source complet Jetpack Compose et à l&apos;export du projet APK.
              </p>
            </div>

            <dl className="mt-8 space-y-3 border-t border-slate-800 pt-6 text-xs text-slate-300">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-400">Surveillance</dt>
                <dd className="font-medium text-slate-100">ForegroundService Android 13–15+</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-400">Alarme 100 %</dt>
                <dd className="font-medium text-slate-100">USAGE_ALARM + Vibration + WakeLock</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-400">Persistance licence</dt>
                <dd className="font-medium text-slate-100">SharedPreferences (Android) &amp; local</dd>
              </div>
            </dl>
          </div>

          {/* Right Panel: Activation Key Form */}
          <div className="flex flex-col justify-center p-7 sm:p-10">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-950">
                Clé d&apos;activation
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                L&apos;activation est enregistrée localement sur cet appareil dès validation.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="activation-key-input"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Code d&apos;activation
                </label>
                <div className="relative mt-2">
                  <KeyRound
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="activation-key-input"
                    name="activationKey"
                    type="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    value={keyInput}
                    onChange={(e) => {
                      setKeyInput(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Entrez votre clé d'activation"
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? 'activation-key-error' : undefined}
                    className={`w-full min-h-[48px] rounded-xl border bg-slate-50 pl-10 pr-4 py-2.5 font-mono text-sm font-semibold tracking-wider text-slate-950 uppercase placeholder:normal-case placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 ${
                      error
                        ? 'border-red-500 focus:border-red-600 focus:ring-red-500/20'
                        : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-600/20'
                    }`}
                  />
                </div>
                {error && (
                  <p
                    id="activation-key-error"
                    role="alert"
                    className="mt-2 text-xs font-medium text-red-600"
                  >
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 cursor-pointer"
              >
                <span>Activer et lancer l&apos;application</span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>
            </form>

            <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
              Cette vérification est également implémentée en Kotlin Jetpack Compose dans{' '}
              <code className="font-mono font-semibold text-slate-700">ActivationScreen.kt</code> et{' '}
              <code className="font-mono font-semibold text-slate-700">ActivationManager.kt</code>{' '}
              avant l&apos;ouverture de l&apos;écran principal.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
