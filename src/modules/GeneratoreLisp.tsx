import { useMemo, useState } from 'react';
import { Download, Terminal, Settings2 } from 'lucide-react';
import { useAttiva } from '@/lib/store';

interface Config {
  layerEsistente: string;
  layerDemolizioni: string;
  layerCostruzioni: string;
  layerQuote: string;
  coloreEsistente: number;
  coloreDemolizioni: number;
  coloreCostruzioni: number;
  coloreQuote: number;
  altezzaTesto: number;
  decimaliVirgola: boolean;
}

const DEFAULT: Config = {
  layerEsistente: '01_ESISTENTE_MURI',
  layerDemolizioni: '02_DEMOLIZIONI_GIALLO',
  layerCostruzioni: '03_COSTRUZIONI_ROSSO',
  layerQuote: '04_QUOTE_TESTI',
  coloreEsistente: 7,
  coloreDemolizioni: 2,
  coloreCostruzioni: 1,
  coloreQuote: 3,
  altezzaTesto: 0.2,
  decimaliVirgola: true,
};

function buildLsp(cfg: Config, commessaCode: string): string {
  const fmt = cfg.decimaliVirgola
    ? `;; formattazione italiana: virgola decimale
  (setq str (rtos area 2 2))
  (while (vl-string-search "." str)
    (setq str (vl-string-subst "," "." str))
  )`
    : `(setq str (rtos area 2 2))`;

  return `;;; ============================================================
;;; Roma_DT_Tools.lsp - Layer Gialli/Rossi & Aree Vani
;;; Gestione cantiere: stato di fatto (gialli) vs progetto (rossi)
;;; Commessa: ${commessaCode}
;;; Comandi: SETUPGR | AREAVANO
;;; ============================================================

(defun c:SETUPGR ()
  ;; Creazione layer standard gestionale
  (defun mklay (name aci)
    (if (not (tblsearch "LAYER" name))
      (entmake
        (list
          '(0 . "LAYER") '(100 . "AcDbSymbolTableRecord") '(100 . "AcDbLayerTableRecord")
          (cons 2 name) '(70 . 0) (cons 62 aci) '(6 . "Continuous")
        )
      )
    )
  )
  (mklay "${cfg.layerEsistente}"      ${cfg.coloreEsistente})
  (mklay "${cfg.layerDemolizioni}"  ${cfg.coloreDemolizioni})
  (mklay "${cfg.layerCostruzioni}"   ${cfg.coloreCostruzioni})
  (mklay "${cfg.layerQuote}"         ${cfg.coloreQuote})
  (princ "\\n>> SETUPGR: 4 layer standard creati (Esistente - Demolizioni/Giallo - Costruzioni/Rosso - Quote/Verde).")
  (princ)
)

(defun c:AREAVANO (/ sel ent obj area p10 nome str txtH lay)
  ;; Calcolo area vano e inserimento testo "NOME VANO - XX,XX mq"
  (setq nome (getstring T "\\nNome del vano (es. SOGGIORNO): "))
  (if (= nome "") (setq nome "VANO"))

  (setq sel (entsel "\\nSeleziona una polilinea chiusa del vano (o Invio per punto interno): "))

  (if sel
    (progn
      (setq ent (car sel))
      (if (= (cdr (assoc 0 (entget ent))) "LWPOLYLINE")
        (progn
          (setq obj (vlax-ename->vla-object ent))
          (setq area (vla-get-Area obj))
          (setq p10 (vlax-get obj 'Centroid))
        )
        (progn (princ "\\n>> L'oggetto selezionato non e' una polilinea.") (exit))
      )
    )
    (progn
      (setq p10 (getpoint "\\nClicca un punto interno al vano: "))
      (command "_.BOUNDARY" p10 "")
      (setq ent (entlast))
      (setq obj (vlax-ename->vla-object ent))
      (setq area (vla-get-Area obj))
      (entdel ent) ; cancella il boundary temporaneo
    )
  )

  ${fmt}

  (setq txtH (getvar "TEXTSIZE"))
  (if (<= txtH 0.0) (setq txtH ${cfg.altezzaTesto.toFixed(2)}))
  (setq lay "${cfg.layerQuote}")
  (if (not (tblsearch "LAYER" lay)) (setq lay "0"))

  (entmake
    (list
      '(0 . "TEXT") '(100 . "AcDbEntity") '(100 . "AcDbText")
      (cons 8 lay)
      (cons 10 (list (car p10) (cadr p10) 0.0))
      (cons 40 txtH)
      (cons 1 (strcat (strcase nome) " - " str " mq"))
      '(72 . 1) '(73 . 2)
      (cons 11 (list (car p10) (cadr p10) 0.0))
    )
  )
  (princ "\\n>> AREAVANO: area inserita sul layer ${cfg.layerQuote}.")
  (princ)
)

(princ "\\n>> Roma_DT_Tools.lsp caricato. Comandi disponibili: SETUPGR, AREAVANO.")
(princ)
`;
}

