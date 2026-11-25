import { useCallback, useEffect, useRef, useState } from 'react';
import { Cloud, CheckCircle2, Loader2, AlertCircle, LogIn, LogOut, UserCheck, ShieldCheck, Bot, Menu } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { Sidebar, type SectionId } from '@/components/Sidebar';
import { CockpitPanel } from '@/components/CockpitPanel';
import { CatalogoAdminModal } from '@/components/CatalogoAdminModal';
import { AuthModal } from '@/components/AuthModal';
import { LegalModal, type LegalTab } from '@/components/LegalModal';
import { DueDiligence } from '@/modules/DueDiligence';
import { AuditRAI } from '@/modules/AuditRAI';
import { GeneratoreLisp } from '@/modules/GeneratoreLisp';
import { Impianti } from '@/modules/Impianti';
import { Computo } from '@/modules/Computo';
import { Bozze } from '@/modules/Bozze';
import { useStore, useAttiva } from '@/lib/store';
import { getSupabase } from '@/lib/supabase';
import { caricaDaSupabase, sincronizzaCommessaSuSupabase } from '@/lib/supabaseSync';

function App() {
  const [section, setSection] = useState<SectionId>('due-diligence');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [catalogoOpen, setCatalogoOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab>('privacy');
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle');
  const [syncMsg, setSyncMsg] = useState<string>('');
  const [isHydrated, setIsHydrated] = useState(false);

  const { commessa } = useAttiva();
  const vani = useStore((s) => (commessa ? s.vani[commessa.id] ?? [] : []));
  const voci = useStore((s) => (commessa ? s.voci[commessa.id] ?? [] : []));
  const caricaCataloghi = useStore((s) => s.caricaCataloghi);

  const skipNextAutoSaveRef = useRef(true);
  const isSavingRef = useRef(false);
  const latestPayloadRef = useRef({ commessa, vani, voci, user });

  useEffect(() => {
    latestPayloadRef.current = { commessa, vani, voci, user };
  }, [commessa, vani, voci, user]);

  const openLegal = (tab: LegalTab) => {
    setLegalTab(tab);
    setLegalOpen(true);
  };

  const loadUserCloudData = useCallback(async () => {
    skipNextAutoSaveRef.current = true;
    try {
      const cloudData = await caricaDaSupabase();
      if (cloudData && cloudData.commesse.length > 0) {
        useStore.setState((prev) => ({
          commesse: cloudData.commesse,
          attivaId: cloudData.commesse[0].id,
          vani: { ...prev.vani, ...cloudData.vani },
          voci: { ...prev.voci, ...cloudData.voci },
        }));
      }
    } catch (err) {
      console.warn('Lettura iniziale Supabase:', err);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    caricaCataloghi();

    const sb = getSupabase();
    if (!sb) {
      setIsHydrated(true);
      return;
    }

    sb.auth.getUser().then(({ data }) => {
      const currentUser = data.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadUserCloudData();
      } else {
        setIsHydrated(true);
      }
    });

    const { data: listener } = sb.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        loadUserCloudData();
      } else {
        setSyncStatus('idle');
        setSyncMsg('');
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [caricaCataloghi, loadUserCloudData]);

  const handleSyncCloud = useCallback(async () => {
    const { commessa: currCommessa, vani: currVani, voci: currVoci, user: currUser } = latestPayloadRef.current;
    if (!currCommessa) return;
    if (!currUser) {
      setAuthOpen(true);
      return;
    }
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    skipNextAutoSaveRef.current = true;
    setSyncStatus('saving');
    setSyncMsg('Auto-salvataggio...');

    try {
      await sincronizzaCommessaSuSupabase(currCommessa, currVani, currVoci);
      const ora = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      setSyncStatus('saved');
      setSyncMsg(`Salvato (${ora})`);
    } catch (err: unknown) {
      setSyncStatus('error');
      setSyncMsg(err instanceof Error ? err.message : 'Errore sincronizzazione');
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || !commessa || !user) return;

    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }

    setSyncStatus('pending');
    setSyncMsg('Modifiche in coda...');

    const timer = window.setTimeout(() => {
      handleSyncCloud();
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [isHydrated, commessa?.id, commessa, vani, voci, user?.id, handleSyncCloud]);

  const handleLogout = async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-slate-100/90 flex overflow-x-clip">
      <Sidebar
        section={section}
        onChange={setSection}
        onOpenCatalogo={() => setCatalogoOpen(true)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Apri menu"
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 shrink-0"
            >
              <Menu size={16} />
            </button>
            <span className="hidden sm:inline">Cloud RLS:</span>
            {user ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 truncate">
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{user.email}</span>
              </span>
            ) : (
              <span className="font-medium text-amber-700 truncate">Modalità locale</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {syncMsg && (
              <span
                className={`text-[11px] sm:text-xs font-medium ${
                  syncStatus === 'error'
                    ? 'text-red-600'
                    : syncStatus === 'pending'
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                }`}
              >
                {syncMsg}
              </span>
            )}

            <button
              onClick={handleSyncCloud}
              disabled={syncStatus === 'saving' || !commessa}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {syncStatus === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {syncStatus === 'saved' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              {syncStatus === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
              {(syncStatus === 'idle' || syncStatus === 'pending') && <Cloud className="w-3.5 h-3.5" />}
              <span>{user ? (syncStatus === 'saving' ? 'Salvataggio...' : 'Salva ora') : 'Accedi'}</span>
            </button>

            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                title="Esci dall'account"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Esci</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 w-full px-3 sm:px-6 py-4 sm:py-5">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6 items-start">
            <div className="xl:col-span-8 min-w-0 [&_.max-w-4xl]:max-w-none [&_.max-w-5xl]:max-w-none [&_.max-w-6xl]:max-w-none [&_.max-w-7xl]:max-w-none [&_table]:w-full">
              {section === 'due-diligence' && <DueDiligence />}
              {section === 'rai' && <AuditRAI />}
              {section === 'lisp' && <GeneratoreLisp />}
              {section === 'impianti' && <Impianti />}
              {section === 'computo' && <Computo />}
              {section === 'atti' && <Bozze />}
            </div>

            <div className="xl:col-span-4 min-w-0">
              <CockpitPanel activeSection={section} onSelectSection={setSection} />
            </div>
          </div>
        </div>

        <footer className="border-t border-slate-200 bg-white/80 px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              Supporto decisionale assistito da AI (Reg. UE 2024/1689): gli elaborati richiedono verifica e asseverazione del tecnico abilitato.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 font-medium text-slate-600">
            <button
              type="button"
              onClick={() => openLegal('privacy')}
              className="inline-flex items-center gap-1 hover:text-slate-900"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Privacy & GDPR</span>
            </button>
            <button
              type="button"
              onClick={() => openLegal('ai-act')}
              className="hover:text-slate-900"
            >
              Trasparenza AI Act
            </button>
            <button
              type="button"
              onClick={() => openLegal('disclaimer')}
              className="hover:text-slate-900"
            >
              Note Legali
            </button>
          </div>
        </footer>
      </main>

      <CatalogoAdminModal
        open={catalogoOpen}
        onClose={() => setCatalogoOpen(false)}
        onUpdated={() => caricaCataloghi()}
      />

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => {
          skipNextAutoSaveRef.current = false;
          handleSyncCloud();
        }}
      />

      <LegalModal
        open={legalOpen}
        initialTab={legalTab}
        onClose={() => setLegalOpen(false)}
        userEmail={user?.email ?? null}
      />
    </div>
  );
}

export default App;