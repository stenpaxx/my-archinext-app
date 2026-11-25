import {
  LayoutList, Grid2x2, Code2, Plug, Calculator, FileText,
  FolderKanban, Plus, Trash2, Check, ChevronDown, FileUp, X, BookOpen,
} from 'lucide-react';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import type { Commessa, Vano, VoceComputo } from '@/lib/types';

export type SectionId = 'due-diligence' | 'rai' | 'lisp' | 'impianti' | 'computo' | 'atti';

export const SECTIONS: { id: SectionId; label: string; icon: typeof LayoutList }[] = [
  { id: 'due-diligence', label: '1. Due Diligence & NTA Roma', icon: LayoutList },
  { id: 'rai', label: '2. Audit Distributivo & RAI', icon: Grid2x2 },
  { id: 'lisp', label: '3. Automazione CAD (AutoLISP)', icon: Code2 },
  { id: 'impianti', label: '4. Impianti (CEI 64-8 & Idrico)', icon: Plug },
  { id: 'computo', label: '5. Abachi & Computo (Lazio + Excel)', icon: Calculator },
  { id: 'atti', label: '6. Atti SUET, FIR & L.132/2025', icon: FileText },
];

const EMPTY_STEPS: boolean[] = [false, false, false, false, false, false, false];

interface Props {
  section: SectionId;
  onChange: (s: SectionId) => void;
  onOpenCatalogo: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

function parseSynapsPayload(raw: string): {
  commessaPatch?: Partial<Commessa>;
  vani?: Omit<Vano, 'id'>[];
  voci?: Omit<VoceComputo, 'id'>[];
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { error: 'Incolla o carica un output di Synaps.app prima di procedere.' };

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const source = Array.isArray(parsed) ? { vani: parsed } : parsed;

      const commessaPatch: Partial<Commessa> = {};
      if (typeof source.titolo === 'string') commessaPatch.titolo = source.titolo;
      if (typeof source.indirizzo === 'string') commessaPatch.indirizzo = source.indirizzo;
      if (typeof source.municipio === 'string') commessaPatch.municipio = source.municipio;
      if (typeof source.foglio === 'string') commessaPatch.foglio = source.foglio;
      if (typeof source.particella === 'string') commessaPatch.particella = source.particella;
      if (typeof source.subalterno === 'string') commessaPatch.subalterno = source.subalterno;
      if (typeof source.tessutoPRG === 'string') commessaPatch.tessutoPRG = source.tessutoPRG;

      const rawVani = Array.isArray(source.vani)
        ? source.vani
        : Array.isArray(source.ambienti)
          ? source.ambienti
          : Array.isArray(source.rooms)
            ? source.rooms
            : [];

      const vani: Omit<Vano, 'id'>[] = rawVani.map((item: Record<string, unknown>, idx: number) => ({
        nome: String(item.nome ?? item.name ?? item.ambiente ?? `Vano ${idx + 1}`),
        destinazione: String(item.destinazione ?? item.uso ?? 'Soggiorno'),
        superficie: Number(item.superficie ?? item.mq ?? item.area ?? 0) || 0,
        superfFinestrata: Number(item.superfFinestrata ?? item.finestra ?? item.aeroilluminante ?? 0) || 0,
        altezzaMedia: Number(item.altezzaMedia ?? item.altezza ?? item.h ?? 2.7) || 2.7,
        vmc: Boolean(item.vmc ?? false),
      }));

      const rawVoci = Array.isArray(source.voci)
        ? source.voci
        : Array.isArray(source.computo)
          ? source.computo
          : [];

      const voci: Omit<VoceComputo, 'id'>[] = rawVoci.map((item: Record<string, unknown>, idx: number) => ({
        codicePrezzario: String(item.codicePrezzario ?? item.codice ?? `SYN-${String(idx + 1).padStart(2, '0')}`),
        wbs: String(item.wbs ?? item.categoria ?? 'Synaps'),
        descrizione: String(item.descrizione ?? item.voce ?? 'Voce da Synaps.app'),
        um: String(item.um ?? item.unitaMisura ?? 'mq'),
        quantita: Number(item.quantita ?? item.qta ?? 0) || 0,
        prezzoUnitario: Number(item.prezzoUnitario ?? item.prezzo ?? 0) || 0,
        oneriSicurezza: Boolean(item.oneriSicurezza ?? false),
      }));

      return { commessaPatch, vani, voci };
    } catch {
      return { error: 'JSON non valido: controlla la sintassi dell’esportazione Synaps.app.' };
    }
  }

  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length > 0) {
    const sep = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';
    const vani: Omit<Vano, 'id'>[] = [];
    for (const line of lines) {
      const cols = line.split(sep).map((c) => c.trim());
      if (cols.length >= 2 && !Number.isNaN(Number(cols[2]?.replace(',', '.')))) {
        vani.push({
          nome: cols[0] || `Vano ${vani.length + 1}`,
          destinazione: cols[1] || 'Soggiorno',
          superficie: Number((cols[2] || '0').replace(',', '.')) || 0,
          superfFinestrata: Number((cols[3] || '0').replace(',', '.')) || 0,
          altezzaMedia: Number((cols[4] || '2.7').replace(',', '.')) || 2.7,
          vmc: false,
        });
      }
    }
    if (vani.length > 0) {
      return { vani };
    }
  }

  return {
    error: 'Formato non riconosciuto. Usa JSON (con "vani"/"voci") oppure righe CSV/TSV con superficie numerica.',
  };
}

