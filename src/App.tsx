import { useEffect, useState } from 'react';
import { Cloud, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Sidebar, type SectionId } from '@/components/Sidebar';
import { CockpitPanel } from '@/components/CockpitPanel';
import { DueDiligence } from '@/modules/DueDiligence';
import { AuditRAI } from '@/modules/AuditRAI';
import { GeneratoreLisp } from '@/modules/GeneratoreLisp';
import { Impianti } from '@/modules/Impianti';
import { Computo } from '@/modules/Computo';
import { Bozze } from '@/modules/Bozze';
import { useStore, useAttiva } from '@/lib/store';
import { caricaDaSupabase, sincronizzaCommessaSuSupabase } from '@/lib/supabaseSync';

function App() {
  const [section, setSection] = useState<SectionId>('due-diligence');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [syncMsg, setSyncMsg] = useState<string>('');

  const { commessa } = useAttiva();
  const vani = useStore((s) => (commessa ? s.vani[commessa.id] ?? [] : []));
  const voci = useStore((s) => (commessa ? s.voci[commessa.id] ?? [] : []));

  useEffect(() => {
    caricaDaSupabase()
      .then((cloudData) => {
        if (cloudData && cloudData.commesse.length > 0) {
          useStore.setState((prev) => ({
            commesse: cloudData.commesse,
            attivaId: cloudData.commesse[0].id,
            vani: { ...prev.vani, ...cloudData.vani },
            voci: { ...prev.voci, ...cloudData.voci },
          }));
        }
      })
      .catch((err) => {
        console.warn('Lettura iniziale Supabase:', err);
      });
  }, []);

  const handleSyncCloud = async () => {
    if (!commessa) return;
    setSyncStatus('saving');
    setSyncMsg('');
    try {
      await sincronizzaCommessaSuSupabase(commessa, vani, voci);
      setSyncStatus('saved');
      setSyncMsg('Sincronizzato su Supabase');
      setTimeout(() => setSyncStatus('idle'), 3500);
    } catch (err: unknown) {
      setSyncStatus('error');
      setSyncMsg(err instanceof Error ? err.message : 'Errore sincronizzazione');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/90 flex">
      <Sidebar section={section} onChange={setSection} />

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-2.5 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Database Cloud: <span className="font-medium text-slate-700">Supabase PostgreSQL</span>
          </div>
          <div className="flex items-center gap-3">
            {syncMsg && (
              <span
                className={`text-xs font-medium ${
                  syncStatus === 'error' ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {syncMsg}
              </span>
            )}
            <button
              onClick={handleSyncCloud}
              disabled={syncStatus === 'saving' || !commessa}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {syncStatus === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {syncStatus === 'saved' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              {syncStatus === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
              {syncStatus === 'idle' && <Cloud className="w-3.5 h-3.5" />}
              {syncStatus === 'saving' ? 'Salvataggio...' : 'Salva su Supabase'}
            </button>
          </div>
        </header>

        {/* Layout a 2 colonne a piena larghezza senza strozzature centrali */}
        <div className="flex-1 w-full px-6 py-5">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
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
      </main>
    </div>
  );
}

export default App;