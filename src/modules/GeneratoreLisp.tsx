import { useMemo, useState } from 'react';
import { Copy, Check, Download, SlidersHorizontal, Terminal } from 'lucide-react';
import { useStore, useAttiva } from '@/lib/store';

export function GeneratoreLisp() {
  const { commessa } = useAttiva();
  const vani = useStore((s) => (commessa ? s.vani?.[commessa.id] ?? [] : []));

  const [layerEsistente, setLayerEsistente] = useState('01_ESISTENTE_MURI');
  const [layerGialli, setLayerGialli] = useState('02_DEMOLIZIONI_GIALLO');
  const [layerRossi, setLayerRossi] = useState('03_COSTRUZIONI_ROSSO');
  const [layerQuote, setLayerQuote] = useState('04_QUOTE_TESTI');
  const [showConfig, setShowConfig] = useState(false);
  const [copied, setCopied] = useState(false);

  const codiceCommessa = commessa?.codice ?? '2026-014';
  const titoloCommessa = commessa?.titolo ?? 'Commessa Roma Capitale';

  const lispCode = useMemo(() => {
    const vaniComment =
      vani.length > 0
        ? vani
            .map(
              (v) =>
                `;;;   - ${v.nome}: ${(Number(v.superficie) || 0).toFixed(2)} mq (${v.destinazione})`
            )
            .join('\n')
        : ';;;   - Nessun vano censito';

    return `;;; =====================================================================
;;; Roma_DT_Tools.lsp - Layer Gialli/Rossi & Aree Vani
;;; Gestione cantiere: stato di fatto (gialli) vs progetto (rossi)
;;; Commessa: ${codiceCommessa} - ${titoloCommessa}
;;; Vani censiti:
${vaniComment}
;;; Comandi: SETUPGR | AREAVANO
;;; =====================================================================

(defun c:SETUPGR ( / mklay )
  (vl-load-com)
  (defun mklay ( name aci )
    (if (not (tblsearch "LAYER" name))
      (entmake
        (list
          '(0 . "LAYER")
          '(100 . "AcDbSymbolTableRecord")
          '(100 . "AcDbLayerTableRecord")
          (cons 2 name)
          '(70 . 0)
          (cons 62 aci)
          '(6 . "Continuous")
        )
      )
    )
  )
  (mklay "${layerEsistente}" 7)
  (mklay "${layerGialli}"    2)
  (mklay "${layerRossi}"     1)
  (mklay "${layerQuote}"     3)
  (princ "\\n>> SETUPGR: layer configurati per commessa ${codiceCommessa}.")
  (princ)
)

(defun c:AREAVANO ( / ent obj area nome txt pt )
  (vl-load-com)
  (setq ent (entsel "\\nSeleziona contorno chiuso del vano: "))
  (if ent
    (progn
      (setq obj (vlax-ename->vla-object (car ent)))
      (if (vlax-property-available-p obj 'Area)
        (progn
          (setq area (vla-get-Area obj))
          (setq nome (getstring T "\\nNome vano [es. SOGGIORNO]: "))
          (if (= nome "") (setq nome "VANO"))
          (setq pt (getpoint "\\nPunto inserimento etichetta: "))
          (if pt
            (progn
              (setq txt (strcat nome " - " (rtos area 2 2) " mq"))
              (entmake
                (list
                  '(0 . "TEXT")
                  (cons 8 "${layerQuote}")
                  (cons 10 pt)
                  (cons 11 pt)
                  '(40 . 0.18)
                  (cons 1 txt)
                )
              )
            )
          )
        )
        (princ "\\nL'entita selezionata non ha proprieta Area.")
      )
    )
  )
  (princ)
)

(princ "\\nCaricato Roma_DT_Tools.lsp. Digita SETUPGR o AREAVANO.")
(princ)
`;
  }, [codiceCommessa, titoloCommessa, vani, layerEsistente, layerGialli, layerRossi, layerQuote]);

  if (!commessa) {
    return <div className="p-10 text-zinc-600">Nessuna commessa attiva.</div>;
  }

  const handleCopy = async () => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(lispCode).catch(() => {});
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([lispCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Roma_DT_Tools.lsp';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
            AutoLISP CAD · Gialli e Rossi
          </h1>
          <p className="text-xs sm:text-sm text-zinc-700 mt-0.5">
            Genera lo script standard per la gestione grafica Gialli (demolizioni) e Rossi (costruzioni).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowConfig((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:border-zinc-950 transition-colors"
          >
            <SlidersHorizontal size={13} />
            <span>Configura</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:border-zinc-950 transition-colors"
          >
            {copied ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
            <span>{copied ? 'Copiato' : 'Copia'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors"
          >
            <Download size={13} />
            <span>Scarica Roma_DT_Tools.lsp</span>
          </button>
        </div>
      </header>

      {showConfig && (
        <section className="rounded-xl bg-white border border-zinc-300 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <label className="block">
            <span className="block font-semibold text-zinc-700 mb-1">Layer Esistente (ACI 7)</span>
            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 font-mono text-zinc-950 focus:outline-none focus:border-zinc-950"
              value={layerEsistente}
              onChange={(e) => setLayerEsistente(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="block font-semibold text-zinc-700 mb-1">Layer Gialli (ACI 2)</span>
            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 font-mono text-zinc-950 focus:outline-none focus:border-zinc-950"
              value={layerGialli}
              onChange={(e) => setLayerGialli(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="block font-semibold text-zinc-700 mb-1">Layer Rossi (ACI 1)</span>
            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 font-mono text-zinc-950 focus:outline-none focus:border-zinc-950"
              value={layerRossi}
              onChange={(e) => setLayerRossi(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="block font-semibold text-zinc-700 mb-1">Layer Quote (ACI 3)</span>
            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 font-mono text-zinc-950 focus:outline-none focus:border-zinc-950"
              value={layerQuote}
              onChange={(e) => setLayerQuote(e.target.value)}
            />
          </label>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl bg-white border border-zinc-300 p-4">
          <p className="font-mono text-xs font-bold text-zinc-950">&gt;_ SETUPGR</p>
          <p className="text-xs text-zinc-700 mt-1.5 leading-relaxed">
            Crea i 4 layer standard con colori ACI: esistente (bianco/nero 7), demolizioni (giallo 2), costruzioni (rosso 1), quote e testi (verde 3).
          </p>
        </div>
        <div className="rounded-xl bg-white border border-zinc-300 p-4">
          <p className="font-mono text-xs font-bold text-zinc-950">&gt;_ AREAVANO</p>
          <p className="text-xs text-zinc-700 mt-1.5 leading-relaxed">
            Seleziona il contorno chiuso di un vano e inserisce l&apos;etichetta con superficie in mq sul layer delle quote.
          </p>
        </div>
        <div className="rounded-xl bg-white border border-zinc-300 p-4">
          <p className="font-mono text-xs font-bold text-zinc-950">&gt;_ Uso</p>
          <p className="text-xs text-zinc-700 mt-1.5 leading-relaxed">
            Carica il file con APPLOAD in AutoCAD/BricsCAD, digita SETUPGR una volta per disegno e AREAVANO per ogni vano.
          </p>
        </div>
      </div>

      <section className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-xs">
        <div className="px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-300">
          <span className="inline-flex items-center gap-2">
            <Terminal size={13} className="text-zinc-400" />
            Roma_DT_Tools.lsp
          </span>
          <span className="text-[11px] text-zinc-400">AutoLISP</span>
        </div>
        <pre className="p-4 text-xs font-mono text-zinc-100 overflow-x-auto leading-relaxed max-h-[420px]">
          {lispCode}
        </pre>
      </section>
    </div>
  );
}