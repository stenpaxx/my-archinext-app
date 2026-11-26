import { useMemo, useState } from 'react';
import {
  Calculator,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Compass,
  Trees,
} from 'lucide-react';
import { useStore, EMPTY_VANI, EMPTY_VOCI } from '@/lib/store';
import type { SectionId } from '@/components/Sidebar';

const EMPTY_STEPS: boolean[] = [false, false, false, false, false, false, false];

type AgentMode = 'generale' | 'urbanistica' | 'ambiente';

interface CockpitPanelProps {
  activeSection: SectionId;
  onSelectSection: (s: SectionId) => void;
}

export function CockpitPanel({ activeSection, onSelectSection }: CockpitPanelProps) {
  const attivaId = useStore((s) => s.attivaId);
  const commessa = useStore((s) => s.commesse.find((c) => c.id === s.attivaId));
  const vani = useStore((s) => (s.attivaId ? s.vani[s.attivaId] ?? EMPTY_VANI : EMPTY_VANI));
  const voci = useStore((s) => (s.attivaId ? s.voci[s.attivaId] ?? EMPTY_VOCI : EMPTY_VOCI));
  const steps = useStore((s) => (attivaId ? s.steps[attivaId] ?? EMPTY_STEPS : EMPTY_STEPS));

  const [agentMode, setAgentMode] = useState<AgentMode>('generale');

  const stats = useMemo(() => {
    const mqTotali = vani.reduce((acc, v) => acc + (Number(v.superficie) || 0), 0);
    const mqEffettivi = mqTotali > 0 ? mqTotali : 72.9;

    const lavori = voci
      .filter((v) => !v.oneriSicurezza)
      .reduce((acc, v) => acc + (Number(v.quantita) || 0) * (Number(v.prezzoUnitario) || 0), 0);

    const oneri = voci
      .filter((v) => v.oneriSicurezza)
      .reduce((acc, v) => acc + (Number(v.quantita) || 0) * (Number(v.prezzoUnitario) || 0), 0);

    const totaleLavori = lavori > 0 ? lavori : 22321;
    const totaleOneri = oneri > 0 ? oneri : 13800;
    const totaleStimato = totaleLavori + totaleOneri;
    const incidenzaMq = mqEffettivi > 0 ? totaleStimato / mqEffettivi : 0;

    const raiCritici = vani.filter((v) => {
      const sup = Number(v.superficie) || 0;
      const fin = Number(v.superfFinestrata) || 0;
      if (sup <= 0) return false;
      return fin / sup < 1 / 8 && !v.vmc;
    }).length;

    return {
      mqEffettivi,
      nVani: vani.length > 0 ? vani.length : 7,
      totaleLavori,
      totaleOneri,
      totaleStimato,
      incidenzaMq,
      raiCritici,
      stepCompletati: steps.filter(Boolean).length,
    };
  }, [vani, voci, steps]);

  const formatEuro = (val: number) =>
    new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(val);

  const titolo = commessa?.titolo ?? 'Commessa Attiva';
  const tipologia = commessa?.tipologia ?? 'Ristrutturazione SCIA';
  const tessuto = commessa?.tessutoPRG ?? 'T1';
  const haVincolo = Boolean(commessa?.vincoloSoprintendenza);
  const haCartaQualita = Boolean(commessa?.cartaQualita);

  const agentNotes = useMemo(() => {
    if (agentMode === 'urbanistica') {
      return [
        `Tessuto ${tessuto} (${commessa?.municipio ?? 'Roma Capitale'}): verifica ammissibilità, indici e disciplina attuativa per ${tipologia} o Permesso di Costruire / nuova edificazione.`,
        'Controlla distacchi, altezze, sagoma/inviluppo, destinazioni d’uso e dotazione di standard/parcheggi pertinenziali.',
        haVincolo
          ? 'Vincolo D.Lgs 42/2004 attivo: valuta coerenza paesaggistica/storica prima del deposito SUET.'
          : 'Verifica eventuali ambiti di pianificazione esecutiva o strumenti attuativi sul lotto.',
      ];
    }

    if (agentMode === 'ambiente') {
      return [
        'Invarianza idraulica e permeabilità dei suoli (DAC 90/2026 & REC Roma): verifica superfici drenanti e laminazione meteorica per nuova edificazione o ampliamento.',
        haCartaQualita
          ? 'Carta per la Qualità attiva: integra soluzioni su materiali, verde e microclima urbano.'
          : 'Valuta screening ambientale/paesaggistico, emissioni acustiche (L. 447/1995) e gestione terre/rocce o rifiuti di cantiere.',
        'Controlla requisiti energetici, ombreggiamento e comfort termo-igrometrico in relazione all’intervento.',
      ];
    }

    return [
      `In ${tessuto} (${titolo}) verifica sempre la consistenza d’impianto e la coerenza catastale/edilizia.`,
      haVincolo
        ? 'Con vincolo D.Lgs 42/2004, le modifiche esterne o prospettiche richiedono parere/autorizzazione.'
        : 'Controlla i titoli abilitativi (CILA / SCIA / PdC) e l’allineamento con le NTA del PRG.',
      'Allinea abachi vani, verifiche RAI e voci del Prezzario Regionale del Lazio prima del deposito.',
    ];
  }, [agentMode, tessuto, commessa?.municipio, tipologia, haVincolo, haCartaQualita, titolo]);

  const nextSectionMap: Record<SectionId, { id: SectionId; label: string }> = {
    'due-diligence': { id: 'rai', label: 'Passa all’Audit RAI' },
    rai: { id: 'lisp', label: 'Genera script AutoLISP' },
    lisp: { id: 'impianti', label: 'Verifica Impianti' },
    impianti: { id: 'computo', label: 'Apri Computo Lazio' },
    computo: { id: 'atti', label: 'Prepara Atti SUET' },
    atti: { id: 'due-diligence', label: 'Torna a Due Diligence' },
  };

  const nextStep = nextSectionMap[activeSection];

  return (
    <div className="space-y-4">
      {/* Quadro economico live su sfondo nero con riquadri grigio chiaro */}
      <section className="rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Calculator size={15} className="text-zinc-200" />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
              Quadro Economico Live
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 border border-zinc-600/80 text-zinc-100">
            Prezzario Lazio
          </span>
        </div>

        <div className="pt-3.5 flex items-baseline justify-between gap-2">
          <span className="text-xs text-zinc-300">Totale Stimato (IVA escl.)</span>
          <span className="text-2xl font-mono font-bold text-white tabular-nums">
            {formatEuro(stats.totaleStimato)}
          </span>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <div className="rounded-lg bg-zinc-800 border border-zinc-600/80 p-2.5">
            <span className="block text-[10px] font-mono uppercase text-zinc-300">Lavori a misura</span>
            <span className="block text-sm font-mono font-semibold text-white mt-0.5 tabular-nums">
              {formatEuro(stats.totaleLavori)}
            </span>
          </div>
          <div className="rounded-lg bg-zinc-800 border border-zinc-600/80 p-2.5">
            <span className="block text-[10px] font-mono uppercase text-zinc-300">Oneri Sicurezza</span>
            <span className="block text-sm font-mono font-semibold text-amber-300 mt-0.5 tabular-nums">
              {formatEuro(stats.totaleOneri)}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-200">
          <span>Superficie ({stats.nVani} vani)</span>
          <span className="text-white tabular-nums">
            {stats.mqEffettivi.toFixed(1)} m² ({formatEuro(stats.incidenzaMq)}/m²)
          </span>
        </div>
      </section>

      {/* Assistente tecnico su sfondo nero con riquadri grigio chiaro */}
      <section className="rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 p-4 sm:p-5 shadow-sm">
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-zinc-100 shrink-0" />
            <div>
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
                Assistente Tecnico
              </h2>
              <p className="text-[11px] font-mono text-zinc-400">
                PRG Roma · REC · DAC 90/2026
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-zinc-800 p-1 border border-zinc-600/80 text-[11px] font-mono">
          <button
            type="button"
            onClick={() => setAgentMode('generale')}
            className={`py-1.5 px-2 rounded-md transition-colors truncate ${
              agentMode === 'generale'
                ? 'bg-white text-zinc-950 font-semibold'
                : 'text-zinc-200 hover:text-white'
            }`}
          >
            Generale
          </button>
          <button
            type="button"
            onClick={() => setAgentMode('urbanistica')}
            className={`py-1.5 px-2 rounded-md inline-flex items-center justify-center gap-1 transition-colors truncate ${
              agentMode === 'urbanistica'
                ? 'bg-white text-zinc-950 font-semibold'
                : 'text-zinc-200 hover:text-white'
            }`}
          >
            <Compass size={11} />
            <span>Urbanistica</span>
          </button>
          <button
            type="button"
            onClick={() => setAgentMode('ambiente')}
            className={`py-1.5 px-2 rounded-md inline-flex items-center justify-center gap-1 transition-colors truncate ${
              agentMode === 'ambiente'
                ? 'bg-white text-zinc-950 font-semibold'
                : 'text-zinc-200 hover:text-white'
            }`}
          >
            <Trees size={11} />
            <span>Ambiente</span>
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {agentNotes.map((nota, idx) => (
            <div
              key={idx}
              className="rounded-lg bg-zinc-800 border border-zinc-600/80 px-3 py-2 text-xs text-zinc-100 leading-relaxed"
            >
              {nota}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onSelectSection(nextStep.id)}
          className="mt-3.5 w-full py-2 px-3 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
        >
          <span>{nextStep.label}</span>
          <ArrowUpRight size={14} />
        </button>
      </section>

      {/* Stato conformità e atti su sfondo nero con campi grigio chiaro */}
      <section className="rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
          <ShieldCheck size={15} className="text-zinc-200" />
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
            Stato Conformità &amp; Atti
          </h2>
        </div>

        <div className="mt-3 space-y-2 text-xs">
          <div className="rounded-lg bg-zinc-800 border border-zinc-700/90 px-3 py-2 flex items-center justify-between gap-2">
            <span className="text-zinc-300">Titolo Abilitativo</span>
            <span className="font-mono text-white text-right">{tipologia}</span>
          </div>

          <div className="rounded-lg bg-zinc-800 border border-zinc-700/90 px-3 py-2 flex items-center justify-between gap-2">
            <span className="text-zinc-300">Vincolo Paesaggistico</span>
            {haVincolo ? (
              <span className="inline-flex items-center gap-1 font-mono text-amber-300">
                <AlertTriangle size={12} /> Soprintendenza
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-mono text-emerald-300">
                <CheckCircle2 size={12} /> Ordinario
              </span>
            )}
          </div>

          <div className="rounded-lg bg-zinc-800 border border-zinc-700/90 px-3 py-2 flex items-center justify-between gap-2">
            <span className="text-zinc-300">Verifiche RAI</span>
            <span
              className={`inline-flex items-center gap-1 font-mono ${
                stats.raiCritici > 0 ? 'text-amber-300' : 'text-emerald-300'
              }`}
            >
              {stats.raiCritici > 0 ? (
                <>
                  <AlertTriangle size={12} /> {stats.raiCritici} da adeguare
                </>
              ) : (
                <>
                  <CheckCircle2 size={12} /> Conforme
                </>
              )}
            </span>
          </div>

          <div className="rounded-lg bg-zinc-800 border border-zinc-700/90 px-3 py-2 flex items-center justify-between gap-2">
            <span className="text-zinc-300">Iter 7 Step</span>
            <span className="font-mono text-white tabular-nums">{stats.stepCompletati}/7</span>
          </div>
        </div>
      </section>
    </div>
  );
}