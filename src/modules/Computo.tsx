import { useMemo, useState } from 'react';
import { Plus, Trash2, Calculator, Download, Sparkles } from 'lucide-react';
import { useStore, useAttiva, type VoceComputo } from '@/lib/store';

const fmtEuro = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

const num = (v: string) => (v === '' ? 0 : Math.max(0, parseFloat(v) || 0));

const cellInput =
  'w-full bg-transparent px-2 py-1.5 text-[13px] text-zinc-900 focus:outline-none focus:bg-zinc-100 focus:ring-1 focus:ring-zinc-950 rounded transition-colors';

const VOCI_LAZIO_PRESET: Array<Omit<VoceComputo, 'id'>> = [
  {
    codice: 'A 01.01.010.a',
    descrizione: 'Demolizione di tramezzi in laterizio forato spessore fino a 12 cm, compreso carico e trasporto a discarica autorizzata',
    categoria: 'Demolizioni e Rimozioni',
    unitaMisura: 'mq',
    quantita: 28.0,
    prezzoUnitario: 24.5,
    oneriSicurezza: false,
  },
  {
    codice: 'A 01.02.015.b',
    descrizione: 'Rimozione di pavimenti in ceramica, marmette o parquet, compreso sottostante massetto di allettamento fino a 5 cm',
    categoria: 'Demolizioni e Rimozioni',
    unitaMisura: 'mq',
    quantita: 72.0,
    prezzoUnitario: 19.8,
    oneriSicurezza: false,
  },
  {
    codice: 'A 04.01.020.c',
    descrizione: 'Muratura di tamponamento o tramezzatura in laterizio forato spessore 10 cm legata con malta bastarda',
    categoria: 'Murature e Divisori',
    unitaMisura: 'mq',
    quantita: 32.0,
    prezzoUnitario: 46.2,
    oneriSicurezza: false,
  },
  {
    codice: 'A 12.01.005.a',
    descrizione: 'Fornitura e posa in opera di pavimentazione in gres porcellanato rettificato posato a colla, escluso massetto',
    categoria: 'Pavimenti e Rivestimenti',
    unitaMisura: 'mq',
    quantita: 72.0,
    prezzoUnitario: 68.0,
    oneriSicurezza: false,
  },
  {
    codice: 'E 01.01.010.a',
    descrizione: 'Rifacimento completo impianto elettrico sottotraccia per unità abitativa (CEI 64-8 Livello 1), punti luce e prese',
    categoria: 'Impianti Elettrici e Speciali',
    unitaMisura: 'p.to',
    quantita: 45,
    prezzoUnitario: 65.0,
    oneriSicurezza: false,
  },
  {
    codice: 'I 01.02.008.a',
    descrizione: 'Impianto idrico-sanitario per bagno completo con tubazioni multistrato coibentate, scarichi in PP e collettori',
    categoria: 'Impianti Idrico-Termici',
    unitaMisura: 'cad',
    quantita: 2,
    prezzoUnitario: 1850.0,
    oneriSicurezza: false,
  },
  {
    codice: 'S 01.01.001.a',
    descrizione: 'Oneri per la sicurezza aziendali e apprestamenti di cantiere D.Lgs 81/2008 (non soggetti a ribasso)',
    categoria: 'Oneri Sicurezza',
    unitaMisura: 'a corpo',
    quantita: 1,
    prezzoUnitario: 2450.0,
    oneriSicurezza: true,
  },
];

