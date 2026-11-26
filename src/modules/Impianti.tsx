import { useMemo, useState } from 'react';
import { Zap, Flame, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useStore, useAttiva } from '@/lib/store';

export function Impianti() {
  const { commessa } = useAttiva();
  const vani = useStore((s) => (commessa ? s.vani?.[commessa.id] ?? [] : []));

  const [livelloCEI, setLivelloCEI] = useState<'1' | '2' | '3'>('1');
  const [pianoInduzione, setPianoInduzione] = useState<boolean>(true);
  const [pompaCalore, setPompaCalore] = useState<boolean>(true);

  const calcolo = useMemo(() => {
    const mqTotali = vani.reduce((acc, v) => acc + (Number(v.superficie) || 0), 0) || 72;
    const nBagni = vani.filter((v) => v.destinazione.toLowerCase().includes('bagno')).length || 1;
    const nCamere = vani.filter((v) => v.destinazione.toLowerCase().includes('camera')).length || 2;

    let potenzaKw = mqTotali <= 75 ? 3.0 : mqTotali <= 125 ? 4.5 : 6.0;
    if (pianoInduzione) potenzaKw += 1.5;
    if (pompaCalore) potenzaKw += 1.5;
    if (livelloCEI === '2') potenzaKw = Math.max(potenzaKw, 4.5);
    if (livelloCEI === '3') potenzaKw = Math.max(potenzaKw, 6.0);

    const puntiPreseMin = Math.max(18, Math.round(mqTotali * 0.35) + nCamere * 3);
    const puntiLuceMin = Math.max(8, vani.length > 0 ? vani.length * 2 : 10);
    const circuitiMin =
      livelloCEI === '1'
        ? mqTotali <= 50
          ? 2
          : mqTotali <= 75
            ? 3
            : 4
        : livelloCEI === '2'
          ? 5
          : 6;

    const potenzaTermicaKw = Number(((mqTotali * 3.0 * 35) / 1000).toFixed(1));
    const obbligoProgettoProfessionista = potenzaKw > 6.0 || mqTotali > 400;

    return {
      mqTotali,
      nBagni,
      potenzaKw: Number(potenzaKw.toFixed(1)),
      puntiPreseMin,
      puntiLuceMin,
      circuitiMin,
      potenzaTermicaKw,
      obbligoProgettoProfessionista,
    };
  }, [vani, livelloCEI, pianoInduzione, pompaCalore]);

  if (!commessa) {
    return <div className="p-10 text-zinc-600">Nessuna commessa attiva.</div>;
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
          5. Dimensionamento Impianti (CEI 64-8 / UNI 7129)
        </h1>
        <p className="text-xs sm:text-sm text-zinc-700 mt-0.5">
          Dotazioni minime impianto elettrico, fabbisogno termico e adempimenti DM 37/2008. Commessa:{' '}
          <strong className="text-zinc-950">{commessa.codice}</strong>
        </p>
      </header>

      {/* Parametri configurazione */}
      <section className="rounded-xl bg-white border border-zinc-300 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-zinc-950">Configurazione Impiantistica</h2>
            <p className="text-xs text-zinc-600">
              Calibrata su {calcolo.mqTotali.toFixed(1)} mq ({vani.length || 5} vani censiti)
            </p>
          </div>

          <div className="inline-flex rounded-lg bg-zinc-100 p-1 border border-zinc-300 text-xs font-mono">
            {(['1', '2', '3'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLivelloCEI(lvl)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  livelloCEI === lvl
                    ? 'bg-zinc-950 text-white font-semibold'
                    : 'text-zinc-700 hover:text-zinc-950'
                }`}
              >
                Livello {lvl} CEI
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <label className="flex items-center justify-between rounded-lg border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 cursor-pointer">
            <span className="text-xs font-semibold text-zinc-900">Piano cottura a induzione</span>
            <input
              type="checkbox"
              checked={pianoInduzione}
              onChange={(e) => setPianoInduzione(e.target.checked)}
              className="w-4 h-4 accent-zinc-950"
            />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 cursor-pointer">
            <span className="text-xs font-semibold text-zinc-900">Climatizzazione / Pompa di calore</span>
            <input
              type="checkbox"
              checked={pompaCalore}
              onChange={(e) => setPompaCalore(e.target.checked)}
              className="w-4 h-4 accent-zinc-950"
            />
          </label>
        </div>
      </section>

      {/* Schede risultati */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="rounded-xl bg-zinc-950 text-zinc-100 border border-zinc-800 p-5 space-y-3">
          <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-800">
            <Zap size={16} className="text-amber-300" />
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
              Impianto Elettrico — CEI 64-8 Cap. 37
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
              <span className="block text-[10px] font-mono uppercase text-zinc-400">
                Potenza Impegnata
              </span>
              <span className="block text-lg font-mono font-bold text-white mt-0.5">
                {calcolo.potenzaKw} kW
              </span>
            </div>
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
              <span className="block text-[10px] font-mono uppercase text-zinc-400">
                Circuiti Minimi
              </span>
              <span className="block text-lg font-mono font-bold text-white mt-0.5">
                {calcolo.circuitiMin} linee
              </span>
            </div>
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
              <span className="block text-[10px] font-mono uppercase text-zinc-400">
                Punti Prese Min.
              </span>
              <span className="block text-base font-mono font-bold text-white mt-0.5">
                ≥ {calcolo.puntiPreseMin}
              </span>
            </div>
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
              <span className="block text-[10px] font-mono uppercase text-zinc-400">
                Punti Luce Min.
              </span>
              <span className="block text-base font-mono font-bold text-white mt-0.5">
                ≥ {calcolo.puntiLuceMin}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-300 leading-relaxed">
            Prevedere almeno 2 interruttori differenziali (30 mA tipo A/F) per garantire continuità di servizio e SPD contro sovratensioni.
          </p>
        </section>

        <section className="rounded-xl bg-zinc-950 text-zinc-100 border border-zinc-800 p-5 space-y-3">
          <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-800">
            <Flame size={16} className="text-emerald-300" />
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
              Termotecnica &amp; Adempimenti DM 37/08
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
              <span className="block text-[10px] font-mono uppercase text-zinc-400">
                Fabbisogno Termico
              </span>
              <span className="block text-lg font-mono font-bold text-white mt-0.5">
                ~ {calcolo.potenzaTermicaKw} kW
              </span>
            </div>
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
              <span className="block text-[10px] font-mono uppercase text-zinc-400">
                Adduzione Gas
              </span>
              <span className="block text-sm font-mono font-bold text-white mt-1">
                {pianoInduzione && pompaCalore ? 'Gas-Free' : 'UNI 7129'}
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 text-xs">
            {calcolo.obbligoProgettoProfessionista ? (
              <div className="flex items-start gap-2 text-amber-300">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>
                  Potenza &gt; 6 kW: obbligatorio progetto firmato da professionista iscritto all&apos;Albo (DM 37/2008 art. 5).
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-emerald-300">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                <span>
                  Potenza ≤ 6 kW: progetto a cura del Responsabile Tecnico dell&apos;impresa installatrice e rilascio Di.Co.
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
            <ShieldCheck size={13} />
            <span>Verificare scarico fumi a tetto (DPR 412/93) in Città Storica T1.</span>
          </div>
        </section>
      </div>
    </div>
  );
}