import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  SunMedium,
  LayoutGrid,
  Zap,
  Calculator,
  CalendarRange,
  FileCheck2,
  FolderArchive,
  Code2,
  Plus,
  FolderKanban,
  MapPin,
  Sparkles,
  Menu,
} from 'lucide-react';
import { useStore, useAttiva } from '@/lib/store';

export type SectionId =
  | 'due-diligence'
  | 'audit-rai'
  | 'abachi'
  | 'impianti'
  | 'computo'
  | 'cronoprogramma'
  | 'bozze'
  | 'documenti'
  | 'autolisp';

export interface SidebarProps {
  activeSection: SectionId;
  onSelectSection: (section: SectionId) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  desktopCollapsed?: boolean;
  onToggleDesktopCollapse?: () => void;
}

interface NavItemConfig {
  id: SectionId;
  stepNumber: number;
  label: string;
  icon: typeof Building2;
}

const WORKFLOW_ITEMS: NavItemConfig[] = [
  { id: 'due-diligence', stepNumber: 1, label: 'Due Diligence & PRG', icon: Building2 },
  { id: 'audit-rai', stepNumber: 2, label: 'Audit & RAI', icon: SunMedium },
  { id: 'abachi', stepNumber: 3, label: 'Abachi Vani & Infissi', icon: LayoutGrid },
  { id: 'computo', stepNumber: 4, label: 'Computo Metrico', icon: Calculator },
  { id: 'cronoprogramma', stepNumber: 5, label: 'Cronoprogramma', icon: CalendarRange },
  { id: 'bozze', stepNumber: 6, label: 'Relazione SUET', icon: FileCheck2 },
];

const STEP_INDICES_BY_ITEM: Record<SectionId, number | null> = {
  'due-diligence': 0,
  'audit-rai': 1,
  abachi: 2,
  computo: 3,
  cronoprogramma: 4,
  bozze: 5,
  impianti: null,
  documenti: null,
  autolisp: null,
};

const EMPTY_STEPS: boolean[] = [false, false, false, false, false, false];