export function Computo() {
  const { commessa } = useAttiva();
  const voci = useStore((s) => (commessa ? s.voci?.[commessa.id] ?? [] : []));
  const vani = useStore((s) => (commessa ? s.vani?.[commessa.id] ?? [] : []));
  const aggiungiVoce = useStore((s) => s.aggiungiVoce);
  const aggiornaVoce = useStore((s) => s.aggiornaVoce);
  const eliminaVoce = useStore((s) => s.eliminaVoce);
  const setVoci = useStore((s) => s.setVoci);

  const [filtroCategoria, setFiltroCategoria] = useState<string>('Tutte');

  const totali = useMemo(() => {
    const lavori = voci
      .filter((v) => !v.oneriSicurezza)
      .reduce((acc, v) => acc + (Number(v.quantita) || 0) * (Number(v.prezzoUnitario) || 0), 0);
    const oneri = voci
      .filter((v) => Boolean(v.oneriSicurezza))
      .reduce((acc, v) => acc + (Number(v.quantita) || 0) * (Number(v.prezzoUnitario) || 0), 0);
    const mqTotali = vani.reduce((acc, v) => acc + (Number(v.superficie) || 0), 0) || 72;
    const totale = lavori + oneri;
    return {
      lavori,
      oneri,
      totale,
      incidenzaMq: mqTotali > 0 ? totale / mqTotali : 0,
    };
  }, [voci, vani]);

  if (!commessa) {
    return <div className="p-10 text-zinc-600">Nessuna commessa attiva.</div>;
  }

  const caricaPrezzarioBase = () => {
    const nuove = VOCI_LAZIO_PRESET.map((item, idx) => ({
      ...item,
      id: `lazio-${Date.now()}-${idx}`,
      importo: (item.quantita ?? 0) * (item.prezzoUnitario ?? 0),
    }));
    setVoci(commessa.id, nuove);
  };

  const esportaCSV = () => {
    const intestazione = ['Codice Prezzario', 'Categoria', 'Descrizione', 'U.M.', 'Quantità', 'Prezzo Unitario', 'Importo', 'Oneri Sicurezza'];
    const righe = voci.map((v) => {
      const q = Number(v.quantita) || 0;
      const p = Number(v.prezzoUnitario) || 0;
      return [
        `"${(v.codice ?? '').replace(/"/g, '""')}"`,
        `"${(v.categoria ?? '').replace(/"/g, '""')}"`,
        `"${(v.descrizione ?? '').replace(/"/g, '""')}"`,
        `"${v.unitaMisura ?? 'mq'}"`,
        q.toFixed(2).replace('.', ','),
        p.toFixed(2).replace('.', ','),
        (q * p).toFixed(2).replace('.', ','),
        v.oneriSicurezza ? 'SI' : 'NO',
      ].join(';');
    });
    const csv = [intestazione.join(';'), ...righe].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Computo_Lazio_${commessa.codice}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categorie = ['Tutte', ...Array.from(new Set(voci.map((v) => v.categoria || 'Opere edili')))];
  const vociFiltrate =
    filtroCategoria === 'Tutte'
      ? voci
      : voci.filter((v) => (v.categoria || 'Opere edili') === filtroCategoria);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
            6. Abachi e Computo Metrico Estimativo
          </h1>
          <p className="text-xs sm:text-sm text-zinc-700 mt-0.5">
            Tariffa dei Prezzi Regione Lazio · Commessa{' '}
            <strong className="text-zinc-950">{commessa.codice}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={caricaPrezzarioBase}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:border-zinc-950 transition-colors"
          >
            <Sparkles size={13} />
            <span>Popola voci tipo Lazio</span>
          </button>
          <button
            type="button"
            onClick={esportaCSV}
            disabled={voci.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors"
          >
            <Download size={13} />
            <span>Esporta CSV</span>
          </button>
        </div>
      </header>

      {/* Riepilogo sintetico */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-zinc-950 text-white border border-zinc-800 p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            Lavori a Misura
          </span>
          <p className="text-xl font-mono font-bold mt-1 tabular-nums">{fmtEuro(totali.lavori)}</p>
        </div>
        <div className="rounded-xl bg-zinc-950 text-white border border-zinc-800 p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            Oneri Sicurezza (D.Lgs 81/08)
          </span>
          <p className="text-xl font-mono font-bold text-amber-300 mt-1 tabular-nums">
            {fmtEuro(totali.oneri)}
          </p>
        </div>
        <div className="rounded-xl bg-zinc-950 text-white border border-zinc-800 p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            Totale Computo (IVA escl.)
          </span>
          <p className="text-xl font-mono font-bold text-emerald-300 mt-1 tabular-nums">
            {fmtEuro(totali.totale)}
          </p>
          <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
            Incidenza: {fmtEuro(totali.incidenzaMq)}/mq
          </p>
        </div>
      </div>

      {/* Filtri categoria */}
      {voci.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {categorie.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFiltroCategoria(cat)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                filtroCategoria === cat
                  ? 'bg-zinc-950 text-white border-zinc-950'
                  : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-950'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Tabella editabile */}
      <div className="bg-white rounded-xl border border-zinc-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-zinc-950 text-zinc-200 text-[11px] font-mono uppercase tracking-wider">
                <th className="text-left font-medium px-3 py-2.5 w-32">Codice</th>
                <th className="text-left font-medium px-3 py-2.5 min-w-[240px]">Descrizione Lavorazione</th>
                <th className="text-center font-medium px-3 py-2.5 w-20">U.M.</th>
                <th className="text-right font-medium px-3 py-2.5 w-24">Quantità</th>
                <th className="text-right font-medium px-3 py-2.5 w-28">Prezzo €</th>
                <th className="text-right font-medium px-3 py-2.5 w-32">Importo €</th>
                <th className="text-center font-medium px-3 py-2.5 w-20">Sic.</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {vociFiltrate.map((voce) => {
                const q = Number(voce.quantita) || 0;
                const p = Number(voce.prezzoUnitario) || 0;
                const imp = q * p;
                return (
                  <tr key={voce.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-1 py-0.5">
                      <input
                        className={`${cellInput} font-mono text-xs`}
                        value={voce.codice ?? ''}
                        placeholder="A 01.01..."
                        onChange={(e) => aggiornaVoce(commessa.id, voce.id, { codice: e.target.value })}
                      />
                    </td>
                    <td className="px-1 py-0.5">
                      <input
                        className={cellInput}
                        value={voce.descrizione}
                        placeholder="Descrizione voce di computo..."
                        onChange={(e) =>
                          aggiornaVoce(commessa.id, voce.id, { descrizione: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-1 py-0.5">
                      <input
                        className={`${cellInput} text-center font-mono text-xs`}
                        value={voce.unitaMisura ?? 'mq'}
                        onChange={(e) =>
                          aggiornaVoce(commessa.id, voce.id, { unitaMisura: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-1 py-0.5">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className={`${cellInput} text-right tabular-nums`}
                        value={voce.quantita ?? ''}
                        onChange={(e) =>
                          aggiornaVoce(commessa.id, voce.id, { quantita: num(e.target.value) })
                        }
                      />
                    </td>
                    <td className="px-1 py-0.5">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className={`${cellInput} text-right tabular-nums`}
                        value={voce.prezzoUnitario ?? ''}
                        onChange={(e) =>
                          aggiornaVoce(commessa.id, voce.id, {
                            prezzoUnitario: num(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono font-semibold text-zinc-950 tabular-nums">
                      {fmtEuro(imp)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(voce.oneriSicurezza)}
                        onChange={(e) =>
                          aggiornaVoce(commessa.id, voce.id, { oneriSicurezza: e.target.checked })
                        }
                        className="w-4 h-4 cursor-pointer accent-zinc-950"
                        title="Oneri per la sicurezza non soggetti a ribasso"
                      />
                    </td>
                    <td className="px-2">
                      <button
                        type="button"
                        onClick={() => eliminaVoce(commessa.id, voce.id)}
                        className="text-zinc-400 hover:text-red-600 transition-colors p-1"
                        title="Elimina voce"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {vociFiltrate.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-zinc-500 text-sm">
                    Nessuna voce di computo inserita. Clicca su &ldquo;Aggiungi voce&rdquo; oppure su
                    &ldquo;Popola voci tipo Lazio&rdquo;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-zinc-200 px-4 py-3 bg-zinc-50 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => aggiungiVoce(commessa.id)}
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-zinc-900 hover:text-zinc-700 transition-colors"
          >
            <Plus size={15} /> Aggiungi voce
          </button>
          <p className="text-[11px] font-mono text-zinc-600 inline-flex items-center gap-1.5">
            <Calculator size={13} /> Riferimento: Tariffa Prezzi Regione Lazio vigente (DGR Lazio)
          </p>
        </div>
      </div>
    </div>
  );
}