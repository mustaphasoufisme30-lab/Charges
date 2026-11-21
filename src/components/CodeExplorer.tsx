import { Check, Copy, Download, FileCode2, Search } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { ANDROID_PROJECT_FILES, AndroidSourceFile } from '../data/androidProjectFiles';

interface CodeExplorerProps {
  selectedFileId: string;
  onSelectFile: (id: string) => void;
  onDownloadZip: () => void;
}

interface Token {
  text: string;
  className: string;
}

const KOTLIN_KEYWORDS = new Set([
  'package',
  'import',
  'class',
  'object',
  'enum',
  'data',
  'fun',
  'val',
  'var',
  'private',
  'override',
  'const',
  'companion',
  'return',
  'if',
  'else',
  'when',
  'true',
  'false',
  'null',
  'this',
  'super',
  'by',
  'in',
  'as',
  'is',
  'plugins',
  'android',
  'defaultConfig',
  'buildTypes',
  'compileOptions',
  'kotlinOptions',
  'buildFeatures',
  'dependencies',
  'implementation',
  'debugImplementation',
]);

function tokenizeLine(line: string, lang: AndroidSourceFile['language']): Token[] {
  const trimmed = line.trim();
  if (lang === 'xml') {
    if (trimmed.startsWith('<!--')) {
      return [{ text: line, className: 'text-slate-500 italic' }];
    }
    const tokens: Token[] = [];
    const regex = /(<\/?[\w:.-]+|\/>|>|[\w:.-]+(?==)|"[^"]*")/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > last) {
        tokens.push({ text: line.slice(last, match.index), className: 'text-slate-200' });
      }
      const val = match[0];
      if (val.startsWith('<') || val === '>' || val === '/>') {
        tokens.push({ text: val, className: 'text-sky-400' });
      } else if (val.startsWith('"')) {
        tokens.push({ text: val, className: 'text-emerald-300' });
      } else {
        tokens.push({ text: val, className: 'text-amber-300' });
      }
      last = regex.lastIndex;
    }
    if (last < line.length) {
      tokens.push({ text: line.slice(last), className: 'text-slate-200' });
    }
    return tokens;
  }

  if (lang === 'text') {
    return [{ text: line, className: trimmed.startsWith('#') ? 'text-slate-400 italic' : 'text-slate-200' }];
  }

  if (lang === 'yaml') {
    if (trimmed.startsWith('#')) {
      return [{ text: line, className: 'text-slate-500 italic' }];
    }
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0 && !trimmed.startsWith('- ')) {
      return [
        { text: line.slice(0, colonIdx + 1), className: 'text-sky-400 font-medium' },
        { text: line.slice(colonIdx + 1), className: 'text-emerald-300' },
      ];
    }
    return [{ text: line, className: 'text-slate-200' }];
  }

  // Kotlin & Gradle KTS
  const commentIdx = line.indexOf('//');
  const codePart = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
  const commentPart = commentIdx >= 0 ? line.slice(commentIdx) : '';

  const tokens: Token[] = [];
  if (codePart.length > 0) {
    const regex = /("(?:\\.|[^"\\])*"|@[A-Za-z_]\w*|\b[A-Za-z_]\w*\b|\b\d+(?:\.\d+)?[fL]?\b)/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(codePart)) !== null) {
      if (match.index > last) {
        tokens.push({ text: codePart.slice(last, match.index), className: 'text-slate-300' });
      }
      const val = match[0];
      if (val.startsWith('"')) {
        tokens.push({ text: val, className: 'text-emerald-300' });
      } else if (val.startsWith('@')) {
        tokens.push({ text: val, className: 'text-amber-300' });
      } else if (KOTLIN_KEYWORDS.has(val)) {
        tokens.push({ text: val, className: 'text-sky-400 font-medium' });
      } else if (/^\d/.test(val)) {
        tokens.push({ text: val, className: 'text-amber-200' });
      } else if (/^[A-Z]/.test(val)) {
        tokens.push({ text: val, className: 'text-teal-200' });
      } else {
        tokens.push({ text: val, className: 'text-slate-100' });
      }
      last = regex.lastIndex;
    }
    if (last < codePart.length) {
      tokens.push({ text: codePart.slice(last), className: 'text-slate-300' });
    }
  }

  if (commentPart) {
    tokens.push({ text: commentPart, className: 'text-slate-500 italic' });
  }
  return tokens;
}

