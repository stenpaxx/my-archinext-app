import { useEffect, useMemo, useState } from 'react';
import {
  CalendarRange,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  Circle,
  PlayCircle,
  RotateCcw,
} from 'lucide-react';
import { useAttiva } from '@/lib/store';

type StatoFase = 'da-avviare' | 'in-corso' | 'completata';

interface FaseCantiere {
  id: string;
  wbs: string;
  attivita: string;
  settimane: number;
  stato: StatoFase;
}

interface CronoStorage {
  dataInizio: string;
  fasi: FaseCantiere[];
}

const FASI_INIZIALI: FaseCantiere[] = [
  {
    id: 'wbs-1',
    wbs: '01',
    attivita: 'Rilievo, verifiche RAI/PRG & deposito pratica SUET',
    settimane: 2,
    stato: 'completata',
  },
  {
    id: 'wbs-2',
    wbs: '02',
    attivita: 'Demolizioni interne, rimozioni & conferimento rifiuti (FIR)',
    settimane: 2,
    stato: 'in-corso',
  },
  {
    id: 'wbs-3',
    wbs: '03',
    attivita: 'Opere murarie / tramezzature / frazionamento & eventuali strutture',
    settimane: 3,
    stato: 'da-avviare',
  },
  {
    id: 'wbs-4',
    wbs: '04',
    attivita: 'Impianti elettrici, idrico-sanitari, VMC & climatizzazione (D.M. 37/08)',
    settimane: 3,
    stato: 'da-avviare',
  },
  {
    id: 'wbs-5',
    wbs: '05',
    attivita: 'Intonaci, massetti, pavimenti, rivestimenti & infissi',
    settimane: 3,
    stato: 'da-avviare',
  },
  {
    id: 'wbs-6',
    wbs: '06',
    attivita: 'Tinteggiature, collaudi, Di.Co., aggiornamento DOCFA & fine lavori',
    settimane: 2,
    stato: 'da-avviare',
  },
];

