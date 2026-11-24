import { Plus, Trash2, AlertTriangle, CircleCheck, Wind } from 'lucide-react';
import { useStore, useAttiva } from '@/lib/store';
import { DESTINAZIONI_VANO, SUPERFICIE_MINIMA, ALTEZZA_MINIMA } from '@/lib/types';

const RAI_MIN = 1 / 8; // 0,125

const num = (v: string) => (v === '' ? 0 : Math.max(0, parseFloat(v) || 0));
const fmt = (n: number) => n.toFixed(2).replace('.', ',');

const cellInput =
  'w-full bg-transparent px-2 py-1.5 text-[13px] text-slate-800 focus:outline-none focus:bg-sky-50 focus:ring-1 focus:ring-sky-400 rounded transition-colors';

export function AuditRAI() {
  const { commessa } = useAttiva();
  const vani = useStore((s) => (commessa ? s.vani[commessa.id] ?? [] : []));
  const aggiungiVano = useStore((s) => s.aggiungiVano);
  const aggiornaVano = useStore((s) => s.aggiornaVano);
  const eliminaVano = useStore((s) => s.eliminaVano);

  if (!commessa) return <div className="p-10 text-slate-500">Nessuna commessa attiva.</div>;

  return (
    <div className="p-8 max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">2. Audit Distributivo &amp; RAI</h1>
        <p className="text-sm text-slate-500 mt-1">
          Verifica Rapporti Aeroilluminanti (≥ 1/8), superfici e altezze minime DM 05/07/1975. Commessa: <strong className="text-slate-700">{commessa.codice}</strong>
        </p>
      </header>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-slate-900 text-slate-300 text-[11px] uppercase tracking-wide">
                <th className="text-left font-medium px-3 py-2.5 min-w-[140px]">Nome vano</th>
                <th className="text-left font-medium px-3 py-2.5 min-w-[160px]">Destinazione</th>
                <th className="text-right font-medium px-3 py-2.5 w-28">Sup. mq</th>
                <th className="text-right font-medium px-3 py-2.5 w-32">Finestr. aprib. mq</th>
                <th className="text-right font-medium px-3 py-2.5 w-24">H media m</th>
                <th className="text-center font-medium px-3 py-2.5 w-28">RAI</th>
                <th className="text-left font-medium px-3 py-2.5 min-w-[230px]">Esito</th>
                <th className="text-center font-medium px-3 py-2.5 w-24">VMC</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vani.map((v) => {
                const rai = v.superficie > 0 ? v.superfFinestrata / v.superficie : 0;
                const conforme = v.superficie > 0 && rai >= RAI_MIN;
                const mancanti = Math.max(0, v.superficie * RAI_MIN - v.superfFinestrata);
                const minLegge = SUPERFICIE_MINIMA[v.destinazione];
                const supOk = minLegge === undefined || v.superficie >= minLegge;
                const hMin = ALTEZZA_MINIMA[v.destinazione] ?? ALTEZZA_MINIMA['__default__'];
                const hOk = v.altezzaMedia >= hMin - 1e-9;

                return (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-1 py-0.5">
                      <input className={cellInput} value={v.nome} placeholder="Es. Camera 1" onChange={(e) => aggiornaVano(commessa.id, v.id, { nome: e.target.value })} />
                    </td>
                    <td className="px-1 py-0.5">
                      <select className={cellInput} value={v.destinazione} onChange={(e) => aggiornaVano(commessa.id, v.id, { destinazione: e.target.value })}>
                        {DESTINAZIONI_VANO.map((d) => <option key={d}>{d}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-0.5">
                      <input type="number" min={0} step={0.01} className={`${cellInput} text-right tabular-nums`} value={v.superficie || ''} placeholder="0,00" onChange={(e) => aggiornaVano(commessa.id, v.id, { superficie: num(e.target.value) })} />
                    </td>
                    <td className="px-1 py-0.5">
                      <input type="number" min={0} step={0.01} className={`${cellInput} text-right tabular-nums`} value={v.superfFinestrata || ''} placeholder="0,00" onChange={(e) => aggiornaVano(commessa.id, v.id, { superfFinestrata: num(e.target.value) })} />
                    </td>
                    <td className="px-1 py-0.5">
                      <input type="number" min={0} step={0.01} className={`${cellInput} text-right tabular-nums`} value={v.altezzaMedia || ''} placeholder="2,70" onChange={(e) => aggiornaVano(commessa.id, v.id, { altezzaMedia: num(e.target.value) })} />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <span className={`inline-block font-mono font-semibold px-2 py-0.5 rounded tabular-nums ${
                        conforme ? 'bg-emerald-100 text-emerald-800' : v.superficie > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {v.superficie > 0 ? fmt(rai) : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      {v.superficie <= 0 ? (
                        <span className="text-xs text-slate-400">Inserire la superficie</span>
                      ) : conforme ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                          <CircleCheck size={14} className="text-emerald-600" /> CONFORME (≥ 0,125)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
                          <AlertTriangle size={14} className="text-red-600" /> NON CONFORME · mancano {fmt(mancanti)} mq
                        </span>
                      )}
                      {!supOk && (
                        <span className="block text-[11px] text-amber-700 mt-0.5">
                          Superficie &lt; minimo DM ({fmt(minLegge ?? 0)} mq per {v.destinazione.toLowerCase()})
                        </span>
                      )}
                      {!hOk && (
                        <span className="block text-[11px] text-amber-700">
                          Altezza &lt; {hMin.toFixed(2).replace('.', ',')} m (DM art. 5)
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={v.vmc}
                        onChange={(e) => aggiornaVano(commessa.id, v.id, { vmc: e.target.checked })}
                        className={`w-4 h-4 cursor-pointer ${v.vmc ? 'accent-sky-600' : 'accent-slate-400'}`}
                        title="Aerazione meccanica (VMC) — ammessa per bagni ciechi ex Reg. Edilizio Roma"
                      />
                    </td>
                    <td className="px-2">
                      <button onClick={() => eliminaVano(commessa.id, v.id)} className="text-slate-300 hover:text-red-600 transition-colors p-1">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {vani.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-sm">Nessun vano inserito. Aggiungi il primo vano per avviare l'audit.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 px-4 py-3 bg-slate-50 flex items-center justify-between">
          <button onClick={() => aggiungiVano(commessa.id)} className="inline-flex items-center gap-2 text-[13px] font-medium text-sky-700 hover:text-sky-900 transition-colors">
            <Plus size={15} /> Aggiungi vano
          </button>
          <p className="text-[11px] text-slate-500 inline-flex items-center gap-1.5">
            <Wind size={13} className="text-sky-600" /> VMC: aerazione meccanica ammessa per bagni ciechi ex Regolamento Edilizio di Roma Capitale.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] text-slate-600 leading-relaxed">
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="font-semibold text-slate-800 mb-1">Superfici minime (DM 05/07/1975, art. 5)</p>
          <p>Camera singola ≥ 9 mq · Camera matrimoniale ≥ 14 mq · Soggiorno ≥ 14 mq · Cucina abitabile ≥ 9 mq · Monolocale ≥ 28 mq (1 pessoa) / ≥ 38 mq (2 persone) · Altezze: 2,70 m ambienti abitativi — 2,40 m corridoi e bagni.</p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="font-semibold text-slate-800 mb-1">Rapporti aeroilluminanti (DM art. 4)</p>
          <p>RAI = superficie finestrata apribile esterno / superficie calpestabile, con minimo 1/8 per gli ambienti abitabili. I bagni ciechi devono garantire aerazione forzata (VMC) o canna fumaria aspirante secondo il Regolamento Edilizio di Roma Capitale.</p>
        </div>
      </div>
    </div>
  );
}
