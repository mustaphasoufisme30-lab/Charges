import { Download } from 'lucide-react';

export type WorkspaceTab = 'simulator' | 'code' | 'architecture' | 'apk';

interface TopBarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onDownloadZip: () => void;
}

const NAV_ITEMS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'simulator', label: 'Simulateur' },
  { id: 'code', label: 'Code source' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'apk', label: 'Exporter APK' },
];

export function TopBar({ activeTab, onSelectTab, onDownloadZip }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 md:h-16 max-w-[1380px] items-center justify-between gap-4 md:gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line brand title */}
        <button
          type="button"
          onClick={() => onSelectTab('simulator')}
          className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 rounded cursor-pointer"
        >
          ChargeGuard 100%
        </button>

        {/* Zone 2 (Desktop): Clean single-line typography navigation */}
        <nav aria-label="Navigation principale" className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelectTab(item.id)}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 rounded cursor-pointer ${
                  isActive
                    ? 'text-slate-950'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-emerald-600"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action CTA */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onDownloadZip}
            className="inline-flex min-h-[38px] md:min-h-[40px] items-center gap-2 rounded-lg bg-slate-900 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white whitespace-nowrap shrink-0 transition-colors hover:bg-slate-800 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 cursor-pointer"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Télécharger le projet .zip</span>
            <span className="sm:hidden">Projet .zip</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Strip (fits comfortably under 15% mobile viewport cap) */}
      <nav
        aria-label="Navigation mobile"
        className="flex md:hidden items-center justify-around border-t border-slate-100 px-2"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex min-h-[44px] flex-1 items-center justify-center text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                isActive ? 'text-slate-950' : 'text-slate-600'
              }`}
            >
              {item.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-4 bottom-0 h-0.5 bg-emerald-600"
                />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
