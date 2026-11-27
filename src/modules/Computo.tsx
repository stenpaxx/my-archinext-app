import { useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Calculator,
  Download,
  FileSpreadsheet,
  Sparkles,
  Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  useStore,
  useAttiva,
  EMPTY_VOCI,
  EMPTY_VANI,
  type VoceComputo,
} from '@/lib/store';
import { calcolaRiepilogoEconomico } from '@/lib/economia';
import { esportaExcel } from '@/lib/excel';

const fmtEuro = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

const num = (v: string) => (v === '' ? 0 : Math.max(0, parseFloat(v) || 0));

const cellInput =
  'w-full bg-transparent px-2 py-1.5 text-[13px] text-zinc-900 focus:outline-none focus:bg-zinc-100 focus:ring-1 focus:ring-zinc-950 rounded transition-colors';

const VOCI_LAZIO_PRESET: Array<Omit<VoceComputo, 'id'>> = [
  {
    codice: 'A 01.01.010.a',
    descrizione:
      'Demolizione di tramezzi in laterizio forato spessore fino a 12 cm, compreso carico e trasporto a discarica autorizzata',
    categoria: 'Demolizioni e Rimozioni',
    unitaMisura: 'mq',
    um: 'mq',
    quantita: 28.0,
    prezzoUnitario: 24.5,
    oneriSicurezza: false,
  },
  {
    codice: 'A 01.02.015.b',
    descrizione:
      'Rimozione di pavimenti in ceramica, marmette o parquet, compreso sottostante massetto di allettamento fino a 5 cm',
    categoria: 'Demolizioni e Rimozioni',
    unitaMisura: 'mq',
    um: 'mq',
    quantita: 72.0,
    prezzoUnitario: 19.8,
    oneriSicurezza: false,
  },
  {
    codice: 'A 04.01.020.c',
    descrizione:
      'Muratura di tamponamento o tramezzatura in laterizio forato spessore 10 cm legata con malta bastarda',
    categoria: 'Murature e Divisori',
    unitaMisura: 'mq',
    um: 'mq',
    quantita: 32.0,
    prezzoUnitario: 46.2,
    oneriSicurezza: false,
  },
  {
    codice: 'A 12.01.005.a',
    descrizione:
      'Fornitura e posa in opera di pavimentazione in gres porcellanato rettificato posato a colla, escluso massetto',
    categoria: 'Pavimenti e Rivestimenti',
    unitaMisura: 'mq',
    um: 'mq',
    quantita: 72.0,
    prezzoUnitario: 68.0,
    oneriSicurezza: false,
  },
  {
    codice: 'E 01.01.010.a',
    descrizione:
      'Rifacimento completo impianto elettrico sottotraccia per unità abitativa (CEI 64-8 Livello 1), punti luce e prese',
    categoria: 'Impianti Elettrici e Speciali',
    unitaMisura: 'p.to',
    um: 'p.to',
    quantita: 45,
    prezzoUnitario: 65.0,
    oneriSicurezza: false,
  },
  {
    codice: 'I 01.02.008.a',
    descrizione:
      'Impianto idrico-sanitario per bagno completo con tubazioni multistrato coibentate, scarichi in PP e collettori',
    categoria: 'Impianti Idrico-Termici',
    unitaMisura: 'cad',
    um: 'cad',
    quantita: 2,
    prezzoUnitario: 1850.0,
    oneriSicurezza: false,
  },
  {
    codice: 'S 01.01.001.a',
    descrizione:
      'Oneri per la sicurezza aziendali e apprestamenti di cantiere D.Lgs 81/2008 (non soggetti a ribasso)',
    categoria: 'Oneri Sicurezza',
    unitaMisura: 'a corpo',
    um: 'a corpo',
    quantita: 1,
    prezzoUnitario: 2450.0,
    oneriSicurezza: true,
  },
];