const inputCls =
  'w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-[13px] text-slate-800 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 transition-colors';

export function GeneratoreLisp() {
  const { commessa } = useAttiva();
  const [cfg, setCfg] = useState<Config>(DEFAULT);
  const [showCfg, setShowCfg] = useState(false);
  const code = useMemo(() => buildLsp(cfg, commessa?.codice ?? 'N/D'), [cfg, commessa?.codice]);

  const download = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Roma_DT_Tools.lsp';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const upd = (patch: Partial<Config>) => setCfg((c) => ({ ...c, ...patch }));

  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">3. Automazione CAD (AutoLISP)</h1>
          <p className="text-sm text-slate-500 mt-1">Genera lo script standard per la gestione grafica Gialli (demolizioni) e Rossi (costruzioni).</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCfg(!showCfg)} className="inline-flex items-center gap-2 px-3 py-2 rounded border border-slate-300 bg-white text-[13px] text-slate-700 hover:bg-slate-50 transition-colors">
            <Settings2 size={14} /> Configura
          </button>
          <button onClick={download} className="inline-flex items-center gap-2 px-4 py-2 rounded bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-700 transition-colors">
            <Download size={15} /> Scarica Roma_DT_Tools.lsp
          </button>
        </div>
      </header>

      {showCfg && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {([
            ['layerEsistente', 'Layer esistente', cfg.coloreEsistente, 'coloreEsistente'],
            ['layerDemolizioni', 'Layer demolizioni', cfg.coloreDemolizioni, 'coloreDemolizioni'],
            ['layerCostruzioni', 'Layer costruzioni', cfg.coloreCostruzioni, 'coloreCostruzioni'],
            ['layerQuote', 'Layer quote/testi', cfg.coloreQuote, 'coloreQuote'],
          ] as const).map(([key, label, col, colKey]) => (
            <div key={key} className="space-y-1.5">
              <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</label>
              <input className={inputCls} value={cfg[key]} onChange={(e) => upd({ [key]: e.target.value })} />
              <input type="number" min={1} max={255} className={inputCls} value={col} onChange={(e) => upd({ [colKey]: parseInt(e.target.value) || 1 })} />
            </div>
          ))}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-1">Altezza testo (m)</label>
            <input type="number" min={0.05} step={0.05} className={inputCls} value={cfg.altezzaTesto} onChange={(e) => upd({ altezzaTesto: parseFloat(e.target.value) || 0.2 })} />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none self-end pb-2">
            <input type="checkbox" checked={cfg.decimaliVirgola} onChange={(e) => upd({ decimaliVirgola: e.target.checked })} className="w-4 h-4 accent-sky-600" />
            <span className="text-[13px] text-slate-700">Virgola decimale (it)</span>
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { name: 'SETUPGR', desc: 'Crea i 4 layer standard con colori ACI: esistente (bianco/nero 7), demolizioni (giallo 2), costruzioni (rosso 1), quote e testi (verde 3).' },
          { name: 'AREAVANO', desc: 'Seleziona (o clicca il contorno di) un vano e inserisce il testo "NOME VANO - XX,XX mq" centrato, sul layer quote.' },
          { name: 'Uso', desc: 'Carica il file con APPLOAD in AutoCAD/BricsCAD, digita SETUPGR una volta per disegno e AREAVANO per ogni ambiente.' },
        ].map((c) => (
          <div key={c.name} className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
            <p className="font-mono text-sm font-semibold text-sky-700 flex items-center gap-1.5">
              <Terminal size={14} /> {c.name}
            </p>
            <p className="text-xs text-slate-600 leading-relaxed mt-1.5">{c.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-900">
          <p className="font-mono text-xs text-slate-300">Roma_DT_Tools.lsp</p>
        </div>
        <pre className="p-4 overflow-auto text-[12px] leading-relaxed font-mono text-slate-800 bg-slate-50 max-h-[520px]">
          {code}
        </pre>
      </div>
    </div>
  );
}
