import { useEffect, useState, type ComponentType } from 'react';
import { Menu, Save, LogIn, LogOut, Check } from 'lucide-react';
import { Sidebar, type SectionId } from '@/components/Sidebar';
import { CockpitPanel } from '@/components/CockpitPanel';
import { DueDiligence } from '@/modules/DueDiligence';
import { Cronoprogramma } from '@/modules/Cronoprogramma';
import { Bozze } from '@/modules/Bozze';
import { CassettoDocumentale } from '@/modules/CassettoDocumentale';
import { GeneratoreLisp } from '@/modules/GeneratoreLisp';
import { useAttiva, useStore } from '@/lib/store';

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
  const attivaId = useStore((s) => s.attivaId);
  const [activeSection, setActiveSection] = useState<SectionId>('due-diligence');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('archinext_logged_in') !== 'false';
    } catch {
      return true;
    }
  });
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleToggleAuth = () => {
    setIsLoggedIn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('archinext_logged_in', String(next));
      } catch {
        // ignora errori storage
      }
      return next;
    });
  };

  const handleSave = () => {
    try {
      const snapshot = useStore.getState();
      localStorage.setItem('my-archinext-manual-save', JSON.stringify(snapshot));
    } catch {
      // ignora errori storage
    }
    setSavedFeedback(true);
    window.setTimeout(() => setSavedFeedback(false), 1800);
  };

  const renderSection = () => {
    const sectionKey = `${attivaId ?? 'default'}-${activeSection}`;
    switch (activeSection) {
      case 'due-diligence':
        return <DueDiligence key={sectionKey} />;
      case 'audit-rai':
        return <AuditRAIModule key={sectionKey} />;
      case 'abachi':
        return <AbachiModule key={sectionKey} />;
      case 'computo':
        return <ComputoModule key={sectionKey} />;
      case 'cronoprogramma':
        return <Cronoprogramma key={sectionKey} />;
      case 'bozze':
        return <Bozze key={sectionKey} />;
      case 'documenti':
        return <CassettoDocumentale key={sectionKey} />;
      case 'autolisp':
        return <GeneratoreLisp key={sectionKey} />;
      default:
        return <DueDiligence key={sectionKey} />;
    }
  };

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
        <header className="sticky top-0 z-20 bg-zinc-950 lg:bg-zinc-100/95 text-white lg:text-zinc-950 backdrop-blur-xs border-b border-zinc-800 lg:border-zinc-200 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {!mobileMenuOpen && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Apri menu"
                className="lg:hidden inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-mono font-bold text-zinc-950 hover:bg-zinc-200 transition-colors shrink-0"
              >
                <Menu size={14} className="text-zinc-950" />
                <span>Menu</span>
              </button>
            )}

            {desktopCollapsed && (
              <button
                type="button"
                onClick={() => setDesktopCollapsed(false)}
                aria-label="Apri menu laterale"
                className="hidden lg:inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-mono font-bold text-white hover:bg-zinc-800 transition-colors shrink-0"
              >
                <Menu size={14} />
                <span>Menu</span>
              </button>
            )}

            <div className="min-w-0 flex-1 truncate text-xs font-mono">
              <span className="font-bold">
                {commessa ? `${commessa.codice} — ${commessa.titolo}` : 'MY ARCHINEXT'}
              </span>
              {commessa?.indirizzo && (
                <span className="hidden md:inline text-zinc-500"> · {commessa.indirizzo}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-mono font-bold text-white hover:bg-emerald-500 transition-colors shrink-0"
            >
              {savedFeedback ? <Check size={13} /> : <Save size={13} />}
              <span>{savedFeedback ? 'Saved' : 'Save'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleAuth}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-600 lg:border-zinc-300 bg-zinc-900 lg:bg-white px-2.5 py-1.5 text-[11px] font-mono font-bold text-white lg:text-zinc-900 hover:bg-zinc-800 lg:hover:bg-zinc-200 transition-colors shrink-0"
            >
              {isLoggedIn ? <LogOut size={13} /> : <LogIn size={13} />}
              <span>{isLoggedIn ? 'Logout' : 'Login'}</span>
            </button>
          </div>
        </header>

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