export function Sidebar({
  activeSection,
  onSelectSection,
  mobileOpen = false,
  onCloseMobile,
  desktopCollapsed = false,
  onToggleDesktopCollapse,
}: SidebarProps) {
  const commesse = useStore((s) => s.commesse ?? []);
  const attivaId = useStore((s) => s.attivaId);
  const selezionaCommessa = useStore((s) => s.selezionaCommessa);
  const creaCommessa = useStore((s) => s.creaCommessa);
  const rawSteps = useStore((s) => (s.attivaId ? s.steps?.[s.attivaId] : undefined));
  const { commessa } = useAttiva();

  const [nuovaAperta, setNuovaAperta] = useState(false);
  const [nuovoTitolo, setNuovoTitolo] = useState('');
  const [nuovoIndirizzo, setNuovoIndirizzo] = useState('Via del Boschetto, 72, 00184 Roma RM');

  const steps = useMemo(
    () => Array.from({ length: 6 }, (_, idx) => Boolean(rawSteps?.[idx] ?? EMPTY_STEPS[idx])),
    [rawSteps]
  );

  const completati = steps.filter(Boolean).length;
  const pct = Math.round((completati / 6) * 100);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const handleSelect = (section: SectionId) => {
    onSelectSection(section);
    if (window.innerWidth < 1024) {
      window.setTimeout(() => {
        onCloseMobile?.();
      }, 60);
    }
  };

  const handleSidebarMenuClick = () => {
    if (window.innerWidth < 1024) {
      onCloseMobile?.();
    } else {
      onToggleDesktopCollapse?.();
    }
  };

  const handleCreaCommessa = (e: React.FormEvent) => {
    e.preventDefault();
    const titoloPulito = nuovoTitolo.trim();
    if (!titoloPulito || typeof creaCommessa !== 'function') return;
    creaCommessa({
      titolo: titoloPulito,
      indirizzo: nuovoIndirizzo.trim() || 'Via del Boschetto, 72, 00184 Roma RM',
    });
    setNuovoTitolo('');
    setNuovaAperta(false);
  };

  const sidebarContent = (
    <div className="h-full bg-zinc-950 text-zinc-100 border-r border-zinc-800 flex flex-col justify-between select-none overflow-y-auto overscroll-contain touch-manipulation">
      <div className="p-4 space-y-4">
        <div className="pb-3 border-b border-zinc-800 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-sm font-mono font-bold tracking-tight text-white truncate">
                MY ARCHINEXT
              </span>
            </div>
            <p className="text-[11px] font-medium text-zinc-300 mt-1 leading-snug">
              Assistente Tecnico Generativo
            </p>
          </div>

          <button
            type="button"
            onClick={handleSidebarMenuClick}
            aria-label="Comprimi o chiudi menu"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-mono font-bold text-zinc-950 hover:bg-zinc-200 transition-colors shrink-0 shadow-xs"
          >
            <Menu size={14} className="text-zinc-950" />
            <span>Menu</span>
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="sidebar-commessa-select"
              className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400"
            >
              <FolderKanban size={12} className="text-zinc-300" />
              <span>Commessa Attiva</span>
            </label>
            {typeof creaCommessa === 'function' && (
              <button
                type="button"
                onClick={() => setNuovaAperta((v) => !v)}
                className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-300 hover:text-white px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 transition-colors"
                title="Nuova commessa"
              >
                <Plus size={11} />
                <span>Nuova</span>
              </button>
            )}
          </div>

          <select
            id="sidebar-commessa-select"
            value={commessa?.id ?? attivaId ?? ''}
            onChange={(e) => {
              if (typeof selezionaCommessa === 'function') {
                selezionaCommessa(e.target.value);
              }
            }}
            className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-white"
          >
            {commesse.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codice} — {c.titolo}
              </option>
            ))}
          </select>

          {commessa && (
            <div className="rounded-lg bg-zinc-900/90 border border-zinc-800/90 px-2.5 py-2 space-y-1 text-[11px]">
              <div className="flex items-center justify-between gap-2 font-mono">
                <span className="text-zinc-400">CODICE</span>
                <strong className="text-white tabular-nums">{commessa.codice}</strong>
              </div>
              <div className="flex items-start gap-1.5 text-zinc-300">
                <MapPin size={12} className="text-zinc-400 shrink-0 mt-0.5" />
                <span className="line-clamp-2 leading-snug">
                  {commessa.indirizzo || 'Via del Boschetto, 72, 00184 Roma RM'}
                </span>
              </div>
            </div>
          )}

          {nuovaAperta && (
            <form
              onSubmit={handleCreaCommessa}
              className="rounded-lg bg-zinc-900 border border-zinc-700 p-2.5 space-y-2 text-xs"
            >
              <input
                type="text"
                value={nuovoTitolo}
                onChange={(e) => setNuovoTitolo(e.target.value)}
                placeholder="Titolo commessa (es. Ristrutturazione)"
                className="w-full rounded bg-zinc-950 border border-zinc-700 px-2 py-1 text-white placeholder:text-zinc-500 focus:outline-none focus:border-white"
              />
              <input
                type="text"
                value={nuovoIndirizzo}
                onChange={(e) => setNuovoIndirizzo(e.target.value)}
                placeholder="Indirizzo a Roma"
                className="w-full rounded bg-zinc-950 border border-zinc-700 px-2 py-1 text-white placeholder:text-zinc-500 focus:outline-none focus:border-white"
              />
              <div className="flex items-center justify-end gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setNuovaAperta(false)}
                  className="px-2 py-1 rounded text-[11px] text-zinc-400 hover:text-white"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded bg-white text-zinc-950 font-semibold text-[11px] hover:bg-zinc-200"
                >
                  Crea
                </button>
              </div>
            </form>
          )}
        </div>

        <nav aria-label="Fasi di commessa" className="space-y-1 pt-1">
          <div className="px-1 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
            Workflow Commessa (6 Step)
          </div>

          {WORKFLOW_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const stepIdx = STEP_INDICES_BY_ITEM[item.id];
            const isDone = stepIdx !== null ? steps[stepIdx] : false;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors border ${
                  isActive
                    ? 'bg-white text-zinc-950 border-white font-semibold shadow-xs'
                    : 'bg-transparent text-zinc-200 border-transparent hover:bg-zinc-900 hover:border-zinc-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                      isActive
                        ? 'bg-zinc-950 text-white'
                        : isDone
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    {item.stepNumber}
                  </span>
                  <Icon
                    size={14}
                    className={isActive ? 'text-zinc-950 shrink-0' : 'text-zinc-400 shrink-0'}
                  />
                  <span className="text-xs truncate">{item.label}</span>
                </span>

                {stepIdx !== null && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isDone
                        ? 'bg-emerald-400'
                        : isActive
                          ? 'bg-zinc-950'
                          : 'bg-zinc-700'
                    }`}
                    title={isDone ? 'Step completato' : 'Step da completare'}
                  />
                )}
              </button>
            );
          })}

          <div className="pt-2 mt-2 border-t border-zinc-800/90 space-y-1">
            <div className="px-1 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
              ARCHIVIO / ALLEGATI / TOOLS
            </div>

            <button
              type="button"
              onClick={() => handleSelect('impianti')}
              className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors border ${
                activeSection === 'impianti'
                  ? 'bg-white text-zinc-950 border-white font-semibold shadow-xs'
                  : 'bg-zinc-900/60 text-zinc-200 border-zinc-800 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <Zap
                size={15}
                className={
                  activeSection === 'impianti' ? 'text-zinc-950 shrink-0' : 'text-amber-300 shrink-0'
                }
              />
              <span className="text-xs truncate">Impianti CEI 64-8 / DM 37</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelect('documenti')}
              className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors border ${
                activeSection === 'documenti'
                  ? 'bg-white text-zinc-950 border-white font-semibold shadow-xs'
                  : 'bg-zinc-900/60 text-zinc-200 border-zinc-800 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <FolderArchive
                size={15}
                className={
                  activeSection === 'documenti' ? 'text-zinc-950 shrink-0' : 'text-zinc-300 shrink-0'
                }
              />
              <span className="text-xs truncate">Cassetto Documentale</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelect('autolisp')}
              className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors border ${
                activeSection === 'autolisp'
                  ? 'bg-white text-zinc-950 border-white font-semibold shadow-xs'
                  : 'bg-zinc-900/40 text-zinc-300 border-zinc-800/80 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <Code2
                size={14}
                className={
                  activeSection === 'autolisp' ? 'text-zinc-950 shrink-0' : 'text-zinc-400 shrink-0'
                }
              />
              <span className="text-xs truncate">AutoLISP CAD · Gialli/Rossi</span>
            </button>
          </div>
        </nav>
      </div>

      <div className="p-4 pt-3 border-t border-zinc-800 bg-zinc-950/95 space-y-2.5">
        <div>
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-300 mb-1">
            <span>AVANZAMENTO ITER</span>
            <span className="font-bold text-white tabular-nums">
              {completati}/6 · {pct}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
          <Sparkles size={11} className="text-zinc-400 shrink-0" />
          <span className="truncate">PRG · REC · DAC 90/2026</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {!desktopCollapsed && (
        <aside className="hidden lg:block w-64 h-dvh sticky top-0 shrink-0">
          {sidebarContent}
        </aside>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex h-dvh w-screen overflow-hidden">
          <button
            type="button"
            aria-label="Chiudi sidebar"
            onClick={() => onCloseMobile?.()}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] cursor-default"
          />
          <aside className="relative z-50 w-72 max-w-[85vw] h-full overscroll-contain touch-manipulation shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}