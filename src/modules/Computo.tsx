import { useMemo, useState } from 'react';
import { Plus, Trash2, FileSpreadsheet, Search, Package, Droplets } from 'lucide-react';
import { useStore, useAttiva } from '@/lib/store';
import { PREZZARIO_LAZIO } from '@/data/prezzarioLazio';
import { esportaExcel, eur } from '@/lib/excel';
import { WBS_CATEGORIE, TIPI_INFSSI, APPARECCHI_SANITARI } from '@/lib/types';

const num = (v: string) => (v === '' ? 0 : Math.max(0, parseFloat(v) || 0));

const cellInput =
  'w-full bg-transparent px-2 py-1.5 text-[13px] text-slate-800 focus:outline-none focus:bg-sky-50 focus:ring-1 focus:ring-sky-400 rounded transition-colors';

type TabId = 'prezzario' | 'computo' | 'abachi';

export function Computo() {
  const { commessa } = useAttiva();
  const voci = useStore((s) => (commessa ? s.voci[commessa.id] ?? [] : []));
  const infissi = useStore((s) => (commessa ? s.infissi[commessa.id] ?? [] : []));
  const sanitari = useStore((s) => (commessa ? s.sanitari[commessa.id] ?? [] : []));
  const vani = useStore((s) => (commessa ? s.vani[commessa.id] ?? [] : []));
  const aggiungiVoce = useStore((s) => s.aggiungiVoce);
  const aggiornaVoce = useStore((s) => s.aggiornaVoce);
  const eliminaVoce = useStore((s) => s.eliminaVoce);
  const aggiungiInfisso = useStore((s) => s.aggiungiInfisso);
  const aggiornaInfisso = useStore((s) => s.aggiornaInfisso);
  const eliminaInfisso = useStore((s) => s.eliminaInfisso);
  const aggiungiSanitario = useStore((s) => s.aggiungiSanitario);
  const aggiornaSanitario = useStore((s) => s.aggiornaSanitario);
  const eliminaSanitario = useStore((s) => s.eliminaSanitario);

  const [tab, setTab] = useState<TabId>('computo');
  const [ricerca, setRicerca] = useState('');
  const [filtroWbs, setFiltroWbs] = useState<string>('Tutte');

  const totali = useMemo(() => {
    const lavori = voci.filter((v) => !v.oneriSicurezza).reduce((a, v) => a + v.quantita * v.prezzoUnitario, 0);
    const sicurezza = voci.filter((v) => v.oneriSicurezza).reduce((a, v) => a + v.quantita * v.prezzoUnitario, 0);
    return { lavori, sicurezza, generale: lavori + sicurezza };
  }, [voci]);

  const risultati = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    return PREZZARIO_LAZIO.filter((v) => {
      const okWbs = filtroWbs === 'Tutte' || v.wbs === filtroWbs;
      const okQ = !q || v.descrizione.toLowerCase().includes(q) || v.codicePrezzario.toLowerCase().includes(q) || v.wbs.toLowerCase().includes(q);
      return okWbs && okQ;
    });
  }, [ricerca, filtroWbs]);

  if (!commessa) return <div className="p-10 text-slate-500">Nessuna commessa attiva.</div>;

  const aggDaPrezzario = (id: string) => {
    const p = PREZZARIO_LAZIO.find((x) => x.id === id);
    if (!p) return;
    aggiungiVoce(commessa.id, {
      codicePrezzario: p.codicePrezzario,
      wbs: p.wbs,
      descrizione: p.descrizione,
      um: p.um,
      quantita: 0,
      prezzoUnitario: p.prezzoUnitario,
      oneriSicurezza: p.oneriSicurezza,
    });
  };

  const setVoce = (id: string, patch: Partial<(typeof voci)[number]>) => aggiornaVoce(commessa.id, id, patch);

  const TABS: { id: TabId; label: string }[] = [
    { id: 'prezzario', label: `Prezzario Lazio (${PREZZARIO_LAZIO.length} voci)` },
    { id: 'computo', label: `Computo Metrico (${voci.length})` },
    { id: 'abachi', label: 'Abachi (Infissi & Sanitari)' },
  ];

  return (
    <div className="p-8 max-w-7xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">5. Abachi &amp; Computo (Lazio + Excel)</h1>
          <p className="text-sm text-slate-500 mt-1">Prezzario Regionale Lazio · Computo Metrico Estimativo · Commessa <strong className="text-slate-700">{commessa.codice}</strong></p>
        </div>
        <button onClick={() => esportaExcel(commessa, voci, infissi, sanitari, vani)} className="inline-flex items-center gap-2 px-4 py-2 rounded bg-emerald-700 text-white text-[13px] font-medium hover:bg-emerald-600 transition-colors">
          <FileSpreadsheet size={15} /> Esporta Excel (.xlsx)
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg bg-white border border-slate-200 shadow-sm p-5 border-t-4 border-t-sky-600">
          <p className="text-[11px] uppercase tracking-wide font-medium text-slate-500">Importo Lavori (soggetto a ribasso)</p>
          <p className="text-2xl font-bold text-sky-700 tabular-nums mt-1.5">{eur(totali.lavori)}</p>
        </div>
        <div className="rounded-lg bg-white border border-slate-200 shadow-sm p-5 border-t-4 border-t-amber-500">
          <p className="text-[11px] uppercase tracking-wide font-medium text-slate-500">Oneri della Sicurezza (non soggetti a ribasso)</p>
          <p className="text-2xl font-bold text-amber-600 tabular-nums mt-1.5">{eur(totali.sicurezza)}</p>
        </div>
        <div className="rounded-lg bg-slate-900 shadow-sm p-5">
          <p className="text-[11px] uppercase tracking-wide font-medium text-slate-400">Totale Generale Commessa</p>
          <p className="text-2xl font-bold text-white tabular-nums mt-1.5">{eur(totali.generale)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-4 border-b border-slate-300">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-[13px] font-medium -mb-px border-b-2 transition-colors ${
              tab === t.id ? 'border-sky-600 text-sky-800 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'prezzario' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                placeholder="Cerca voce, codice o categoria..."
                className="w-full bg-white border border-slate-300 rounded pl-9 pr-3 py-2 text-[13px] focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
              />
            </div>
            <select
              value={filtroWbs}
              onChange={(e) => setFiltroWbs(e.target.value)}
              className="bg-white border border-slate-300 rounded px-3 py-2 text-[13px] focus:outline-none focus:border-sky-600"
            >
              <option>Tutte</option>
              {WBS_CATEGORIE.map((w) => <option key={w}>{w}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {risultati.map((p) => (
              <div key={p.id} className={`bg-white rounded-lg border shadow-sm p-4 flex items-start justify-between gap-3 ${p.oneriSicurezza ? 'border-amber-300' : 'border-slate-200'}`}>
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-slate-400">{p.codicePrezzario} · {p.wbs}</p>
                  <p className="text-[13px] text-slate-800 leading-snug mt-0.5">{p.descrizione}</p>
                  <p className="text-[13px] font-semibold text-sky-700 mt-1.5">{eur(p.prezzoUnitario)} / {p.um}{p.oneriSicurezza && <span className="ml-2 text-[11px] font-medium text-amber-600">non soggetto a ribasso</span>}</p>
                </div>
                <button
                  onClick={() => aggDaPrezzario(p.id)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-700 text-white text-xs font-medium hover:bg-sky-600 transition-colors"
                >
                  <Plus size={13} /> Aggiungi
                </button>
              </div>
            ))}
            {risultati.length === 0 && <p className="text-sm text-slate-400 col-span-2 py-8 text-center">Nessuna voce trovata per la ricerca.</p>}
          </div>
        </div>
      )}

      {tab === 'computo' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-slate-900 text-slate-300 text-[11px] uppercase tracking-wide">
                  <th className="text-left font-medium px-3 py-2.5 min-w-[120px]">Cod. Prezzario</th>
                  <th className="text-left font-medium px-3 py-2.5 min-w-[140px]">Categoria WBS</th>
                  <th className="text-left font-medium px-3 py-2.5 min-w-[260px]">Descrizione</th>
                  <th className="text-left font-medium px-3 py-2.5 w-14">UM</th>
                  <th className="text-right font-medium px-3 py-2.5 w-24">Quantità</th>
                  <th className="text-right font-medium px-3 py-2.5 w-28">Prezzo Un. €</th>
                  <th className="text-right font-medium px-3 py-2.5 w-32">Importo €</th>
                  <th className="text-center font-medium px-3 py-2.5 w-24">Sicurezza</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {voci.map((v) => {
                  const importo = v.quantita * v.prezzoUnitario;
                  return (
                    <tr key={v.id} className={`hover:bg-slate-50/70 transition-colors ${v.oneriSicurezza ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-1 py-0.5"><input className={`${cellInput} font-mono text-xs`} value={v.codicePrezzario} onChange={(e) => setVoce(v.id, { codicePrezzario: e.target.value })} /></td>
                      <td className="px-1 py-0.5">
                        <select className={cellInput} value={v.wbs} onChange={(e) => setVoce(v.id, { wbs: e.target.value })}>
                          {WBS_CATEGORIE.map((w) => <option key={w}>{w}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-0.5"><input className={cellInput} value={v.descrizione} placeholder="Descrizione voce..." onChange={(e) => setVoce(v.id, { descrizione: e.target.value })} /></td>
                      <td className="px-1 py-0.5"><input className={cellInput} value={v.um} onChange={(e) => setVoce(v.id, { um: e.target.value })} /></td>
                      <td className="px-1 py-0.5"><input type="number" min={0} step={0.01} className={`${cellInput} text-right tabular-nums`} value={v.quantita || ''} placeholder="0" onChange={(e) => setVoce(v.id, { quantita: num(e.target.value) })} /></td>
                      <td className="px-1 py-0.5"><input type="number" min={0} step={0.01} className={`${cellInput} text-right tabular-nums`} value={v.prezzoUnitario || ''} placeholder="0,00" onChange={(e) => setVoce(v.id, { prezzoUnitario: num(e.target.value) })} /></td>
                      <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-slate-800">{eur(importo)}</td>
                      <td className="px-2 py-1.5 text-center">
                        <input type="checkbox" checked={v.oneriSicurezza} onChange={(e) => setVoce(v.id, { oneriSicurezza: e.target.checked })} className="w-4 h-4 accent-amber-600 cursor-pointer" title="Oneri sicurezza (non soggetto a ribasso)" />
                      </td>
                      <td className="px-2">
                        <button onClick={() => eliminaVoce(commessa.id, v.id)} className="text-slate-300 hover:text-red-600 transition-colors p-1"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  );
                })}
                {voci.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-sm">Nessuna voce. Aggiungi voci dal Prezzario Lazio.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 px-4 py-3 bg-slate-50">
            <button
              onClick={() => aggiungiVoce(commessa.id, { codicePrezzario: '', wbs: 'Demolizioni', descrizione: '', um: 'mq', quantita: 0, prezzoUnitario: 0, oneriSicurezza: false })}
              className="inline-flex items-center gap-2 text-[13px] font-medium text-sky-700 hover:text-sky-900 transition-colors"
            >
              <Plus size={15} /> Voce manuale
            </button>
          </div>
        </div>
      )}

      {tab === 'abachi' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Abaco Infissi */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800 inline-flex items-center gap-2"><Package size={16} className="text-sky-600" /> Abaco Infissi</p>
              <button
                onClick={() => aggiungiInfisso(commessa.id, { locale: '', tipo: TIPI_INFSSI[0], dimensioni: '', quantita: 1, prezzoUnitario: 0 })}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:text-sky-900"
              >
                <Plus size={13} /> Aggiungi
              </button>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase text-slate-500 bg-slate-50">
                  <th className="text-left font-medium px-2 py-2">Locale</th>
                  <th className="text-left font-medium px-2 py-2">Tipo</th>
                  <th className="text-left font-medium px-2 py-2">Dim.</th>
                  <th className="text-right font-medium px-2 py-2 w-16">Qtà</th>
                  <th className="text-right font-medium px-2 py-2 w-24">€ Un.</th>
                  <th className="text-right font-medium px-2 py-2 w-24">Importo</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {infissi.map((i) => (
                  <tr key={i.id}>
                    <td className="px-1 py-0.5"><input className={cellInput} value={i.locale} placeholder="Locale" onChange={(e) => aggiornaInfisso(commessa.id, i.id, { locale: e.target.value })} /></td>
                    <td className="px-1 py-0.5">
                      <select className={cellInput} value={i.tipo} onChange={(e) => aggiornaInfisso(commessa.id, i.id, { tipo: e.target.value })}>
                        {TIPI_INFSSI.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-0.5"><input className={`${cellInput} w-24`} value={i.dimensioni} placeholder="120x220 h" onChange={(e) => aggiornaInfisso(commessa.id, i.id, { dimensioni: e.target.value })} /></td>
                    <td className="px-1 py-0.5"><input type="number" min={0} className={`${cellInput} text-right tabular-nums`} value={i.quantita || ''} onChange={(e) => aggiornaInfisso(commessa.id, i.id, { quantita: num(e.target.value) })} /></td>
                    <td className="px-1 py-0.5"><input type="number" min={0} className={`${cellInput} text-right tabular-nums`} value={i.prezzoUnitario || ''} onChange={(e) => aggiornaInfisso(commessa.id, i.id, { prezzoUnitario: num(e.target.value) })} /></td>
                    <td className="px-2 text-right font-medium tabular-nums">{eur(i.quantita * i.prezzoUnitario)}</td>
                    <td className="px-1"><button onClick={() => eliminaInfisso(commessa.id, i.id)} className="text-slate-300 hover:text-red-600 p-1"><Trash2 size={13} /></button></td>
                  </tr>
                ))}
                {infissi.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-6 text-xs">Nessun infisso.</td></tr>}
              </tbody>
              {infissi.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 font-semibold text-slate-800">
                    <td colSpan={5} className="px-2 py-2 text-right text-xs uppercase">Totale Abaco Infissi</td>
                    <td className="px-2 py-2 text-right tabular-nums text-sky-700">{eur(infissi.reduce((a, i) => a + i.quantita * i.prezzoUnitario, 0))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Abaco Sanitari */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800 inline-flex items-center gap-2"><Droplets size={16} className="text-sky-600" /> Abaco Sanitari</p>
              <button
                onClick={() => aggiungiSanitario(commessa.id, { ambiente: '', apparecchio: APPARECCHI_SANITARI[0], quantita: 1, prezzoUnitario: 0 })}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:text-sky-900"
              >
                <Plus size={13} /> Aggiungi
              </button>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase text-slate-500 bg-slate-50">
                  <th className="text-left font-medium px-2 py-2">Ambiente</th>
                  <th className="text-left font-medium px-2 py-2">Apparecchio</th>
                  <th className="text-right font-medium px-2 py-2 w-16">Qtà</th>
                  <th className="text-right font-medium px-2 py-2 w-24">€ Un.</th>
                  <th className="text-right font-medium px-2 py-2 w-24">Importo</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sanitari.map((s) => (
                  <tr key={s.id}>
                    <td className="px-1 py-0.5"><input className={cellInput} value={s.ambiente} placeholder="Bagno" onChange={(e) => aggiornaSanitario(commessa.id, s.id, { ambiente: e.target.value })} /></td>
                    <td className="px-1 py-0.5">
                      <select className={cellInput} value={s.apparecchio} onChange={(e) => aggiornaSanitario(commessa.id, s.id, { apparecchio: e.target.value })}>
                        {APPARECCHI_SANITARI.map((a) => <option key={a}>{a}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-0.5"><input type="number" min={0} className={`${cellInput} text-right tabular-nums`} value={s.quantita || ''} onChange={(e) => aggiornaSanitario(commessa.id, s.id, { quantita: num(e.target.value) })} /></td>
                    <td className="px-1 py-0.5"><input type="number" min={0} className={`${cellInput} text-right tabular-nums`} value={s.prezzoUnitario || ''} onChange={(e) => aggiornaSanitario(commessa.id, s.id, { prezzoUnitario: num(e.target.value) })} /></td>
                    <td className="px-2 text-right font-medium tabular-nums">{eur(s.quantita * s.prezzoUnitario)}</td>
                    <td className="px-1"><button onClick={() => eliminaSanitario(commessa.id, s.id)} className="text-slate-300 hover:text-red-600 p-1"><Trash2 size={13} /></button></td>
                  </tr>
                ))}
                {sanitari.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-6 text-xs">Nessun apparecchio.</td></tr>}
              </tbody>
              {sanitari.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 font-semibold text-slate-800">
                    <td colSpan={4} className="px-2 py-2 text-right text-xs uppercase">Totale Abaco Sanitari</td>
                    <td className="px-2 py-2 text-right tabular-nums text-sky-700">{eur(sanitari.reduce((a, s) => a + s.quantita * s.prezzoUnitario, 0))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