export function CodeExplorer({
  selectedFileId,
  onSelectFile,
  onDownloadZip,
}: CodeExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ANDROID_PROJECT_FILES;
    return ANDROID_PROJECT_FILES.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.path.toLowerCase().includes(q) ||
        f.summary.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const activeFile =
    ANDROID_PROJECT_FILES.find((f) => f.id === selectedFileId) ?? ANDROID_PROJECT_FILES[0];

  const lines = useMemo(() => activeFile.content.split('\n'), [activeFile.content]);

  async function handleCopyFile() {
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopiedId(activeFile.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for restricted iframe clipboard policies
      const textarea = document.createElement('textarea');
      textarea.value = activeFile.content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedId(activeFile.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    }
  }

  function handleDownloadSingleFile() {
    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.path.split('/').pop() ?? activeFile.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  const categories: Array<AndroidSourceFile['category']> = [
    'Manifest & Gradle',
    'Service & Modèle',
    'UI Jetpack Compose',
    'Build APK & Ressources',
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[296px_minmax(0,1fr)] items-start">
      {/* Left Sidebar: Android Studio Project Tree */}
      <aside className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-baseline justify-between gap-2 pb-3 border-b border-slate-100">
          <h2 className="font-display text-sm font-bold text-slate-900">
            Projet Android Studio
          </h2>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {ANDROID_PROJECT_FILES.length} fichiers
          </span>
        </div>

        {/* Search input */}
        <div className="relative mt-3">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer les fichiers..."
            aria-label="Filtrer les fichiers du projet Android"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Grouped File List */}
        <div className="mt-4 space-y-4">
          {filteredFiles.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">
              Aucun fichier ne correspond à &laquo; {searchQuery} &raquo;.
            </p>
          ) : (
            categories.map((cat) => {
              const items = filteredFiles.filter((f) => f.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="px-2 pb-1.5 text-xs font-semibold text-slate-500">
                    {cat}
                  </p>
                  <ul className="space-y-1">
                    {items.map((file) => {
                      const isSelected = file.id === activeFile.id;
                      return (
                        <li key={file.id}>
                          <button
                            type="button"
                            onClick={() => onSelectFile(file.id)}
                            aria-current={isSelected ? 'true' : undefined}
                            className={`flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                            }`}
                          >
                            <FileCode2
                              className={`h-4 w-4 shrink-0 ${
                                isSelected ? 'text-emerald-400' : 'text-slate-400'
                              }`}
                              aria-hidden="true"
                            />
                            <span className="truncate font-mono">{file.name}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onDownloadZip}
            className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-100 cursor-pointer"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Exporter tout le projet (.zip)</span>
          </button>
        </div>
      </aside>

      {/* Right Code Viewer */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-[#0F172A] text-slate-100">
        {/* File Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-[#131D31] px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-white truncate">
              {activeFile.path}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {activeFile.category} · {lines.length} lignes · {activeFile.summary}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyFile}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3.5 py-1.5 text-xs font-semibold text-slate-100 transition-colors hover:bg-slate-700 whitespace-nowrap cursor-pointer"
            >
              {copiedId === activeFile.id ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  <span>Copié</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copier le fichier</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownloadSingleFile}
              aria-label={`Télécharger ${activeFile.name}`}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 whitespace-nowrap cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Enregistrer</span>
            </button>
          </div>
        </div>

        {/* Code Body with Line Numbers */}
        <div className="max-h-[700px] overflow-auto p-4 sm:p-5">
          <pre className="font-mono text-[12.5px] leading-6">
            <code>
              {lines.map((line, index) => (
                <div key={index} className="flex hover:bg-slate-800/45 rounded px-1">
                  <span
                    aria-hidden="true"
                    className="w-10 shrink-0 select-none pr-4 text-right text-slate-500 tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <span className="flex-1 whitespace-pre">
                    {line.length === 0
                      ? ' '
                      : tokenizeLine(line, activeFile.language).map((tok, tIdx) => (
                          <Fragment key={tIdx}>
                            <span className={tok.className}>{tok.text}</span>
                          </Fragment>
                        ))}
                  </span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      </section>
    </div>
  );
}
