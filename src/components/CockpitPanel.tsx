import { useMemo, useState } from 'react';
import {
  Calculator,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Compass,
  Trees,
  FileSearch,
  ExternalLink,
} from 'lucide-react';
import { useStore, EMPTY_VANI, EMPTY_VOCI } from '@/lib/store';
import type { SectionId } from '@/components/Sidebar';

const EMPTY_STEPS: boolean[] = [false, false, false, false, false, false];

type AgentMode = 'generale' | 'urbanistica' | 'ambiente';

interface CockpitPanelProps {
  activeSection: SectionId;
  onSelectSection: (s: SectionId) => void;
}

export function CockpitPanel({ activeSection, onSelectSection }: CockpitPanelProps) {
  const attivaId = useStore((s) => s.attivaId);
  const commessa = useStore((s) => s.commesse.find((c) => c.id === s.attivaId));
  const vani = useStore((s) => (s.attivaId ? s.vani?.[s.attivaId] ?? EMPTY_VANI : EMPTY_VANI));
  const voci = useStore((s) => (s.attivaId ? s.voci?.[s.attivaId] ?? EMPTY_VOCI : EMPTY_VOCI));
  const steps = useStore((s) => (attivaId ? s.steps?.[attivaId] ?? EMPTY_STEPS : EMPTY_STEPS));

  const [agentMode, setAgentMode] = useState<AgentMode>('generale');

  const stats = useMemo(() => {
    const mqAudit = vani.reduce((acc, v) => acc + (Number(v.superficie) || 0), 0);
    const mqEffettivi = mqAudit > 0 ? mqAudit : 72.0;

    const haVociComputo = voci.length > 0;
    const lavoriComputo = voci
      .filter((v) => !v.oneriSicurezza)
      .reduce((acc, v) => acc + (Number(v.quantita) || 0) * (Number(v.prezzoUnitario) || 0), 0);
    const oneriComputo = voci
      .filter((v) => Boolean(v.oneriSicurezza))
      .reduce((acc, v) => acc + (Number(v.quantita) || 0) * (Number(v.prezzoUnitario) || 0), 0);

    const totaleLavori = haVociComputo ? lavoriComputo : mqAudit > 0 ? mqAudit * 280 : 0;
    const totaleOneri = haVociComputo ? oneriComputo : mqAudit > 0 ? mqAudit * 25 : 0;
    const totaleStimato = totaleLavori + totaleOneri;
    const incidenzaMq = mqEffettivi > 0 ? totaleStimato / mqEffettivi : 0;

    const raiCritici = vani.filter((v) => {
      const sup = Number(v.superficie) || 0;
      const fin = Number(v.superfFinestrata) || 0;
      if (sup <= 0) return false;
      return fin / sup < 1 / 8 && !v.vmc;
    }).length;

    const stepCompletati = (steps ?? []).slice(0, 6).filter(Boolean).length;
    const haDatiCatastali = Boolean(
      commessa?.foglio?.trim() || commessa?.particella?.trim() || commessa?.subalterno?.trim()
    );

    return {
      mqEffettivi,
      nVani: vani.length,
      totaleLavori,
      totaleOneri,
      totaleStimato,
      incidenzaMq,
      raiCritici,
      stepCompletati,
      stimaDaAudit: !haVociComputo && mqAudit > 0,
      haDatiCatastali,
    };
  }, [vani, voci, steps, commessa]);

  const formatEuro = (val: number) =>
    new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(val);

  const titolo = commessa?.titolo ?? 'Commessa Attiva';
  const tipologia = commessa?.tipologia ?? 'Manutenzione Straordinaria CILA';
  const tessuto = commessa?.tessutoPRG ?? 'T1';
  const haVincolo = Boolean(commessa?.vincoloSoprintendenza);
  const haCartaQualita = Boolean(commessa?.cartaQualita);
  const indirizzo = commessa?.indirizzo ?? 'Via del Boschetto, 72, 00184 Roma RM';
  const formapsUrl = `https://www.formaps.it/?q=${encodeURIComponent(indirizzo)}`;

  const agentNotes = useMemo(() => {
    const combinato = `${tipologia} ${titolo}`.toLowerCase();
    const isFrazionamento = combinato.includes('frazionamento');
    const isCilaOrLibera =
      !isFrazionamento &&
      (tipologia.includes('CILA') || tipologia.includes('Libera'));
    const isScia = !isFrazionamento && tipologia.includes('SCIA');
    const isEdificazione =
      !isFrazionamento &&
      (tipologia.includes('Permesso di Costruire') ||
        tipologia.includes('Nuova Edificazione'));

    if (agentMode === 'urbanistica') {
      const notaTitolo = isFrazionamento
        ? `Procedimento ${tipologia}: verifica ammissibilità del frazionamento nel tessuto ${tessuto}, autonomia funzionale/impiantistica delle unità risultanti e requisiti igienico-sanitari/monetizzazione.`
        : isEdificazione
          ? `Procedimento ${tipologia}: riscontra indici urbanistici, SUL/volumi, distacchi e contributo di costruzione nel tessuto ${tessuto} (${commessa?.municipio ?? 'Roma Capitale'}).`
          : isScia
            ? `Procedimento ${tipologia}: verifica coerenza con le NTA del tessuto ${tessuto}, eventuale incidenza su sagoma/prospetti/destinazioni d'uso e profili strutturali.`
            : `Procedimento ${tipologia}: verifica che le opere interne restino nel perimetro consentito nel tessuto ${tessuto} senza alterare parti strutturali o prospetti.`;

      return [
        notaTitolo,
        `Controlla stato legittimo (art. 9-bis D.P.R. 380/2001), allineamento catastale (Fg./Part./Sub.) e aggiornamento DOCFA a fine lavori (L. 122/2010).`,
        haVincolo
          ? 'Vincolo D.Lgs 42/2004 attivo: verifica autorizzazione/parere Soprintendenza e prescrizioni di tutela collegate al titolo.'
          : 'Verifica eventuali ambiti di pianificazione esecutiva, vincoli sovraordinati o prescrizioni del municipio.',
      ];
    }

    if (agentMode === 'ambiente') {
      const notaAmbienteTitolo =
        isEdificazione || isFrazionamento
          ? `Ambiente & ${tipologia}: cura invarianza idraulica, permeabilità dei suoli (DAC 90/2026 & REC Roma), dotazioni impiantistiche/energetiche e gestione rifiuti (D.Lgs. 152/2006).`
          : `Ambiente & ${tipologia}: verifica RAI (>= 1/8) o VMC per locali/bagni ciechi, requisiti termo-igrometrici e conferimento rifiuti di cantiere con FIR (D.Lgs. 152/2006).`;

      return [
        notaAmbienteTitolo,
        haCartaQualita
          ? 'Carta per la Qualità attiva: riscontra coerenza di materiali, infissi, verde/spazi aperti e permeabilità con le prescrizioni del PRG.'
          : 'Verifica in Due Diligence vincoli ambientali, tutela acustica e sicurezza di cantiere (D.Lgs. 81/2008).',
        isCilaOrLibera
          ? 'In regime CILA/Edilizia Libera cura soprattutto ventilazione/VMC, impianti D.M. 37/08 e tracciabilità rifiuti inerti.'
          : 'Allinea verifiche ambientali, abachi vani e voci del Prezzario Regionale del Lazio nella relazione SUET.',
      ];
    }

    const notaGeneraleTitolo = isFrazionamento
      ? `Titolo ${tipologia} su "${titolo}": allinea unità risultanti, verifiche RAI/VMC per singola U.I.U., catasto e bozza SUET.`
      : isEdificazione
        ? `Titolo ${tipologia} su "${titolo}": coordina parametri urbanistici, contributo di costruzione, invarianza idraulica e quadro economico.`
        : isScia
          ? `Titolo ${tipologia} su "${titolo}": riscontra elaborati grafici, profili strutturali/prospettici, stato legittimo e tessuto ${tessuto}.`
          : `Titolo ${tipologia} su "${titolo}": riscontra visura/planimetria catastale, assenza parti strutturali e tessuto ${tessuto}.`;

    return [
      notaGeneraleTitolo,
      haVincolo
        ? `Con vincolo D.Lgs 42/2004 e ${tipologia}, verifica sempre atti/pareri della Soprintendenza prima dell'avvio lavori.`
        : `Controlla coerenza tra stato legittimo, ${tipologia} e NTA del PRG.`,
      'Allinea dati di Due Diligence, abachi vani, verifiche RAI e voci del Prezzario Regionale del Lazio prima del deposito.',
    ];
  }, [agentMode, tipologia, titolo, tessuto, commessa?.municipio, haVincolo, haCartaQualita]);

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Calculator size={15} className="text-zinc-200" />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
              Quadro Economico Live
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 border border-zinc-600/80 text-zinc-100">
            {stats.stimaDaAudit ? 'Stima da Audit mq' : 'Prezzario Lazio'}
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
            <span className="block text-[10px] font-mono uppercase text-zinc-300">
              Lavori a misura
            </span>
            <span className="block text-sm font-mono font-semibold text-white mt-0.5 tabular-nums">
              {formatEuro(stats.totaleLavori)}
            </span>
          </div>
          <div className="rounded-lg bg-zinc-800 border border-zinc-600/80 p-2.5">
            <span className="block text-[10px] font-mono uppercase text-zinc-300">
              Oneri Sicurezza
            </span>
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

      <section className="rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 p-4 sm:p-5 shadow-sm">
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-zinc-100 shrink-0" />
            <div>
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
                Assistente Tecnico
              </h2>
              <p className="text-[11px] font-mono text-zinc-400">
                {tipologia} · PRG Roma · REC · DAC 90/2026
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
      </section>

      <section className="rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-zinc-200" />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
              Due Diligence, Conformità &amp; Atti
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onSelectSection('due-diligence')}
            className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
              activeSection === 'due-diligence'
                ? 'bg-white text-zinc-950 border-white font-semibold'
                : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:text-white'
            }`}
          >
            <FileSearch size={10} />
            <span>Scheda DD</span>
          </button>
        </div>

        <div className="mt-3 space-y-2 text-xs">
          <div className="rounded-lg bg-zinc-800 border border-zinc-700/90 px-3 py-2 flex items-center justify-between gap-2">
            <span className="text-zinc-300">Catasto &amp; PRG</span>
            <span className="font-mono text-white text-right">
              {tessuto} · {stats.haDatiCatastali ? 'Dati censiti' : 'Da completare'}
            </span>
          </div>

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
            <span className="text-zinc-300">Iter 6 Step</span>
            <span className="font-mono text-white tabular-nums">{stats.stepCompletati}/6</span>
          </div>

          <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span className="truncate">{indirizzo}</span>
            <a
              href={formapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-zinc-200 hover:text-white shrink-0 ml-2"
            >
              <span>Formaps</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}