import { ArrowRight } from 'lucide-react';

interface ArchitectureGuideProps {
  onOpenFile: (fileId: string) => void;
}

const PERMISSIONS_ROWS = [
  {
    permission: 'FOREGROUND_SERVICE',
    apiLevel: 'Android 9+ (API 28+)',
    role: 'Autorise BatteryMonitorService à s’exécuter au premier plan avec une notification persistante.',
  },
  {
    permission: 'FOREGROUND_SERVICE_SPECIAL_USE',
    apiLevel: 'Android 14–15+ (API 34+)',
    role: 'Type de service obligatoire déclaré avec PROPERTY_SPECIAL_USE_FGS_SUBTYPE pour éviter SecurityException.',
  },
  {
    permission: 'POST_NOTIFICATIONS',
    apiLevel: 'Android 13+ (API 33+)',
    role: 'Demandée au runtime dans MainActivity pour afficher le pourcentage temps réel et le bouton d’arrêt d’alarme.',
  },
  {
    permission: 'VIBRATE',
    apiLevel: 'Toutes versions (API 26+)',
    role: 'Déclenche le motif de vibration continue via VibratorManager (API 31+) ou Vibrator.',
  },
  {
    permission: 'WAKE_LOCK',
    apiLevel: 'Toutes versions (API 26+)',
    role: 'Maintient le CPU éveillé (PARTIAL_WAKE_LOCK) afin que MediaPlayer sonne même écran éteint.',
  },
];

export function ArchitectureGuide({ onOpenFile }: ArchitectureGuideProps) {
  return (
    <div className="space-y-8">
      {/* Three Architectural Pillars */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <article className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6">
          <div>
            <p className="text-xs font-semibold text-emerald-700">
              01. Interface Jetpack Compose
            </p>
            <h2 className="mt-2 font-display text-xl font-bold text-slate-900">
              État réactif &amp; jauge animée
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
              <code className="text-xs font-semibold text-slate-800">MainActivity</code> collecte le{' '}
              <code className="text-xs font-semibold text-slate-800">StateFlow&lt;BatteryUiState&gt;</code>{' '}
              exposé par <code className="text-xs font-semibold text-slate-800">BatteryMonitorRepository</code>.
              La jauge <code className="text-xs font-semibold text-slate-800">Canvas</code> anime la progression
              de 270°, affiche l&apos;état (En charge, Débranché, Charge complète) et la température en °C.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenFile('main-activity')}
            className="mt-5 inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-emerald-700 cursor-pointer self-start"
          >
            <span>Voir MainActivity.kt</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </article>

        <article className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6">
          <div>
            <p className="text-xs font-semibold text-emerald-700">
              02. Surveillance en arrière-plan
            </p>
            <h2 className="mt-2 font-display text-xl font-bold text-slate-900">
              ForegroundService Android 13–15+
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
              <code className="text-xs font-semibold text-slate-800">BatteryMonitorService</code> démarre avec{' '}
              <code className="text-xs font-semibold text-slate-800">FOREGROUND_SERVICE_TYPE_SPECIAL_USE</code>{' '}
              et enregistre dynamiquement un{' '}
              <code className="text-xs font-semibold text-slate-800">BroadcastReceiver</code> sur{' '}
              <code className="text-xs font-semibold text-slate-800">Intent.ACTION_BATTERY_CHANGED</code>{' '}
              (non déclarable dans le manifeste depuis Android 8).
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenFile('battery-service')}
            className="mt-5 inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-emerald-700 cursor-pointer self-start"
          >
            <span>Voir BatteryMonitorService.kt</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </article>

        <article className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6">
          <div>
            <p className="text-xs font-semibold text-emerald-700">
              03. Alarme &amp; arrêt automatique
            </p>
            <h2 className="mt-2 font-display text-xl font-bold text-slate-900">
              USAGE_ALARM + Vibration + Débranchement
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
              Dès que le niveau atteint le seuil (100 % par défaut) sur secteur,{' '}
              <code className="text-xs font-semibold text-slate-800">MediaPlayer</code> lit{' '}
              <code className="text-xs font-semibold text-slate-800">RingtoneManager.TYPE_ALARM</code> en boucle
              sur le canal <code className="text-xs font-semibold text-slate-800">AudioAttributes.USAGE_ALARM</code>{' '}
              (sonne même média muet). L&apos;alarme s&apos;arrête immédiatement au débranchement ou via le bouton d&apos;action.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenFile('manifest')}
            className="mt-5 inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-emerald-700 cursor-pointer self-start"
          >
            <span>Voir AndroidManifest.xml</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </article>
      </section>

      {/* Permissions Matrix Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="font-display text-lg font-bold text-slate-900">
            Matrice des permissions Android 13, 14 et 15+
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Toutes les autorisations déclarées dans <code className="text-xs font-semibold text-slate-800">AndroidManifest.xml</code> et vérifiées au démarrage du service.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="px-6 py-3">Permission</th>
                <th className="px-6 py-3">Compatibilité</th>
                <th className="px-6 py-3">Rôle dans ChargeGuard 100%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PERMISSIONS_ROWS.map((row) => (
                <tr key={row.permission} className="hover:bg-slate-50/70">
                  <td className="px-6 py-3.5 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                    {row.permission}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-slate-600 whitespace-nowrap tabular-nums">
                    {row.apiLevel}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-slate-700">
                    {row.role}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Integration Checklist for Android Studio */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="font-display text-lg font-bold text-slate-900">
          Démarrage rapide dans Android Studio
        </h3>
        <ol className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3 text-sm text-slate-700">
          <li className="border-t border-slate-100 pt-3">
            <span className="font-display font-bold text-slate-900">1. Importer le projet</span>
            <p className="mt-1 text-slate-600">
              Téléchargez l&apos;archive <code className="text-xs font-semibold">.zip</code> depuis la barre supérieure,
              décompressez-la puis ouvrez le dossier dans Android Studio Ladybug / Meerkat (JDK 17).
            </p>
          </li>
          <li className="border-t border-slate-100 pt-3">
            <span className="font-display font-bold text-slate-900">2. Tester sur émulateur</span>
            <p className="mt-1 text-slate-600">
              Ouvrez <em>Extended Controls &rarr; Battery</em> dans l&apos;émulateur Android pour faire varier le niveau
              de charge jusqu&apos;à 100 % et vérifier le déclenchement sur le flux <code className="text-xs font-semibold">USAGE_ALARM</code>.
            </p>
          </li>
          <li className="border-t border-slate-100 pt-3">
            <span className="font-display font-bold text-slate-900">3. Vérifier l&apos;écran éteint</span>
            <p className="mt-1 text-slate-600">
              Verrouillez l&apos;appareil via le bouton Power, passez la charge à 100 % : le{' '}
              <code className="text-xs font-semibold">PARTIAL_WAKE_LOCK</code> déclenche l&apos;alarme et affiche le bouton
              &laquo; Arrêter l&apos;alarme &raquo; sur l&apos;écran verrouillé.
            </p>
          </li>
        </ol>
      </section>
    </div>
  );
}
