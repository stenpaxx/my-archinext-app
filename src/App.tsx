import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useStore, EMPTY_VANI, EMPTY_VOCI } from '@/lib/store';
import { getSupabase } from '@/lib/supabase';
import { caricaDaSupabase, sincronizzaCommessaSuSupabase } from '@/lib/supabaseSync';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMsg: string; stack: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: '', stack: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      errorMsg: error?.message || String(error),
      stack: error?.stack || '',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white p-6 font-mono text-xs overflow-auto">
          <h1 className="text-base font-bold text-red-400 mb-2">Errore catturato in runtime</h1>
          <p className="mb-4 text-amber-300">{this.state.errorMsg}</p>
          <pre className="whitespace-pre-wrap text-slate-300 bg-slate-900 p-4 rounded border border-slate-800">
            {this.state.stack}
          </pre>
          <button
            type="button"
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="mt-4 px-4 py-2 bg-sky-600 text-white rounded font-sans font-semibold"
          >
            Pulisci cache locale e ricarica
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
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

  const attivaId = useStore((s) => s.attivaId);
  const commessa = useStore((s) => s.commesse.find((c) => c.id === s.attivaId));
  const vani = useStore((s) => (s.attivaId ? s.vani[s.attivaId] ?? EMPTY_VANI : EMPTY_VANI));
  const voci = useStore((s) => (s.attivaId ? s.voci[s.attivaId] ?? EMPTY_VOCI : EMPTY_VOCI));
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
    if (!isHydrated || !attivaId || !user) return;

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
  }, [isHydrated, attivaId, commessa, vani, voci, user?.id, handleSyncCloud]);

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

            {user ? (
              <>
                <button
                  type="button"
                  onClick={handleSyncCloud}
                  disabled={syncStatus === 'saving' || !commessa}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {syncStatus === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {syncStatus === 'saved' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {syncStatus === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                  {(syncStatus === 'idle' || syncStatus === 'pending') && <Cloud className="w-3.5 h-3.5" />}
                  <span>{syncStatus === 'saving' ? 'Salvataggio...' : 'Salva ora'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Esci dall'account"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Esci</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Accedi</span>
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

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}