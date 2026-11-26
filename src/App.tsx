import { useEffect, useState, type ComponentType } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar, type SectionId } from '@/components/Sidebar';
import { CockpitPanel } from '@/components/CockpitPanel';
import { DueDiligence } from '@/modules/DueDiligence';
import { Cronoprogramma } from '@/modules/Cronoprogramma';
import { Bozze } from '@/modules/Bozze';
import { CassettoDocumentale } from '@/modules/CassettoDocumentale';
import { GeneratoreLisp } from '@/modules/GeneratoreLisp';
import { useAttiva } from '@/lib/store';

type ModuleMap = Record<string, Record<string, ComponentType | undefined>>;

const allModuleFiles = import.meta.glob('./modules/*.tsx', { eager: true }) as ModuleMap;

function resolveModule(
  candidates: string[],
  exportNames: string[],
  label: string
): ComponentType {
  for (const path of candidates) {
    const mod = allModuleFiles[path];
    if (!mod) continue;
    for (const expName of exportNames) {
      if (typeof mod[expName] === 'function') {
        return mod[expName]!;
      }
    }
    if (typeof mod.default === 'function') {
      return mod.default;
    }
  }

  return () => (
    <div className="rounded-xl bg-white border border-zinc-300 p-5 text-xs text-zinc-700">
      Modulo <strong>{label}</strong> non ancora presente in <code>src/modules/</code>.
    </div>
  );
}

const AuditRAIModule = resolveModule(
  ['./modules/AuditRAI.tsx', './modules/Audit.tsx'],
  ['AuditRAI', 'Audit'],
  'Audit & RAI'
);

const AbachiModule = resolveModule(
  ['./modules/Abachi.tsx', './modules/AbachiVani.tsx'],
  ['Abachi', 'AbachiVani'],
  'Abachi Vani & Infissi'
);

const ComputoModule = resolveModule(
  ['./modules/Computo.tsx', './modules/ComputoMetrico.tsx'],
  ['Computo', 'ComputoMetrico'],
  'Computo Metrico'
);

export function App() {
  const { commessa } = useAttiva();
  const [activeSection, setActiveSection] = useState<SectionId>('due-diligence');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleOpenOrToggleMenu = () => {
    if (window.innerWidth < 1024) {
      setMobileMenuOpen(true);
    } else {
      setDesktopCollapsed((v) => !v);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'due-diligence':
        return <DueDiligence />;
      case 'audit-rai':
        return <AuditRAIModule />;
      case 'abachi':
        return <AbachiModule />;
      case 'computo':
        return <ComputoModule />;
      case 'cronoprogramma':
        return <Cronoprogramma />;
      case 'bozze':
        return <Bozze />;
      case 'documenti':
        return <CassettoDocumentale />;
      case 'autolisp':
        return <GeneratoreLisp />;
      default:
        return <DueDiligence />;
    }
  };

  const showTopTrigger = desktopCollapsed;

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-zinc-100 text-zinc-950 flex flex-col lg:flex-row">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        desktopCollapsed={desktopCollapsed}
        onToggleDesktopCollapse={() => setDesktopCollapsed((v) => !v)}
      />

      <div className="flex-1 min-w-0 lg:h-screen lg:overflow-y-auto">
        <div className="lg:hidden sticky top-0 z-20 bg-zinc-950 text-white border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-xs font-mono font-bold tracking-tight truncate">
              MY ARCHINEXT
            </span>
            {commessa && (
              <span className="text-[11px] font-mono text-zinc-400 truncate">
                · {commessa.codice}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleOpenOrToggleMenu}
            aria-label="Apri menu"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-[11px] font-mono font-bold text-zinc-950 hover:bg-zinc-200 transition-colors shrink-0"
          >
            <Menu size={14} className="text-zinc-950" />
            <span>Menu</span>
          </button>
        </div>

        {showTopTrigger && (
          <div className="hidden lg:flex sticky top-0 z-20 bg-zinc-100/95 backdrop-blur-xs border-b border-zinc-200 px-6 py-2.5 items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setDesktopCollapsed(false)}
              aria-label="Apri menu laterale"
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-mono font-bold text-white hover:bg-zinc-800 transition-colors"
            >
              <Menu size={14} />
              <span>Menu</span>
            </button>

            <span className="text-xs font-mono text-zinc-600 truncate">
              {commessa ? `${commessa.codice} · ${commessa.titolo}` : 'MY ARCHINEXT'}
            </span>
          </div>
        )}

        <div className="mx-auto max-w-[1600px] p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          <main className="xl:col-span-8 min-w-0">{renderSection()}</main>
          <aside className="xl:col-span-4 min-w-0">
            <CockpitPanel
              activeSection={activeSection}
              onSelectSection={setActiveSection}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

export default App;