export function Computo() {
  const { commessa } = useAttiva();
  const voci = useStore((s) => (commessa ? s.voci?.[commessa.id] ?? EMPTY_VOCI : EMPTY_VOCI));
  const vani = useStore((s) => (commessa ? s.vani?.[commessa.id] ?? EMPTY_VANI : EMPTY_VANI));
  const aggiungiVoce = useStore((s) => s.aggiungiVoce);
  const aggiornaVoce = useStore((s) => s.aggiornaVoce);
  const eliminaVoce = useStore((s) => s.eliminaVoce);
  const setVoci = useStore((s) => s.setVoci);

  const [filtroCategoria, setFiltroCategoria] = useState<string>('Tutte');
  const [exportingXlsx, setExportingXlsx] = useState<boolean>(false);

  const riepilogo = useMemo(() => {
    const eco = calcolaRiepilogoEconomico(voci, vani);
    const incidenzaMq =
      eco.superficieTotale > 0 ? eco.totaleGenerale / eco.superficieTotale : 0;
    return {
      eco,
      lavori: eco.importoLavori,
      oneri: eco.oneriSicurezza,
      totale: eco.totaleGenerale,
      incidenzaMq,
    };
  }, [voci, vani]);

  if (!commessa) {
    return <div className="p-10 text-zinc-600">Nessuna commessa attiva.</div>;
  }

  const caricaPrezzarioBase = () => {
    const nuove: VoceComputo[] = VOCI_LAZIO_PRESET.map((item, idx) => ({
      ...item,
      id: `lazio-${Date.now()}-${idx}`,
      um: item.um || item.unitaMisura || 'mq',
      importo: Number(((item.quantita ?? 0) * (item.prezzoUnitario ?? 0)).toFixed(2)),
    }));
    setVoci(commessa.id, nuove);
  };

  const esportaCSV = () => {
    const intestazione = [
      'Codice Prezzario',
      'Categoria',
      'Descrizione',
      'U.M.',
      'Quantità',
      'Prezzo Unitario',
      'Importo',
      'Oneri Sicurezza',
    ];
    const righe = voci.map((v) => {
      const q = Number(v.quantita) || 0;
      const p = Number(v.prezzoUnitario ?? v.prezzo) || 0;
      const isSic = Boolean(v.oneriSicurezza ?? v.sicurezza);
      return [
        `"${(v.codice ?? v.codicePrezzario ?? '').replace(/"/g, '""')}"`,
        `"${(v.categoria ?? v.wbs ?? 'Opere edili').replace(/"/g, '""')}"`,
        `"${(v.descrizione ?? '').replace(/"/g, '""')}"`,
        `"${v.unitaMisura ?? v.um ?? 'mq'}"`,
        q.toFixed(2).replace('.', ','),
        p.toFixed(2).replace('.', ','),
        (q * p).toFixed(2).replace('.', ','),
        isSic ? 'SI' : 'NO',
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

  const handleEsportaExcel = async () => {
    setExportingXlsx(true);
    try {
      const result = await (esportaExcel as unknown as (
        c: typeof commessa,
        va: typeof vani,
        vo: typeof voci
      ) => unknown)(commessa, vani, voci);

      const fileName = `Computo_Lazio_${commessa.codice}.xlsx`;

      if (result instanceof Blob) {
        const url = URL.createObjectURL(result);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      if (result && typeof result === 'object' && 'Sheets' in result) {
        XLSX.writeFile(result as XLSX.WorkBook, fileName);
        return;
      }

      // Fallback locale se esportaExcel non esegue direttamente writeFile
      const wb = XLSX.utils.book_new();
      const righeComputo = voci.map((v) => {
        const q = Number(v.quantita) || 0;
        const p = Number(v.prezzoUnitario ?? v.prezzo) || 0;
        const isSic = Boolean(v.oneriSicurezza ?? v.sicurezza);
        return {
          Codice: v.codice ?? v.codicePrezzario ?? '',
          Categoria: v.categoria ?? v.wbs ?? 'Opere edili',
          Descrizione: v.descrizione ?? '',
          UM: v.unitaMisura ?? v.um ?? 'mq',
          Quantita: q,
          PrezzoUnitario: p,
          Importo: Number((q * p).toFixed(2)),
          Sicurezza: isSic ? 'SI' : 'NO',
        };
      });
      const wsComputo = XLSX.utils.json_to_sheet(righeComputo);
      XLSX.utils.book_append_sheet(wb, wsComputo, 'Computo Metrico');

      const righeVani = vani.map((vn) => ({
        Vano: vn.nome,
        Destinazione: vn.destinazione,
        Superficie_mq: Number(vn.superficie) || 0,
        Sup_Finestrata_mq: Number(vn.superfFinestrata) || 0,
        Altezza_m: Number(vn.altezzaMedia) || 0,
        VMC: vn.vmc ? 'SI' : 'NO',
      }));
      const wsVani = XLSX.utils.json_to_sheet(righeVani);
      XLSX.utils.book_append_sheet(wb, wsVani, 'Abaco Vani');

      XLSX.writeFile(wb, fileName);
    } finally {
      setExportingXlsx(false);
    }
  };

  const categorie = [
    'Tutte',
    ...Array.from(new Set(voci.map((v) => v.categoria || v.wbs || 'Opere edili'))),
  ];
  const vociFiltrate =
    filtroCategoria === 'Tutte'
      ? voci
      : voci.filter((v) => (v.categoria || v.wbs || 'Opere edili') === filtroCategoria);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
            4. Abachi e Computo Metrico Estimativo
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
            onClick={() => void handleEsportaExcel()}
            disabled={exportingXlsx || (voci.length === 0 && vani.length === 0)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:border-zinc-950 disabled:opacity-40 transition-colors"
          >
            <FileSpreadsheet size={13} />
            <span>{exportingXlsx ? 'Esportazione...' : 'Esporta Excel (.xlsx)'}</span>
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

      {riepilogo.eco.modalita === 'stima' && (
        <div className="rounded-xl bg-amber-50 border border-amber-300 px-4 py-3 text-xs text-amber-950 flex items-start gap-2.5">
          <Info size={15} className="text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Nessuna voce analitica inserita in questo computo: nel pannello laterale è attiva la{' '}
            <strong>stima parametrica preliminare</strong> su{' '}
            <strong className="font-mono">{riepilogo.eco.superficieTotale.toFixed(1)} m²</strong>{' '}
            ({fmtEuro(riepilogo.totale)} IVA escl.). Aggiungi una voce o clicca su{' '}
            <em>&ldquo;Popola voci tipo Lazio&rdquo;</em> per passare al computo analitico.
          </p>
        </div>
      )}

      {/* Riepilogo sintetico */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-zinc-950 text-white border border-zinc-800 p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            {riepilogo.eco.modalita === 'stima' ? 'Lavori Stimati (Parametrici)' : 'Lavori a Misura'}
          </span>
          <p className="text-xl font-mono font-bold mt-1 tabular-nums">
            {fmtEuro(riepilogo.lavori)}
          </p>
        </div>
        <div className="rounded-xl bg-zinc-950 text-white border border-zinc-800 p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            Oneri Sicurezza (D.Lgs 81/08)
          </span>
          <p className="text-xl font-mono font-bold text-amber-300 mt-1 tabular-nums">
            {fmtEuro(riepilogo.oneri)}
          </p>
        </div>
        <div className="rounded-xl bg-zinc-950 text-white border border-zinc-800 p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            {riepilogo.eco.modalita === 'stima'
              ? 'Totale Stimato (IVA escl.)'
              : 'Totale Computo (IVA escl.)'}
          </span>
          <p className="text-xl font-mono font-bold text-emerald-300 mt-1 tabular-nums">
            {fmtEuro(riepilogo.totale)}
          </p>
          <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
            {riepilogo.eco.superficieTotale > 0
              ? `Incidenza: ${fmtEuro(riepilogo.incidenzaMq)}/mq (${riepilogo.eco.superficieTotale.toFixed(1)} m²)`
              : 'Incidenza: —'}
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
                <th className="text-left font-medium px-3 py-2.5 min-w-[240px]">
                  Descrizione Lavorazione
                </th>
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
                const p = Number(voce.prezzoUnitario ?? voce.prezzo) || 0;
                const imp = q * p;
                const isSic = Boolean(voce.oneriSicurezza ?? voce.sicurezza);
                return (
                  <tr key={voce.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-1 py-0.5">
                      <input
                        className={`${cellInput} font-mono text-xs`}
                        value={voce.codice ?? voce.codicePrezzario ?? ''}
                        placeholder="A 01.01..."
                        onChange={(e) =>
                          aggiornaVoce(commessa.id, voce.id, { codice: e.target.value })
                        }
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
                        value={voce.unitaMisura ?? voce.um ?? 'mq'}
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
                        value={voce.prezzoUnitario ?? voce.prezzo ?? ''}
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
                        checked={isSic}
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