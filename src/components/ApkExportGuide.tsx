import {
  ArrowRight,
  Check,
  CheckCircle2,
  Cloud,
  Copy,
  Download,
  Laptop,
  Smartphone,
  Terminal,
} from 'lucide-react';
import { useState } from 'react';
import { ANDROID_PROJECT_FILES } from '../data/androidProjectFiles';

interface ApkExportGuideProps {
  onDownloadZip: () => void;
  onOpenFile: (fileId: string) => void;
}

type BuildMethod = 'cloud' | 'studio' | 'cli';

const APK_READINESS_ITEMS = [
  {
    fileId: 'manifest',
    label: 'AndroidManifest.xml (permissions Android 13–15+)',
    detail: 'FOREGROUND_SERVICE_SPECIAL_USE, POST_NOTIFICATIONS, VIBRATE, WAKE_LOCK',
  },
  {
    fileId: 'ic-launcher-xml',
    label: 'Icônes adaptatives (@mipmap/ic_launcher)',
    detail: 'Vector Drawable + adaptive-icon inclus pour éviter toute erreur AAPT2',
  },
  {
    fileId: 'gradle-properties',
    label: 'gradle.properties & Gradle Wrapper 8.10.2',
    detail: 'AndroidX activé, JVM 2 Go pour Compose & R8',
  },
  {
    fileId: 'proguard-rules',
    label: 'proguard-rules.pro (build Release)',
    detail: 'Conserve MainActivity et BatteryMonitorService lors de la minification',
  },
  {
    fileId: 'github-actions-apk',
    label: 'Workflow Cloud .github/workflows/build-apk.yml',
    detail: 'Compile automatiquement ChargeGuard100-debug.apk sans installer Android Studio',
  },
];

const CLI_DEBUG_CMD = `# 1. Extraire l'archive ChargeGuard100-Android-Kotlin.zip
cd ChargeGuard100

# 2. Compiler l'APK Debug installable
gradle assembleDebug

# Résultat prêt à installer sur téléphone :
# app/build/outputs/apk/debug/app-debug.apk`;

const CLI_RELEASE_CMD = `# Créer une clé de signature locale (une seule fois)
keytool -genkey -v -keystore chargeguard-release.jks \\
  -keyalg RSA -keysize 2048 -validity 10000 -alias chargeguard

# Compiler l'APK Release optimisé
gradle assembleRelease

# Installer directement via USB (ADB)
adb install -r app/build/outputs/apk/debug/app-debug.apk`;

