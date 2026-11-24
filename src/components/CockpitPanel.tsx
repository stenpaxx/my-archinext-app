import {
    Sparkles,
    Euro,
    CheckCircle2,
    AlertTriangle,
    FileCheck2,
    Building2,
    Ruler,
    ShieldAlert,
    ArrowUpRight,
  } from 'lucide-react';
  import type { SectionId } from '@/components/Sidebar';
  import { useStore, useAttiva } from '@/lib/store';
  
  interface CockpitPanelProps {
    activeSection: SectionId;
    onSelectSection: (sec: SectionId) => void;
  }
  
  const SECTION_COPILOT_HINTS: Record<
    SectionId,
    {
      badge: string;
      title: string;
      insights: string[];
      actionLabel: string;
      nextSection: SectionId;
    }
  > = {
    'due-diligence': {
      badge: 'NTA PRG Roma Capitale',
      title: 'Verifica Preliminare & Vincoli',
      insights: [
        'In Città Storica (T1/T2) verifica sempre la consistenza d’impianto rispetto alla planimetria catastale 1939.',
        'Con vincolo D.Lgs. 42/2004, le modifiche esterne o prospettiche richiedono Autorizzazione Paesaggistica.',
        'Per la Carta per la Qualità allega documentazione fotografica e relazione sui materiali tradizionali.',
      ],
      actionLabel: 'Passa all’Audit RAI',
      nextSection: 'rai',
    },
    rai: {
      badge: 'Regolamento Edilizio Roma',
      title: 'Controllo Superfici & RAI ≥ 1/8',
      insights: [
        'Soggiorni, cucine e camere da letto richiedono rapporto aeroilluminante ≥ 0,125 (1/8 della superficie).',
        'Altezza minima utile: 2,70 m per vani principali, 2,40 m per bagni, disimpegni e ripostigli.',
        'I bagni ciechi sono ammessi solo con impianto VMC a estrazione forzata temporizzata.',
      ],
      actionLabel: 'Vai agli Script AutoLISP',
      nextSection: 'lisp',
    },
    lisp: {
      badge: 'Standard Grafico Gialli & Rossi',
      title: 'Automazione Tavole Comparate',
      insights: [
        'Usa layer dedicati: 01_ESISTENTE (grigio/nero), 02_DEMOLIZIONI (giallo), 03_COSTRUZIONI (rosso).',
        'Genera il listato AutoLISP per automatizzare retini, quote vani e tabelle superfici in AutoCAD/BricsCAD.',
        'Esporta sempre il layout comparato ante/post in scala 1:50 o 1:100 per il deposito SUET.',
      ],
      actionLabel: 'Configura Impianti CEI 64-8',
      nextSection: 'impianti',
    },
    impianti: {
      badge: 'CEI 64-8 Cap. 37 & UNI 9182',
      title: 'Dimensionamento Impianti',
      insights: [
        'Livello 1 (Base) obbligatorio per tutte le ristrutturazioni rilevanti; Livello 2 consigliato per domotica.',
        'Prevedi almeno 2 circuiti distinti con differenziali separati (selettività orizzontale).',
        'Al termine dei lavori acquisisci Di.Co. DM 37/08 per impianto elettrico, idrico-sanitario e gas.',
      ],
      actionLabel: 'Apri Abachi & Computo',
      nextSection: 'computo',
    },
    computo: {
      badge: 'Prezzario Regionale Lazio',
      title: 'Controllo Costi & Oneri Sicurezza',
      insights: [
        'Gli oneri della sicurezza non sono soggetti a ribasso d’asta e vanno evidenziati separatamente.',
        'Verifica che le demolizioni includano il trasporto a discarica autorizzata e gli oneri di smaltimento.',
        'Esporta il computo in .xlsx per la condivisione con le imprese in fase di gara.',
      ],
      actionLabel: 'Prepara Atti SUET',
      nextSection: 'atti',
    },
    atti: {
      badge: 'Sportello Unico Edilizia (SUET)',
      title: 'Chiusura Pratica & Deposito',
      insights: [
        'Verifica il DURC in corso di validità dell’impresa esecutrice prima dell’invio telematico.',
        'Per lavori > 200 uomini-giorno o più imprese è obbligatoria la Notifica Preliminare ASL/ITL.',
        'Conserva i formulari FIR per la tracciabilità dei rifiuti speciali da demolizione (Codice CER 17).',
      ],
      actionLabel: 'Torna a Due Diligence',
      nextSection: 'due-diligence',
    },
  };
  
  export function CockpitPanel({ activeSection, onSelectSection }: CockpitPanelProps) {
    const { commessa } = useAttiva();
    const vaniList = useStore((s) => (commessa ? s.vani[commessa.id] ?? [] : []));
    const vociList = useStore((s) => (commessa ? s.voci[commessa.id] ?? [] : []));
  
    const supTotale = vaniList.reduce((acc, v) => acc + (Number(v.superficie) || 0), 0);
  
    const vaniNonConformi = vaniList.filter((v) => {
      const isPrincipale = ['soggiorno', 'camera', 'cucina', 'studio', 'pranzo'].some((k) =>
        (v.destinazione || '').toLowerCase().includes(k)
      );
      if (!isPrincipale || !v.superficie) return false;
      return (Number(v.superfFinestrata) || 0) / Number(v.superficie) < 0.125;
    }).length;
  
    const totaleLavori = vociList
      .filter((v) => !v.oneriSicurezza)
      .reduce((acc, v) => acc + (Number(v.quantita) || 0) * (Number(v.prezzoUnitario) || 0), 0);
  
    const totaleSicurezza = vociList
      .filter((v) => v.oneriSicurezza)
      .reduce((acc, v) => acc + (Number(v.quantita) || 0) * (Number(v.prezzoUnitario) || 0), 0);
  
    const totaleComplessivo = totaleLavori + totaleSicurezza;
    const costoMq = supTotale > 0 ? totaleComplessivo / supTotale : 0;
  
    const hint = SECTION_COPILOT_HINTS[activeSection] || SECTION_COPILOT_HINTS['due-diligence'];
  
    const formatEuro = (val: number) =>
      new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(val);
  
    return (
      <aside className="space-y-4 xl:sticky xl:top-16">
        {/* 1. QUADRO ECONOMICO & METRICO LIVE */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Euro className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Quadro Economico Live
              </span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              Prezzario Lazio
            </span>
          </div>
  
          <div className="p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-500">Totale Stimato (IVA escl.)</span>
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                {formatEuro(totaleComplessivo)}
              </span>
            </div>
  
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-slate-400 text-[11px]">Lavori a misura</div>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {formatEuro(totaleLavori)}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-slate-400 text-[11px]">Oneri Sicurezza</div>
                <div className="font-semibold text-amber-700 mt-0.5">
                  {formatEuro(totaleSicurezza)}
                </div>
              </div>
            </div>
  
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-slate-400" />
                Superficie ({vaniList.length} vani)
              </span>
              <span className="font-semibold text-slate-800">
                {supTotale.toFixed(1)} m²{' '}
                {costoMq > 0 && (
                  <span className="text-slate-400 font-normal">
                    ({formatEuro(costoMq)}/m²)
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
  
        {/* 2. ASSISTENTE TECNICO GENERATIVO (CONTESTUALE) */}
        <div className="bg-gradient-to-br from-sky-50/90 via-white to-indigo-50/50 rounded-xl border border-sky-200/80 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                Assistente Tecnico Generativo
              </h3>
              <p className="text-[11px] text-sky-700 font-medium">{hint.badge}</p>
            </div>
          </div>
  
          <div className="text-xs font-semibold text-slate-800">{hint.title}</div>
  
          <ul className="space-y-2">
            {hint.insights.map((tip, idx) => (
              <li
                key={idx}
                className="text-xs text-slate-600 leading-relaxed flex items-start gap-2 bg-white/85 p-2 rounded-lg border border-sky-100/80"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
  
          <button
            type="button"
            onClick={() => onSelectSection(hint.nextSection)}
            className="w-full mt-1 py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <span>{hint.actionLabel}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
  
        {/* 3. SEMAFORO CONFORMITÀ & ATTI */}
        {commessa && (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <FileCheck2 className="w-4 h-4 text-slate-500" />
              <span>Stato Conformità & Atti</span>
            </div>
  
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Titolo Abilitativo
                </span>
                <span className="font-semibold text-slate-900">
                  {commessa.tipologia || 'CILA'}
                </span>
              </div>
  
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                  Vincolo Paesaggistico
                </span>
                {commessa.vincoloSoprintendenza ? (
                  <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5" /> Soprintendenza
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Assente
                  </span>
                )}
              </div>
  
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-slate-400" />
                  Verifiche RAI (1/8)
                </span>
                {vaniNonConformi > 0 ? (
                  <span className="inline-flex items-center gap-1 font-medium text-rose-600">
                    <AlertTriangle className="w-3.5 h-3.5" /> {vaniNonConformi} da adeguare
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Conformi ({vaniList.length})
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </aside>
    );
  }