import { useState } from 'react';
import {
  Building2, ChevronDown, Upload, BadgeCheck, Landmark, AlertTriangle, Info,
} from 'lucide-react';
import { useStore, useAttiva } from '@/lib/store';
import { MUNICIPI, STEP_LABELS, TESSUTI_PRG, type Commessa, type TipologiaCommessa } from '@/lib/types';

const TIPOLOGIE: TipologiaCommessa[] = [
  'Manutenzione Straordinaria CILA',
  'Frazionamento CILA',
  'Ristrutturazione SCIA',
  'Cambio d’uso SCIA',
];

const inputCls =
  'w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-[13px] text-slate-800 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

export function DueDiligence() {
  const { commessa } = useAttiva();
  const aggiornaCommessa = useStore((s) => s.aggiornaCommessa);
  const steps = useStore((s) => s.steps[commessa?.id ?? ''] ?? Array(7).fill(false));
  const toggleStep = useStore((s) => s.toggleStep);
  const [openDati, setOpenDati] = useState(false);

  if (!commessa) {
    return <div className="p-10 text-slate-500">Nessuna commessa attiva. Creane una dalla barra laterale.</div>;
  }

  const pct = Math.round((steps.filter(Boolean).length / 7) * 100);
  const upd = (patch: Partial<Commessa>) => aggiornaCommessa(commessa.id, patch);
  const tessuto = TESSUTI_PRG.find((t) => t.sigla === commessa.tessutoPRG);

  const importaJSON = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (typeof data.titolo === 'string') upd(data as Partial<Commessa>);
    } catch {
      // file non valido: ignorato
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">1. Due Diligence &amp; NTA Roma</h1>
        <p className="text-sm text-slate-500 mt-1">Anagrafica, catastale e fattibilità urbanistica secondo le NTA del PRG di Roma Capitale.</p>
      </header>

      {/* Scheda commessa */}
      <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="bg-slate-900 px-6 py-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-sky-400">COMMESSA {commessa.codice}</p>
            <h2 className="text-white text-lg font-semibold mt-0.5">{commessa.titolo}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[12px] text-slate-400">
              <span className="inline-flex items-center gap-1"><Building2 size={12} /> {commessa.indirizzo || 'Indirizzo non impostato'}</span>
              <span className="inline-flex items-center gap-1"><Landmark size={12} /> {commessa.municipio || '—'}</span>
              <span className="inline-flex items-center gap-1">{commessa.tipologia}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {commessa.cartaQualita && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-600/20 text-emerald-300 border border-emerald-600/40 text-xs font-medium px-3 py-1.5 rounded-full">
                <BadgeCheck size={14} /> Carta per la Qualità
              </span>
            )}
            {commessa.vincoloSoprintendenza && (
              <span className="inline-flex items-center gap-1.5 bg-amber-600/20 text-amber-300 border border-amber-600/40 text-xs font-medium px-3 py-1.5 rounded-full">
                <AlertTriangle size={14} /> Vincolo D.Lgs 42/2004 (Soprintendenza)
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setOpenDati(!openDati)}
          className="w-full px-6 py-3 flex items-center gap-2 text-sm font-medium text-slate-700 hover:bg-slate-50 border-b border-slate-200 transition-colors"
        >
          Anagrafica e dati catastali
          <ChevronDown size={16} className={`ml-auto text-slate-400 transition-transform ${openDati ? 'rotate-180' : ''}`} />
        </button>

        {openDati && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Titolo"><input className={inputCls} value={commessa.titolo} onChange={(e) => upd({ titolo: e.target.value })} /></Field>
            <Field label="Indirizzo (Roma)"><input className={inputCls} value={commessa.indirizzo} onChange={(e) => upd({ indirizzo: e.target.value })} placeholder="Via ... , 00184 Roma RM" /></Field>
            <Field label="Municipio">
              <select className={inputCls} value={commessa.municipio} onChange={(e) => upd({ municipio: e.target.value })}>
                {MUNICIPI.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Foglio"><input className={inputCls} value={commessa.foglio} onChange={(e) => upd({ foglio: e.target.value })} /></Field>
            <Field label="Particella"><input className={inputCls} value={commessa.particella} onChange={(e) => upd({ particella: e.target.value })} /></Field>
            <Field label="Subalterno"><input className={inputCls} value={commessa.subalterno} onChange={(e) => upd({ subalterno: e.target.value })} /></Field>
            <Field label="Categoria catastale">
              <select className={inputCls} value={commessa.categoriaCatastale} onChange={(e) => upd({ categoriaCatastale: e.target.value })}>
                {['A/2', 'A/3', 'A/4', 'A/7', 'A/8', 'A/9', 'A/10', 'A/11', 'C/1'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Rendita catastale"><input className={inputCls} value={commessa.rendita} onChange={(e) => upd({ rendita: e.target.value })} placeholder="€ 0.000,00" /></Field>
            <Field label="Tipologia intervento">
              <select className={inputCls} value={commessa.tipologia} onChange={(e) => upd({ tipologia: e.target.value as TipologiaCommessa })}>
                {TIPOLOGIE.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={commessa.cartaQualita} onChange={(e) => upd({ cartaQualita: e.target.checked })} className="w-4 h-4 accent-sky-600" />
              <span className="text-[13px] text-slate-700">Carta per la Qualità</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={commessa.vincoloSoprintendenza} onChange={(e) => upd({ vincoloSoprintendenza: e.target.checked })} className="w-4 h-4 accent-amber-600" />
              <span className="text-[13px] text-slate-700">Vincolo D.Lgs 42/2004 (Soprintendenza)</span>
            </label>
            <div className="flex items-end justify-end">
              <label className="inline-flex items-center gap-2 text-xs text-slate-500 cursor-pointer hover:text-slate-700 transition-colors">
                <Upload size={13} /> Importa dati (.json)
                <input type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importaJSON(f); }} />
              </label>
            </div>
          </div>
        )}
      </section>

      {/* Tessuto PRG */}
      <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-8">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Tessuto urbanistico PRG Roma Capitale</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Tessuto / Zona">
            <select className={inputCls} value={commessa.tessutoPRG} onChange={(e) => upd({ tessutoPRG: e.target.value })}>
              {TESSUTI_PRG.map((t) => <option key={t.sigla}>{t.sigla} — {t.nome}</option>)}
            </select>
          </Field>
          <div className="rounded bg-slate-50 border border-slate-200 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Interventi ammessi</p>
            <div className="flex flex-wrap gap-1.5">
              {(tessuto?.ammessi ?? []).map((a) => (
                <span key={a} className="text-[11px] bg-sky-50 text-sky-800 border border-sky-200 rounded-full px-2.5 py-0.5">{a}</span>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">{tessuto?.note}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {commessa.cartaQualita && (
            <div className="flex items-start gap-2.5 rounded border border-emerald-300 bg-emerald-50 px-3.5 py-2.5">
              <BadgeCheck size={16} className="text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-[12px] text-emerald-800 leading-relaxed">
                <strong>Carta per la Qualità attiva.</strong> L'immobile rientra negli indirizzi di quality shaping di Roma Capitale: sono previsti requisiti di qualità architettonica e ambientale valutabili ai fini del bonus edilizio (es. Verifiche di qualità volontarie, ricomposizione volumetrica, attenzioni al rapporto con il suolo).
              </p>
            </div>
          )}
          {commessa.vincoloSoprintendenza && (
            <div className="flex items-start gap-2.5 rounded border border-amber-300 bg-amber-50 px-3.5 py-2.5">
              <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[12px] text-amber-800 leading-relaxed">
                <strong> Vincolo D.Lgs 42/2004.</strong> L'immobile è sottoposto a vincolo paesaggistico: è obbligatorio acquisire l'autorizzazione della Soprintendenza (autorizzazione paesaggistica ordinaria o semplificata) in procedimento contestato, oltre alle prescrizioni della Sezione Architettura e Belle Arti.
              </p>
            </div>
          )}
          {!commessa.cartaQualita && !commessa.vincoloSoprintendenza && (
            <div className="flex items-start gap-2.5 rounded border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <Info size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <p className="text-[12px] text-slate-600">Nessun alert attivo. Verificare comunque gli adempimenti ordinari (CIPE/asseverazione, asseverazione energetica, L. 132/2025).</p>
            </div>
          )}
        </div>
      </section>

      {/* Avanzamento */}
      <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Avanzamento pratiche</h3>
          <span className="text-2xl font-bold text-sky-700 tabular-nums">{pct}%</span>
        </div>
        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-sky-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">{steps.filter(Boolean).length} di 7 step completati</p>
      </section>

      {/* Checklist 7 step */}
      <section className="space-y-2">
        {STEP_LABELS.map((label, i) => {
          const done = steps[i];
          return (
            <button
              key={i}
              onClick={() => toggleStep(commessa.id, i)}
              className={`w-full text-left flex items-start gap-3 rounded-lg border px-4 py-3.5 transition-all group ${
                done ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 hover:border-sky-400 shadow-sm'
              }`}
            >
              <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500 group-hover:bg-sky-100 group-hover:text-sky-700'
              }`}>{i + 1}</span>
              <span className={`block text-[13px] leading-snug ${done ? 'text-emerald-700 line-through decoration-emerald-400/60' : 'text-slate-600'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </section>
    </div>
  );
}
