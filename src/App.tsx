import { useEffect, useState, type ComponentType } from 'react';
import { Menu, Save, LogIn, LogOut, Check } from 'lucide-react';
import { Sidebar, type SectionId } from '@/components/Sidebar';
import { CockpitPanel } from '@/components/CockpitPanel';
import { AuthModal } from '@/components/AuthModal';
import { DueDiligence } from '@/modules/DueDiligence';
import { Cronoprogramma } from '@/modules/Cronoprogramma';
import { Bozze } from '@/modules/Bozze';
import { CassettoDocumentale } from '@/modules/CassettoDocumentale';
import { GeneratoreLisp } from '@/modules/GeneratoreLisp';
import { useAttiva, useStore } from '@/lib/store';
import { getSupabase } from '@/lib/supabase';
import {
  caricaDaSupabase,
  sincronizzaCommessaSuSupabase,
} from '@/lib/supabaseSync';

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

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const caricaDatiCloud = async () => {
    try {
      const cloudData = await caricaDaSupabase();
      if (cloudData && cloudData.commesse.length > 0) {
        useStore.setState((prev) => ({
          commesse: cloudData.commesse,
          attivaId: cloudData.commesse.some((c) => c.id === prev.attivaId)
            ? prev.attivaId
            : cloudData.commesse[0].id,
          vani: { ...prev.vani, ...cloudData.vani },
          voci: { ...prev.voci, ...cloudData.voci },
        }));
      }
    } catch {
      // mantiene i dati locali se offline
    }
  };

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;

    void sb.auth.getSession().then(({ data }) => {
      const mail = data.session?.user?.email ?? null;
      setUserEmail(mail);
      if (mail) {
        void caricaDatiCloud();
      }
    });

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      const mail = session?.user?.email ?? null;
      setUserEmail(mail);
      if (mail) {
        void caricaDatiCloud();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthButtonClick = async () => {
    if (userEmail) {
      const sb = getSupabase();
      if (sb) {
        try {
          await sb.auth.signOut();
        } catch {
          // ignora eventuali errori di rete
        }
      }
      setUserEmail(null);
      setSyncError(null);
    } else {
      setAuthModalOpen(true);
    }
  };

  const handleSave = async () => {
    setSyncError(null);
    const snapshot = useStore.getState();
    try {
      localStorage.setItem('my-archinext-manual-save', JSON.stringify(snapshot));
    } catch {
      // ignora errori storage
    }

    const commessaCorrente =
      snapshot.commesse.find((c) => c.id === snapshot.attivaId) ?? snapshot.commesse[0];

    if (userEmail && commessaCorrente) {
      try {
        await sincronizzaCommessaSuSupabase(
          commessaCorrente,
          snapshot.vani?.[commessaCorrente.id] ?? [],
          snapshot.voci?.[commessaCorrente.id] ?? []
        );
      } catch (err: unknown) {
        setSyncError(err instanceof Error ? err.message : 'Errore sync Cloud');
        return;
      }
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
            {userEmail && (
              <span className="hidden sm:inline-block max-w-[180px] truncate text-[11px] font-mono text-zinc-300 lg:text-zinc-600">
                {userEmail}
              </span>
            )}

            <button
              type="button"
              onClick={() => void handleSave()}
              title={
                userEmail
                  ? 'Salva in locale e sincronizza su Supabase Cloud'
                  : 'Salva in locale (fai Login per sincronizzare su Cloud)'
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-mono font-bold text-white hover:bg-emerald-500 transition-colors shrink-0"
            >
              {savedFeedback ? <Check size={13} /> : <Save size={13} />}
              <span>{savedFeedback ? 'Saved' : 'Save'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleAuthButtonClick()}
              title={userEmail ? `Esci da ${userEmail}` : 'Accedi al Cloud'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-600 lg:border-zinc-300 bg-zinc-900 lg:bg-white px-2.5 py-1.5 text-[11px] font-mono font-bold text-white lg:text-zinc-900 hover:bg-zinc-800 lg:hover:bg-zinc-200 transition-colors shrink-0"
            >
              {userEmail ? <LogOut size={13} /> : <LogIn size={13} />}
              <span>{userEmail ? 'Logout' : 'Login'}</span>
            </button>
          </div>
        </header>

        {syncError && (
          <div className="mx-auto max-w-[1600px] px-4 sm:px-6 pt-3">
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-center justify-between">
              <span>Errore sincronizzazione Supabase: {syncError}</span>
              <button
                type="button"
                onClick={() => setSyncError(null)}
                className="font-mono underline ml-3"
              >
                Chiudi
              </button>
            </div>
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

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          const sb = getSupabase();
          if (sb) {
            void sb.auth.getSession().then(({ data }) => {
              const mail = data.session?.user?.email ?? null;
              setUserEmail(mail);
              if (mail) void caricaDatiCloud();
            });
          }
        }}
      />
    </div>
  );
}

export default App;