import { useState } from 'react';
import { ShieldCheck, Scale, Bot, X, Download, Trash2, CheckCircle2 } from 'lucide-react';
import { useStore } from '@/lib/store';

export type LegalTab = 'privacy' | 'ai-act' | 'disclaimer';

interface Props {
  open: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
  userEmail?: string | null;
}

export function LegalModal({ open, initialTab = 'privacy', onClose, userEmail }: Props) {
  const [tab, setTab] = useState<LegalTab>(initialTab);
  const [feedback, setFeedback] = useState<string>('');
  const commesse = useStore((s) => s.commesse);
  const vani = useStore((s) => s.vani);
  const voci = useStore((s) => s.voci);

  if (!open) return null;

  const handleExportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      account: userEmail ?? 'Modalità locale',
      commesse,
      vani,
      voci,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-archinext-export-gdpr-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback('Archivio JSON esportato (Portabilità dei dati ex Art. 20 GDPR).');
  };

  const handleClearLocalData = () => {
    localStorage.clear();
    setFeedback('Cache locale browser azzerata.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={17} className="text-emerald-400" />
            <div>
              <h2 className="text-sm font-semibold">Conformità Normativa — GDPR, AI Act & Note Legali</h2>
              <p className="text-[11px] text-slate-400">My Archinext — Piattaforma di supporto tecnico-edilizio</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => { setTab('privacy'); setFeedback(''); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === 'privacy' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck size={13} />
              <span>Informativa GDPR</span>
            </button>
            <button
              type="button"
              onClick={() => { setTab('ai-act'); setFeedback(''); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === 'ai-act' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Bot size={13} />
              <span>Trasparenza AI Act</span>
            </button>
            <button
              type="button"
              onClick={() => { setTab('disclaimer'); setFeedback(''); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === 'disclaimer' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Scale size={13} />
              <span>Responsabilità Tecnica</span>
            </button>
          </div>

          {tab === 'privacy' && (
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed max-h-80 overflow-y-auto pr-1">
              <p>
                <strong>1. Titolare e Finalità del Trattamento (Art. 13 Reg. UE 2016/679):</strong> I dati inseriti in My Archinext (credenziali di accesso, dati catastali, parametri geometrici dei vani e computi metrici) sono trattati esclusivamente per l’erogazione delle funzionalità tecniche della piattaforma.
              </p>
              <p>
                <strong>2. Archiviazione e Sicurezza (RLS):</strong> Le commesse sincronizzate su cloud sono protette mediante autenticazione e policy <em>Row Level Security</em> (RLS) su database PostgreSQL (Supabase), che garantiscono l’isolamento rigoroso dei dati per singolo account utente.
              </p>
              <p>
                <strong>3. Cookie e Tracciamento:</strong> L’applicazione utilizza esclusivamente storage tecnico strettamente necessario al mantenimento della sessione autenticazione e delle preferenze locali. Non vengono utilizzati cookie di profilazione o tracciamento pubblicitario.
              </p>
              <p>
                <strong>4. Diritti dell’Interessato (Artt. 15–20 GDPR):</strong> Puoi esportare in qualsiasi momento una copia strutturata dei tuoi dati in formato JSON oppure rimuovere i dati memorizzati localmente sul dispositivo.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportData}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
                >
                  <Download size={13} />
                  <span>Esporta i miei dati (JSON)</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearLocalData}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium transition-colors"
                >
                  <Trash2 size={13} />
                  <span>Svuota cache locale</span>
                </button>
              </div>
            </div>
          )}

          {tab === 'ai-act' && (
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed max-h-80 overflow-y-auto pr-1">
              <p>
                <strong>Informativa sulla Trasparenza (Art. 50 Reg. UE 2024/1689 — AI Act):</strong> My Archinext integra flussi assistiti da sistemi di Intelligenza Artificiale per l’estrazione strutturata di parametri normativi (NTA PRG Roma, Regolamento Edilizio 1934 e DAC n. 90/2026), la predisposizione di bozze di relazioni tecniche, script AutoLISP e computi metrici.
              </p>
              <p>
                <strong>Supervisione Umana Obbligatoria (Human-in-the-Loop):</strong> Gli output generati o precompilati hanno natura esclusivamente ausiliaria e informativa. Nessun elaborato è prodotto in modo completamente autonomo ai fini del deposito amministrativo (SUET / CILA / SCIA / PdC).
              </p>
              <p>
                <strong>Limiti di Affidabilità:</strong> I riferimenti normativi e le voci di prezzario devono sempre essere verificati sulla documentazione ufficiale vigente al momento della presentazione della pratica edilizia.
              </p>
            </div>
          )}

          {tab === 'disclaimer' && (
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed max-h-80 overflow-y-auto pr-1">
              <p>
                <strong>Esclusione di Responsabilità Professionale:</strong> My Archinext è uno strumento operativo di supporto alla progettazione e alla direzione tecnica, destinato a professionisti abilitati (Architetti, Ingegneri, Geometri).
              </p>
              <p>
                <strong>Asseverazione e Titoli Abilitativi:</strong> L’utilizzo della piattaforma non sostituisce in alcun modo la verifica puntuale dei titoli legittimanti pregressi, dei vincoli paesaggistici/storico-artistici (D.Lgs. 42/2004), delle norme sismiche o delle prescrizioni igienico-sanitarie specifiche dell’immobile, che restano sotto l’esclusiva responsabilità del progettista asseverante.
              </p>
            </div>
          )}

          {feedback && (
            <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
              <span>{feedback}</span>
            </div>
          )}

          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              Ho capito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}