export function Sidebar({
  section,
  onChange,
  onOpenCatalogo,
  mobileOpen = false,
  onCloseMobile,
}: Props) {
  const commesse = useStore((s) => s.commesse);
  const attivaId = useStore((s) => s.attivaId);
  const setAttiva = useStore((s) => s.setAttiva);
  const creaCommessa = useStore((s) => s.creaCommessa);
  const eliminaCommessa = useStore((s) => s.eliminaCommessa);
  const aggiornaCommessa = useStore((s) => s.aggiornaCommessa);
  const steps = useStore((s) => (s.attivaId ? s.steps[s.attivaId] ?? EMPTY_STEPS : EMPTY_STEPS));
  const [open, setOpen] = useState(false);
  const [synapsOpen, setSynapsOpen] = useState(false);
  const [synapsInput, setSynapsInput] = useState('');
  const [synapsFeedback, setSynapsFeedback] = useState<string | null>(null);

  const attiva = commesse.find((c) => c.id === attivaId);
  const pct = Math.round((steps.filter(Boolean).length / 7) * 100);

  const handleSelectSection = (id: SectionId) => {
    onChange(id);
    onCloseMobile?.();
  };

  const handleNew = () => {
    const n = commesse.length + 1;
    creaCommessa({
      codice: `${new Date().getFullYear()}-${String(n).padStart(3, '0')}`,
      titolo: 'Nuova commessa',
      indirizzo: '',
      municipio: 'Municipio I',
      foglio: '',
      particella: '',
      subalterno: '',
      categoriaCatastale: 'A/2',
      rendita: '',
      tipologia: 'Manutenzione Straordinaria CILA',
      tessutoPRG: 'T1',
      cartaQualita: false,
      vincoloSoprintendenza: false,
    });
    setOpen(false);
    onCloseMobile?.();
  };

  const handleSynapsFile = async (file: File) => {
    const text = await file.text();
    setSynapsInput(text);
    setSynapsFeedback(null);
  };

  const handleApplySynaps = () => {
    if (!attivaId) {
      setSynapsFeedback('Crea o seleziona prima una commessa attiva.');
      return;
    }
    const res = parseSynapsPayload(synapsInput);
    if (res.error) {
      setSynapsFeedback(res.error);
      return;
    }

    if (res.commessaPatch && Object.keys(res.commessaPatch).length > 0) {
      aggiornaCommessa(attivaId, res.commessaPatch);
    }

    useStore.setState((prev) => {
      const existingVani = prev.vani[attivaId] ?? [];
      const existingVoci = prev.voci[attivaId] ?? [];
      const nextVani =
        res.vani && res.vani.length > 0
          ? [
              ...existingVani,
              ...res.vani.map((v, i) => ({
                ...v,
                id: `${attivaId}-syn-v-${Date.now()}-${i}`,
              })),
            ]
          : existingVani;

      const nextVoci =
        res.voci && res.voci.length > 0
          ? [
              ...existingVoci,
              ...res.voci.map((vc, i) => ({
                ...vc,
                id: `${attivaId}-syn-c-${Date.now()}-${i}`,
              })),
            ]
          : existingVoci;

      return {
        vani: { ...prev.vani, [attivaId]: nextVani },
        voci: { ...prev.voci, [attivaId]: nextVoci },
      };
    });

    const nVani = res.vani?.length ?? 0;
    const nVoci = res.voci?.length ?? 0;
    setSynapsFeedback(`Importati ${nVani} vani e ${nVoci} voci nella commessa attiva.`);
    setTimeout(() => {
      setSynapsOpen(false);
      setSynapsFeedback(null);
    }, 1100);
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={() => onCloseMobile?.()}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 shrink-0 h-dvh lg:h-screen lg:sticky lg:top-0 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-5 py-4 lg:py-5 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded bg-sky-600 flex items-center justify-center shrink-0">
              <FolderKanban size={18} className="text-white" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-white text-sm font-semibold truncate">My Archinext</p>
              <p className="text-[11px] text-slate-500 truncate">Assistente Tecnico Generativo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onCloseMobile?.()}
            aria-label="Chiudi menu"
            className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-4 border-b border-slate-800 relative">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Commessa Attiva</p>
            <button
              type="button"
              onClick={handleNew}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-400 hover:text-sky-300 transition-colors"
            >
              <Plus size={12} /> Nuova commessa
            </button>
          </div>

          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="w-full text-left bg-slate-800/70 hover:bg-slate-800 rounded px-3 py-2.5 flex items-center justify-between gap-2 transition-colors"
          >
            <span className="min-w-0">
              <span className="block text-xs font-mono text-sky-400">{attiva?.codice ?? '—'}</span>
              <span className="block text-[13px] text-white truncate">{attiva?.titolo ?? 'Nessuna'}</span>
            </span>
            <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute left-4 right-4 mt-1 bg-slate-800 border border-slate-700 rounded shadow-xl z-20 py-1 max-h-72 overflow-y-auto">
              {commesse.map((c) => {
                const st = useStore.getState().steps[c.id] ?? EMPTY_STEPS;
                const p = Math.round((st.filter(Boolean).length / 7) * 100);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setAttiva(c.id); setOpen(false); onCloseMobile?.(); }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-700/70 flex items-center justify-between gap-2 group"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-mono text-sky-400">{c.codice}</span>
                      <span className="block text-[13px] text-slate-200 truncate">{c.titolo}</span>
                      <span className="block mt-1 h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                        <span className="block h-full bg-sky-500" style={{ width: `${p}%` }} />
                      </span>
                    </span>
                    {c.id === attivaId ? (
                      <Check size={14} className="shrink-0 text-emerald-400" />
                    ) : (
                      <Trash2
                        size={13}
                        className="shrink-0 text-slate-600 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Eliminare la commessa "${c.codice}"?`)) eliminaCommessa(c.id);
                        }}
                      />
                    )}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={handleNew}
                className="w-full text-left px-3 py-2.5 text-[13px] text-sky-400 hover:bg-slate-700/70 flex items-center gap-2 border-t border-slate-700 mt-1"
              >
                <Plus size={14} /> Nuova commessa
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => { setSynapsFeedback(null); setSynapsOpen(true); }}
            className="mt-2.5 w-full py-1.5 px-3 rounded border border-slate-700 hover:border-sky-500/60 bg-slate-800/40 hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
          >
            <FileUp size={13} className="text-sky-400" />
            <span>Importa output Synaps.app</span>
          </button>

          <button
            type="button"
            onClick={() => { onOpenCatalogo(); onCloseMobile?.(); }}
            className="mt-2 w-full py-1.5 px-3 rounded border border-slate-700 hover:border-emerald-500/60 bg-slate-800/40 hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
          >
            <BookOpen size={13} className="text-emerald-400" />
            <span>Cassetto Documentale</span>
          </button>
        </div>

        <div className="px-4 py-3 border-b border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span>Avanzamento 7 Step</span>
            <span className="font-mono text-sky-400">{pct}%</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleSelectSection(id)}
              className={`w-full text-left pl-5 pr-4 py-3 flex items-center gap-3 text-[13px] leading-snug transition-colors border-l-2 ${
                section === id
                  ? 'bg-slate-800 text-white border-sky-500'
                  : 'border-transparent hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Icon size={16} className={section === id ? 'text-sky-400' : 'text-slate-500'} />
              <span className="flex-1">{label}</span>
            </button>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-slate-800">
          <p className="text-[10px] text-slate-600 leading-relaxed">
            Strumento di supporto tecnico. Verificare sempre la normativa vigente e i requisiti del Regolamento Edilizio di Roma Capitale.
          </p>
        </div>
      </aside>

      {synapsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white text-slate-900 rounded-xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90dvh] flex flex-col">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileUp size={16} className="text-sky-400" />
                <h2 className="text-sm font-semibold">Importa Output Synaps.app (Esperimenti)</h2>
              </div>
              <button
                type="button"
                onClick={() => setSynapsOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <span>
                  Commessa di destinazione: <strong className="text-slate-900">{attiva?.codice} — {attiva?.titolo}</strong>
                </span>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium cursor-pointer transition-colors">
                  <FileUp size={13} /> Carica file (.json / .csv / .txt)
                  <input
                    type="file"
                    accept=".json,.csv,.tsv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleSynapsFile(f);
                    }}
                  />
                </label>
              </div>

              <textarea
                rows={8}
                value={synapsInput}
                onChange={(e) => setSynapsInput(e.target.value)}
                placeholder={'Incolla qui l’output di Synaps.app (JSON con "vani"/"voci" oppure CSV: Nome;Destinazione;Superficie;Finestra;Altezza)...'}
                className="w-full font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg p-3 focus:outline-none focus:border-sky-600"
              />

              {synapsFeedback && (
                <div className="text-xs px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-800">
                  {synapsFeedback}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSynapsOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Chiudi
                </button>
                <button
                  type="button"
                  onClick={handleApplySynaps}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white transition-colors"
                >
                  Carica nella commessa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}