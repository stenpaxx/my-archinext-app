import {
  LayoutList, Grid2x2, Code2, Plug, Calculator, FileText,
  FolderKanban, Plus, Trash2, Check, ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { STEP_LABELS } from '@/lib/types';

export type SectionId = 'due-diligence' | 'rai' | 'lisp' | 'impianti' | 'computo' | 'atti';

export const SECTIONS: { id: SectionId; label: string; icon: typeof LayoutList }[] = [
  { id: 'due-diligence', label: '1. Due Diligence & NTA Roma', icon: LayoutList },
  { id: 'rai', label: '2. Audit Distributivo & RAI', icon: Grid2x2 },
  { id: 'lisp', label: '3. Automazione CAD (AutoLISP)', icon: Code2 },
  { id: 'impianti', label: '4. Impianti (CEI 64-8 & Idrico)', icon: Plug },
  { id: 'computo', label: '5. Abachi & Computo (Lazio + Excel)', icon: Calculator },
  { id: 'atti', label: '6. Atti SUET, FIR & L.132/2025', icon: FileText },
];

interface Props {
  section: SectionId;
  onChange: (s: SectionId) => void;
}

export function Sidebar({ section, onChange }: Props) {
  const commesse = useStore((s) => s.commesse);
  const attivaId = useStore((s) => s.attivaId);
  const setAttiva = useStore((s) => s.setAttiva);
  const creaCommessa = useStore((s) => s.creaCommessa);
  const eliminaCommessa = useStore((s) => s.eliminaCommessa);
  const steps = useStore((s) => s.steps[s.attivaId ?? ''] ?? Array(7).fill(false));
  const [open, setOpen] = useState(false);
  const attiva = commesse.find((c) => c.id === attivaId);
  const pct = Math.round((steps.filter(Boolean).length / 7) * 100);

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
      tessutoPRG: 'T1 (Città Storica)',
      cartaQualita: false,
      vincoloSoprintendenza: false,
    });
    setOpen(false);
  };

  return (
    <aside className="w-72 shrink-0 h-screen sticky top-0 bg-slate-900 text-slate-300 flex flex-col">
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded bg-sky-600 flex items-center justify-center shrink-0">
            <FolderKanban size={18} className="text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-white text-sm font-semibold">My Archinext</p>
            <p className="text-[11px] text-slate-500">Assistente Tecnico Generativo</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-slate-800 relative">
        <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2 px-1">Commessa Attiva</p>
        <button
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
          <div className="absolute left-4 right-4 mt-1 bg-slate-800 border border-slate-700 rounded shadow-xl z-20 py-1">
            {commesse.map((c) => {
              const st = useStore.getState().steps[c.id] ?? Array(7).fill(false);
              const p = Math.round((st.filter(Boolean).length / 7) * 100);
              return (
                <button
                  key={c.id}
                  onClick={() => { setAttiva(c.id); setOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-700/70 flex items-center justify-between gap-2 group"
                >
                  <span className="min-w-0">
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
              onClick={handleNew}
              className="w-full text-left px-3 py-2.5 text-[13px] text-sky-400 hover:bg-slate-700/70 flex items-center gap-2 border-t border-slate-700 mt-1"
            >
              <Plus size={14} /> Nuova commessa
            </button>
          </div>
        )}
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
            onClick={() => onChange(id)}
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
  );
}
