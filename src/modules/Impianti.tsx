import { useMemo, useState } from 'react';
import { Zap, Droplets, CircleCheck, AlertTriangle, Wrench } from 'lucide-react';
import { useStore, useAttiva } from '@/lib/store';
import { LIVELLI_CEI } from '@/lib/types';

const fmt = (n: number) => n.toFixed(0);

function calcolaCei(superficie: number, nVaniAbitabili: number, livelloIdx: number) {
  const l = LIVELLI_CEI[livelloIdx];
  const nPrese = Math.max(8, Math.ceil(superficie * l.presePerMq));
  const nLuci = Math.max(3, nVaniAbitabili * l.lucePerVano + 1);
  const circuiti = l.circuitiBase + (superficie > 90 ? 2 : superficie > 60 ? 1 : 0);
  return { ...l, nPrese, nLuci, circuiti };
}

export function Impianti() {
  const { commessa } = useAttiva();
  const vani = useStore((s) => (commessa ? s.vani[commessa.id] ?? [] : []));
  const [livello, setLivello] = useState(1); // Standard di default

  const superficie = useMemo(() => vani.reduce((a, v) => a + v.superficie, 0), [vani]);
  const nVaniAbitabili = useMemo(
    () => vani.filter((v) => !['Bagno', 'Corridoio'].includes(v.destinazione)).length || 4,
    [vani]
  );
  const dot = calcolaCei(superficie, nVaniAbitabili, livello);

  const bagni = vani.filter((v) => v.destinazione === 'Bagno');
  const bagniCiechi = bagni.filter((v) => v.superfFinestrata <= 0);
  const bagniSenzaVmc = bagniCiechi.filter((v) => !v.vmc);

  if (!commessa) return <div className="p-10 text-slate-500">Nessuna commessa attiva.</div>;

  const cardCls = 'bg-white rounded-lg border border-slate-200 shadow-sm p-6';

  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">4. Impianti (CEI 64-8 &amp; Idrico)</h1>
        <p className="text-sm text-slate-500 mt-1">
          Dimensionamento di base degli impianti elettrico e idrico-sanitario. Superficie rilevata dall'Audit: <strong className="text-slate-700">{superficie.toFixed(2).replace('.', ',')} mq</strong> su {vani.length} vani.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 mb-6">
        {LIVELLI_CEI.map((l, i) => (
          <button
            key={l.livello}
            onClick={() => setLivello(i)}
            className={`px-4 py-2.5 rounded-lg border text-[13px] font-medium transition-colors ${
              livello === i
                ? 'bg-sky-700 text-white border-sky-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:border-sky-400'
            }`}
          >
            {l.livello}
          </button>
        ))}
      </div>

      <div className={cardCls + ' mb-6'}>
        <div className="flex items-center gap-2.5 mb-4">
          <Zap size={18} className="text-sky-600" />
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">{dot.livello} — Dotazioni minime</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">{dot.descrizione}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Circuiti minimi', value: fmt(dot.circuiti), sub: 'incluse linee dedicate fornello/forno/lavatrice' },
            { label: 'Punti presa ≥', value: fmt(dot.nPrese), sub: 'almeno 1 ogni 1,25 mq in residenziale (≈ 0,10/mq)' },
            { label: 'Punti luce ≥', value: fmt(dot.nLuci), sub: '1 per vano + 1 su corridoio/ingresso' },
            { label: 'Potenza consigliata', value: dot.potenza, sub: dot.differenziali },
          ].map((c) => (
            <div key={c.label} className="rounded border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">{c.label}</p>
              <p className="text-xl font-bold text-sky-700 tabular-nums mt-1">{c.value}</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">{c.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={cardCls + ' mb-6'}>
        <div className="flex items-center gap-2.5 mb-4">
          <Droplets size={18} className="text-sky-600" />
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Verifica idrica e scarichi — Checklist</h3>
        </div>
        <ul className="space-y-2.5 text-[13px] text-slate-700">
          {[
            'Colonna di scarico principale: verificataubicazione e diametro (≥ 100 mm per WC, ≥ 50 mm scarichi secondari).',
            'Scarichi apparecchi: in PPR/PVC con piletta sifonica; pendenza ≥ 1% verso colonne esistenti.',
            'Adduzione acqua sanitaria: in multistrato/PPR, prese dedicate per lavatrice e lavastoviglie.',
            'Bagni ciechi: prevista VMC (ventilazione meccanica) o canna fumaria aspirante ex Reg. Edilizio Roma.',
            'Pressione di rete: verificata ≥ 1,5 bar al contatore; eventuale gruppo di sobralzamento idraulico.',
            'Contatori: verifica eventuali frazionamenti per cambio destinazione d\'uso o frazionamento.',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <Wrench size={15} className="text-slate-400 mt-0.5 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {bagniCiechi.length > 0 && (
        <div className={`rounded-lg border p-5 mb-6 ${bagniSenzaVmc.length > 0 ? 'border-red-300 bg-red-50' : 'border-emerald-300 bg-emerald-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            {bagniSenzaVmc.length > 0 ? (
              <AlertTriangle size={18} className="text-red-600" />
            ) : (
              <CircleCheck size={18} className="text-emerald-600" />
            )}
            <p className={`text-sm font-semibold ${bagniSenzaVmc.length > 0 ? 'text-red-800' : 'text-emerald-800'}`}>
              {bagniCiechi.length} bagn{bagniCiechi.length === 1 ? 'o cieco' : 'ni ciechi'} rilevati nell'audit
            </p>
          </div>
          {bagniSenzaVmc.length > 0 ? (
            <p className="text-[13px] text-red-700 leading-relaxed">
              I seguenti bagni ciechi <strong>non hanno la spunta VMC</strong> nel modulo 2: {bagniSenzaVmc.map((v) => v.nome || '(senza nome)').join(', ')}. Per i bagni senza finestra è obbligatorio prevedere l'aerazione meccanica (VMC) o canna fumaria aspirante ex Regolamento Edilizio di Roma Capitale.
            </p>
          ) : (
            <p className="text-[13px] text-emerald-700">Tutti i bagni ciechi hanno la spunta VMC attiva: situazione conforme al Regolamento Edilizio.</p>
          )}
        </div>
      )}

      <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
        Riferimenti: CEI 64-8 (Norma impianti elettrici utilizzatori — Livelli di progettazione sez. 520/526), CEI 100-1 (domotica),
        NTC 2018, D.M. 37/2008 (impianti nei fabbricati), Regolamento Edilizio di Roma Capitale. Le dotazioni qui calcolate
        costituiscono una pre-dimensionazione di livello 1/2/3; la progettazione esecutiva resta a carico del Professionista incaricato.
      </p>
    </div>
  );
}