export function ApkExportGuide({ onDownloadZip, onOpenFile }: ApkExportGuideProps) {
  const [method, setMethod] = useState<BuildMethod>('cloud');
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  async function handleCopy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedBlock(key);
    window.setTimeout(() => setCopiedBlock(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Full permission & complete build kit */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-emerald-700">
              Autorisation complète · {ANDROID_PROJECT_FILES.length} fichiers prêts à compiler
            </p>
            <h2 className="mt-1.5 font-display text-xl sm:text-2xl font-bold text-slate-950">
              Convertissez librement ChargeGuard 100% en fichier .apk
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Vous avez l&apos;autorisation complète de compiler, signer et installer ce projet en APK.
              Comme cet aperçu tourne dans un navigateur web (sans SDK Android ni JDK installé sur le serveur),
              nous avons intégré dans l&apos;archive <code className="text-xs font-semibold text-slate-800">.zip</code>{' '}
              toutes les ressources requises (icônes adaptatives, <code className="text-xs font-semibold text-slate-800">gradle.properties</code>,{' '}
              ProGuard) ainsi qu&apos;un workflow <strong>GitHub Actions</strong> qui génère le vrai{' '}
              <code className="text-xs font-semibold text-slate-800">.apk</code> automatiquement dans le cloud.
            </p>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={onDownloadZip}
              className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 whitespace-nowrap cursor-pointer"
            >
              <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Télécharger le kit APK complet (.zip)</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Split: Build Method Selector + Readiness Checklist */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
        {/* Left: Interactive 3-Method APK Conversion Guide */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <h3 className="font-display text-lg font-bold text-slate-900">
              Choisissez votre méthode de génération APK
            </h3>

            {/* Segmented Method Switcher */}
            <div
              role="tablist"
              aria-label="Méthode de compilation APK"
              className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={method === 'cloud'}
                onClick={() => setMethod('cloud')}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  method === 'cloud'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Cloud className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Cloud (GitHub Actions)</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={method === 'studio'}
                onClick={() => setMethod('studio')}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  method === 'studio'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Laptop className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Android Studio</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={method === 'cli'}
                onClick={() => setMethod('cli')}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  method === 'cli'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Terminal className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Ligne de commande</span>
              </button>
            </div>
          </div>

          {/* Method 1: Cloud GitHub Actions */}
          {method === 'cloud' && (
            <div className="mt-5 space-y-5">
              <p className="text-sm text-slate-600">
                Idéal si vous n&apos;avez pas Android Studio installé : le fichier{' '}
                <code className="text-xs font-semibold text-slate-800">.github/workflows/build-apk.yml</code>{' '}
                inclus dans l&apos;archive compile un véritable <code className="text-xs font-semibold text-slate-800">app-debug.apk</code>{' '}
                gratuitement sur les serveurs GitHub en ~2 minutes.
              </p>

              <ol className="space-y-3 text-sm text-slate-700">
                <li className="flex gap-3 border-t border-slate-100 pt-3">
                  <span className="font-mono text-xs font-bold text-emerald-700 pt-0.5">01.</span>
                  <div>
                    <p className="font-semibold text-slate-900">Téléchargez et décompressez le projet</p>
                    <p className="mt-0.5 text-slate-600">
                      Cliquez sur <strong>Télécharger le kit APK complet (.zip)</strong> puis extrayez le dossier{' '}
                      <code className="text-xs font-semibold">ChargeGuard100</code>.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3 border-t border-slate-100 pt-3">
                  <span className="font-mono text-xs font-bold text-emerald-700 pt-0.5">02.</span>
                  <div>
                    <p className="font-semibold text-slate-900">Envoyez les fichiers sur un dépôt GitHub</p>
                    <p className="mt-0.5 text-slate-600">
                      Créez un nouveau dépôt GitHub (public ou privé) et importez le dossier complet (y compris le dossier caché{' '}
                      <code className="text-xs font-semibold">.github/workflows/build-apk.yml</code>).
                    </p>
                  </div>
                </li>
                <li className="flex gap-3 border-t border-slate-100 pt-3">
                  <span className="font-mono text-xs font-bold text-emerald-700 pt-0.5">03.</span>
                  <div>
                    <p className="font-semibold text-slate-900">Téléchargez l&apos;APK généré</p>
                    <p className="mt-0.5 text-slate-600">
                      Ouvrez l&apos;onglet <strong>Actions</strong> sur GitHub → sélectionnez l&apos;exécution{' '}
                      <strong>Compiler ChargeGuard 100% APK</strong> → téléchargez l&apos;artefact{' '}
                      <strong>ChargeGuard100-APK</strong> contenant <code className="text-xs font-semibold">app-debug.apk</code>.
                    </p>
                  </div>
                </li>
              </ol>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onOpenFile('github-actions-apk')}
                  className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-emerald-700 cursor-pointer"
                >
                  <span>Inspecter .github/workflows/build-apk.yml</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* Method 2: Android Studio */}
          {method === 'studio' && (
            <div className="mt-5 space-y-5">
              <p className="text-sm text-slate-600">
                La méthode la plus directe sur PC ou Mac pour générer un APK Debug (test immédiat) ou un APK Release signé (partage ou Play Store).
              </p>

              <ol className="space-y-3 text-sm text-slate-700">
                <li className="flex gap-3 border-t border-slate-100 pt-3">
                  <span className="font-mono text-xs font-bold text-emerald-700 pt-0.5">01.</span>
                  <div>
                    <p className="font-semibold text-slate-900">Ouvrir le dossier dans Android Studio</p>
                    <p className="mt-0.5 text-slate-600">
                      Lancez Android Studio Ladybug ou Meerkat (JDK 17) → <strong>Open</strong> → sélectionnez le dossier{' '}
                      <code className="text-xs font-semibold">ChargeGuard100</code> et laissez Gradle synchroniser.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3 border-t border-slate-100 pt-3">
                  <span className="font-mono text-xs font-bold text-emerald-700 pt-0.5">02.</span>
                  <div>
                    <p className="font-semibold text-slate-900">Générer le fichier APK</p>
                    <p className="mt-0.5 text-slate-600">
                      Dans la barre de menu : <strong>Build → Build App Bundle(s) / APK(s) → Build APK(s)</strong>.
                      Pour une version signée, choisissez <strong>Build → Generate Signed App Bundle / APK → APK</strong>.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3 border-t border-slate-100 pt-3">
                  <span className="font-mono text-xs font-bold text-emerald-700 pt-0.5">03.</span>
                  <div>
                    <p className="font-semibold text-slate-900">Récupérer le binaire compilé</p>
                    <p className="mt-0.5 text-slate-600">
                      Cliquez sur <strong>locate</strong> dans la notification Android Studio ou ouvrez{' '}
                      <code className="text-xs font-semibold">app/build/outputs/apk/debug/app-debug.apk</code>.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          )}

          {/* Method 3: Gradle CLI */}
          {method === 'cli' && (
            <div className="mt-5 space-y-5">
              <p className="text-sm text-slate-600">
                Si JDK 17, Gradle et le SDK Android (API 35) sont installés sur votre poste, compilez l&apos;APK directement depuis le terminal :
              </p>

              <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0F172A] text-slate-100">
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5 text-xs">
                  <span className="font-mono text-slate-400">APK Debug (rapide)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('debug', CLI_DEBUG_CMD)}
                    className="inline-flex min-h-[30px] items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700 cursor-pointer"
                  >
                    {copiedBlock === 'debug' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                        <span>Copié</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Copier</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-xs leading-6 text-emerald-300">
                  <code>{CLI_DEBUG_CMD}</code>
                </pre>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0F172A] text-slate-100">
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5 text-xs">
                  <span className="font-mono text-slate-400">Signature Release &amp; installation ADB</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('release', CLI_RELEASE_CMD)}
                    className="inline-flex min-h-[30px] items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700 cursor-pointer"
                  >
                    {copiedBlock === 'release' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                        <span>Copié</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Copier</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-xs leading-6 text-slate-200">
                  <code>{CLI_RELEASE_CMD}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Installing the APK on the Android phone */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="flex items-start gap-3">
              <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" aria-hidden="true" />
              <div className="text-sm text-slate-600">
                <p className="font-semibold text-slate-900">
                  Installation sur votre smartphone Android (Android 8 → 15+)
                </p>
                <p className="mt-1 leading-relaxed">
                  Copiez le fichier <code className="text-xs font-semibold text-slate-800">app-debug.apk</code> sur votre téléphone,
                  ouvrez-le depuis le gestionnaire de fichiers et activez la permission système{' '}
                  <strong>Installer des applications inconnues</strong> si demandé. Lors du premier lancement, acceptez
                  l&apos;autorisation <strong>Notifications</strong> (Android 13+) puis désactivez l&apos;optimisation batterie
                  si votre constructeur (Xiaomi, Samsung, Oppo) restreint les services en arrière-plan.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Right: APK Readiness Checklist */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="font-display text-base font-bold text-slate-900">
            Vérification pré-compilation APK
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Tous les fichiers nécessaires au packaging APK sont inclus dans l&apos;archive.
          </p>

          <ul className="mt-4 divide-y divide-slate-100">
            {APK_READINESS_ITEMS.map((item) => (
              <li key={item.fileId} className="py-3 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => onOpenFile(item.fileId)}
                  className="group flex w-full items-start gap-2.5 text-left cursor-pointer"
                >
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