function loadCronoForCommessa(commessaId: string): CronoStorage {
  try {
    const raw = window.localStorage.getItem(`my-archinext-crono-${commessaId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CronoStorage>;
      if (parsed.dataInizio && Array.isArray(parsed.fasi) && parsed.fasi.length > 0) {
        return { dataInizio: parsed.dataInizio, fasi: parsed.fasi };
      }
    }
  } catch {
    // Fallback su dati iniziali
  }
  return { dataInizio: '2026-12-01', fasi: FASI_INIZIALI };
}

function addWeeks(isoDate: string, weeks: number): Date {
  const base = new Date(`${isoDate}T00:00:00`);
  const safe = Number.isNaN(base.getTime()) ? new Date() : base;
  const result = new Date(safe);
  result.setDate(result.getDate() + Math.round(weeks * 7));
  return result;
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}

export function Cronoprogramma() {
  const { commessa } = useAttiva();
  const commessaId = commessa?.id ?? 'default';

  const [dataInizio, setDataInizio] = useState<string>(
    () => loadCronoForCommessa(commessaId).dataInizio
  );
  const [fasi, setFasi] = useState<FaseCantiere[]>(() => loadCronoForCommessa(commessaId).fasi);
  const [nuovaAttivita, setNuovaAttivita] = useState('');
  const [nuoveSettimane, setNuoveSettimane] = useState(2);

  useEffect(() => {
    const loaded = loadCronoForCommessa(commessaId);
    setDataInizio(loaded.dataInizio);
    setFasi(loaded.fasi);
  }, [commessaId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `my-archinext-crono-${commessaId}`,
        JSON.stringify({ dataInizio, fasi })
      );
    } catch {
      // Ignora eventuali limiti di storage
    }
  }, [commessaId, dataInizio, fasi]);

  const calcolate = useMemo(() => {
    let cursorWeeks = 0;
    return fasi.map((fase, idx) => {
      const dur = Math.max(0.5, Number(fase.settimane) || 1);
      const startWeek = cursorWeeks;
      const endWeek = cursorWeeks + dur;
      const startDate = addWeeks(dataInizio, startWeek);
      const endDate = addWeeks(dataInizio, endWeek);
      cursorWeeks = endWeek;
      return {
        ...fase,
        wbs: String(idx + 1).padStart(2, '0'),
        dur,
        startWeek,
        endWeek,
        startDate,
        endDate,
      };
    });
  }, [fasi, dataInizio]);

  const settimaneTotali = useMemo(
    () => calcolate.reduce((acc, f) => acc + f.dur, 0),
    [calcolate]
  );

  const dataFinePrevista = useMemo(
    () => addWeeks(dataInizio, settimaneTotali),
    [dataInizio, settimaneTotali]
  );

  if (!commessa) {
    return <div className="p-10 text-zinc-600">Nessuna commessa attiva.</div>;
  }

  const aggiungiFase = (e: React.FormEvent) => {
    e.preventDefault();
    const nome = nuovaAttivita.trim();
    if (!nome) return;
    setFasi((prev) => [
      ...prev,
      {
        id: `wbs-${Date.now()}`,
        wbs: String(prev.length + 1).padStart(2, '0'),
        attivita: nome,
        settimane: Math.max(0.5, Number(nuoveSettimane) || 1),
        stato: 'da-avviare',
      },
    ]);
    setNuovaAttivita('');
    setNuoveSettimane(2);
  };

  const aggiornaFase = (id: string, patch: Partial<FaseCantiere>) => {
    setFasi((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const rimuoviFase = (id: string) => {
    setFasi((prev) => prev.filter((f) => f.id !== id));
  };

  const ripristinaStandard = () => {
    setFasi(FASI_INIZIALI);
  };

  const cicloStato = (stato: StatoFase): StatoFase => {
    if (stato === 'da-avviare') return 'in-corso';
    if (stato === 'in-corso') return 'completata';
    return 'da-avviare';
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
            5. Cronoprogramma Lavori &amp; Gantt
          </h1>
          <p className="text-xs sm:text-sm text-zinc-700 mt-0.5">
            Sequenza temporale WBS, durate in settimane e fine lavori stimata. Commessa:{' '}
            <strong className="text-zinc-950">{commessa.codice}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={ripristinaStandard}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:border-zinc-950 transition-colors"
            title="Ripristina fasi standard"
          >
            <RotateCcw size={13} />
            <span>Reset WBS</span>
          </button>
          <label className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs">
            <span className="font-semibold text-zinc-700">Avvio:</span>
            <input
              type="date"
              value={dataInizio}
              onChange={(e) => setDataInizio(e.target.value)}
              className="font-mono text-zinc-950 focus:outline-none"
            />
          </label>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-white border border-zinc-300 p-3.5">
          <span className="block text-[10px] font-mono uppercase text-zinc-500">
            Durata Complessiva
          </span>
          <span className="block text-lg font-mono font-bold text-zinc-950 mt-0.5 tabular-nums">
            {settimaneTotali.toFixed(1)} sett. ({Math.round(settimaneTotali * 7)} gg)
          </span>
        </div>

        <div className="rounded-xl bg-white border border-zinc-300 p-3.5">
          <span className="block text-[10px] font-mono uppercase text-zinc-500">
            Fasi Pianificate
          </span>
          <span className="block text-lg font-mono font-bold text-zinc-950 mt-0.5 tabular-nums">
            {calcolate.length} attività WBS
          </span>
        </div>

        <div className="rounded-xl bg-white border border-zinc-300 p-3.5">
          <span className="block text-[10px] font-mono uppercase text-zinc-500">
            Fine Lavori Stimata
          </span>
          <span className="block text-lg font-mono font-bold text-zinc-950 mt-0.5 tabular-nums">
            {dataFinePrevista.toLocaleDateString('it-IT')}
          </span>
        </div>
      </section>

      <section className="rounded-xl bg-white border border-zinc-300 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-200 pb-2.5">
          <div className="flex items-center gap-2">
            <CalendarRange size={15} className="text-zinc-800" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-900">
              Articolazione Fasi &amp; Diagramma Gantt
            </h2>
          </div>
          <span className="text-[11px] font-mono text-zinc-600">
            Clicca sullo stato per avanzare
          </span>
        </div>

        <div className="divide-y divide-zinc-200">
          {calcolate.map((f) => {
            const leftPct = settimaneTotali > 0 ? (f.startWeek / settimaneTotali) * 100 : 0;
            const widthPct = settimaneTotali > 0 ? (f.dur / settimaneTotali) * 100 : 0;

            return (
              <div
                key={f.id}
                className="py-3 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center text-xs"
              >
                <div className="lg:col-span-5 flex items-start gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => aggiornaFase(f.id, { stato: cicloStato(f.stato) })}
                    className="mt-0.5 shrink-0"
                    title="Cambia stato fase"
                  >
                    {f.stato === 'completata' ? (
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    ) : f.stato === 'in-corso' ? (
                      <PlayCircle size={16} className="text-amber-600" />
                    ) : (
                      <Circle size={16} className="text-zinc-400" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-300 text-zinc-800">
                        WBS {f.wbs}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                        {formatShortDate(f.startDate)} → {formatShortDate(f.endDate)}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={f.attivita}
                      onChange={(e) => aggiornaFase(f.id, { attivita: e.target.value })}
                      className="mt-1 w-full bg-transparent font-medium text-zinc-950 focus:bg-zinc-50 focus:outline-none rounded px-1 -mx-1"
                    />
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="h-6 w-full rounded-md bg-zinc-100 border border-zinc-200 relative overflow-hidden">
                    <div
                      style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 3)}%` }}
                      className={`h-full rounded-sm flex items-center justify-center text-[10px] font-mono font-bold text-white transition-all duration-200 ${
                        f.stato === 'completata'
                          ? 'bg-emerald-700'
                          : f.stato === 'in-corso'
                            ? 'bg-zinc-900'
                            : 'bg-zinc-600'
                      }`}
                    >
                      {f.dur}s
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 flex items-center justify-end gap-2">
                  <label className="inline-flex items-center gap-1 rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-[11px]">
                    <Clock size={11} className="text-zinc-500" />
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="52"
                      value={f.settimane}
                      onChange={(e) =>
                        aggiornaFase(f.id, { settimane: parseFloat(e.target.value) || 0.5 })
                      }
                      className="w-11 text-right text-zinc-950 focus:outline-none tabular-nums"
                    />
                    <span className="text-zinc-500">sett</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => rimuoviFase(f.id)}
                    title="Rimuovi fase"
                    className="p-1.5 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <form
          onSubmit={aggiungiFase}
          className="pt-3 border-t border-zinc-200 flex flex-col sm:flex-row gap-2 text-xs"
        >
          <input
            type="text"
            value={nuovaAttivita}
            onChange={(e) => setNuovaAttivita(e.target.value)}
            placeholder="Nuova fase o lavorazione di cantiere..."
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
          />
          <label className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 font-mono">
            <span className="text-zinc-600">Sett.</span>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="52"
              value={nuoveSettimane}
              onChange={(e) => setNuoveSettimane(parseFloat(e.target.value) || 1)}
              className="w-14 text-right text-zinc-950 focus:outline-none tabular-nums"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 py-1.5 font-semibold text-white hover:bg-zinc-800 transition-colors"
          >
            <Plus size={14} />
            <span>Aggiungi fase</span>
          </button>
        </form>
      </section>
    </div>
  );
}