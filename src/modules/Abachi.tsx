import { LayoutGrid } from 'lucide-react';
import { useStore, useAttiva, EMPTY_VANI } from '@/lib/store';

export function Abachi() {
  const { commessa } = useAttiva();
  const vani = useStore((s) => (commessa ? s.vani?.[commessa.id] ?? EMPTY_VANI : EMPTY_VANI));

  if (!commessa) {
    return <div className="p-10 text-zinc-600">Nessuna commessa attiva.</div>;
  }

  const mqTotali = vani.reduce((acc, v) => acc + (Number(v.superficie) || 0), 0);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
            3. Abachi Vani &amp; Elementi
          </h1>
          <p className="text-xs sm:text-sm text-zinc-700 mt-0.5">
            Schedatura vani, infissi e superfici di progetto. Commessa:{' '}
            <strong className="text-zinc-950">{commessa.codice}</strong>
          </p>
        </div>
      </header>

      <section className="rounded-xl bg-white border border-zinc-300 p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-2.5">
          <LayoutGrid size={15} className="text-zinc-800" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-900">
            Riepilogo Vani Censiti ({vani.length}) · {mqTotali.toFixed(2)} m²
          </h2>
        </div>

        {vani.length === 0 ? (
          <p className="text-xs text-zinc-600">
            Nessun vano censito per questa commessa. Aggiungi i vani nell&apos;Audit &amp; RAI o
            schedali qui.
          </p>
        ) : (
          <div className="divide-y divide-zinc-200 text-xs">
            {vani.map((v, idx) => (
              <div
                key={v.id ?? idx}
                className="py-2.5 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <span className="font-semibold text-zinc-950">{v.nome || `Vano ${idx + 1}`}</span>
                  {v.destinazione && (
                    <span className="ml-2 text-zinc-600">({v.destinazione})</span>
                  )}
                </div>
                <div className="font-mono text-zinc-800 tabular-nums">
                  Sup: {(Number(v.superficie) || 0).toFixed(2)} m² · H:{' '}
                  {(Number(v.altezzaMedia) || 0).toFixed(2)} m · Fin:{' '}
                  {(Number(v.superfFinestrata) || 0).toFixed(2)} m²
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}