import { useEffect, useRef, useState } from 'react';
import {
  FolderArchive,
  Upload,
  FileText,
  Trash2,
  Download,
  Eye,
  Tag,
  Search,
} from 'lucide-react';
import { useAttiva } from '@/lib/store';

export type CategoriaDocumento =
  | 'Catasto & Planimetrie'
  | 'Stato Legittimo & Titoli'
  | 'Elaborati Grafici (DWG/PDF)'
  | 'Verifiche RAI & Impianti'
  | 'Computo & Preventivi'
  | 'Pratica SUET & Asseverazioni'
  | 'Altro';

interface DocumentoArchivio {
  id: string;
  nome: string;
  categoria: CategoriaDocumento;
  dimensione: number;
  tipoMime: string;
  dataCaricamento: string;
  note: string;
  dataUrl?: string;
}

const CATEGORIE: CategoriaDocumento[] = [
  'Catasto & Planimetrie',
  'Stato Legittimo & Titoli',
  'Elaborati Grafici (DWG/PDF)',
  'Verifiche RAI & Impianti',
  'Computo & Preventivi',
  'Pratica SUET & Asseverazioni',
  'Altro',
];

const DOCUMENTI_INIZIALI: DocumentoArchivio[] = [
  {
    id: 'doc-init-1',
    nome: 'Visura_Catastale_Storica.pdf',
    categoria: 'Catasto & Planimetrie',
    dimensione: 248320,
    tipoMime: 'application/pdf',
    dataCaricamento: '2026-11-20',
    note: 'Visura storica per immobile — controllo intestatari e dati censuari',
  },
  {
    id: 'doc-init-2',
    nome: 'Planimetria_Catastale_Rassegna.pdf',
    categoria: 'Catasto & Planimetrie',
    dimensione: 412600,
    tipoMime: 'application/pdf',
    dataCaricamento: '2026-11-20',
    note: 'Planimetria depositata in atti — riscontro stato legittimo',
  },
];

function loadDocsForCommessa(commessaId: string): DocumentoArchivio[] {
  try {
    const raw = window.localStorage.getItem(`my-archinext-docs-${commessaId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Fallback
  }
  return DOCUMENTI_INIZIALI;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function CassettoDocumentale() {
  const { commessa } = useAttiva();
  const commessaId = commessa?.id ?? 'default';

  const [documenti, setDocumenti] = useState<DocumentoArchivio[]>(() =>
    loadDocsForCommessa(commessaId)
  );
  const [categoriaSelezionata, setCategoriaSelezionata] =
    useState<CategoriaDocumento>('Catasto & Planimetrie');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TUTTE');
  const [ricerca, setRicerca] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [erroreStorage, setErroreStorage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDocumenti(loadDocsForCommessa(commessaId));
    setErroreStorage(null);
  }, [commessaId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `my-archinext-docs-${commessaId}`,
        JSON.stringify(documenti)
      );
      setErroreStorage(null);
    } catch {
      setErroreStorage(
        'Spazio locale browser pieno: i file più pesanti restano disponibili in questa sessione.'
      );
    }
  }, [commessaId, documenti]);

  if (!commessa) {
    return <div className="p-10 text-zinc-600">Nessuna commessa attiva.</div>;
  }

  const processFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : undefined;
        const safeDataUrl = file.size <= 2.5 * 1024 * 1024 ? result : undefined;

        const nuovoDoc: DocumentoArchivio = {
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          nome: file.name,
          categoria: categoriaSelezionata,
          dimensione: file.size,
          tipoMime: file.type || 'application/octet-stream',
          dataCaricamento: new Date().toISOString().slice(0, 10),
          note:
            file.size > 2.5 * 1024 * 1024
              ? 'File > 2,5 MB: indicizzato nel fascicolo (ricaricare per download diretto)'
              : '',
          dataUrl: safeDataUrl,
        };

        setDocumenti((prev) => [nuovoDoc, ...prev]);
      };
      reader.readAsDataURL(file);
    });
  };

  const aggiornaDoc = (id: string, patch: Partial<DocumentoArchivio>) => {
    setDocumenti((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const rimuoviDoc = (id: string) => {
    setDocumenti((prev) => prev.filter((d) => d.id !== id));
  };

  const documentiFiltrati = documenti.filter((d) => {
    const matchCat = filtroCategoria === 'TUTTE' || d.categoria === filtroCategoria;
    const q = ricerca.trim().toLowerCase();
    const matchText =
      !q ||
      d.nome.toLowerCase().includes(q) ||
      d.note.toLowerCase().includes(q) ||
      d.categoria.toLowerCase().includes(q);
    return matchCat && matchText;
  });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
            Cassetto Documentale Commessa
          </h1>
          <p className="text-xs sm:text-sm text-zinc-700 mt-0.5">
            Fascicolo digitale, visure, planimetrie, titoli legittimanti ed elaborati SUET. Commessa:{' '}
            <strong className="text-zinc-950">{commessa.codice}</strong>
          </p>
        </div>

        <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white border border-zinc-300 text-zinc-900 font-semibold">
          {documenti.length} documenti in fascicolo
        </span>
      </header>

      <section className="rounded-xl bg-white border border-zinc-300 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Upload size={15} className="text-zinc-800" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-900">
              Carica Documenti nel Fascicolo
            </h2>
          </div>

          <label className="inline-flex items-center gap-2 text-xs">
            <span className="font-semibold text-zinc-700">Categoria destinazione:</span>
            <select
              value={categoriaSelezionata}
              onChange={(e) => setCategoriaSelezionata(e.target.value as CategoriaDocumento)}
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-zinc-950 focus:outline-none focus:border-zinc-950"
            >
              {CATEGORIE.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            processFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            isDragging
              ? 'border-zinc-950 bg-zinc-100'
              : 'border-zinc-300 bg-zinc-50 hover:border-zinc-950 hover:bg-zinc-100/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              processFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <FolderArchive size={24} className="mx-auto text-zinc-700 mb-2" />
          <p className="text-xs font-semibold text-zinc-950">
            Trascina qui i file della commessa oppure clicca per selezionarli
          </p>
          <p className="text-[11px] text-zinc-600 mt-1 font-mono">
            PDF, DWG, DXF, XLSX, DOCX, JPG/PNG · Archiviazione associata a {commessa.codice}
          </p>
        </div>

        {erroreStorage && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
            {erroreStorage}
          </p>
        )}
      </section>

      <section className="rounded-xl bg-white border border-zinc-300 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 pb-3">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="text"
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              placeholder="Cerca per nome file, nota o categoria..."
              className="w-full rounded-lg border border-zinc-300 bg-white pl-8 pr-3 py-1.5 text-xs text-zinc-950 focus:outline-none focus:border-zinc-950"
            />
          </div>

          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-950 focus:outline-none focus:border-zinc-950"
          >
            <option value="TUTTE">Tutte le categorie ({documenti.length})</option>
            {CATEGORIE.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {documentiFiltrati.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            Nessun documento trovato per i filtri selezionati.
          </div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {documentiFiltrati.map((doc) => (
              <div
                key={doc.id}
                className="py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <FileText size={16} className="text-zinc-700 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-zinc-950 truncate">{doc.nome}</span>
                      <span className="font-mono text-[10px] text-zinc-500 tabular-nums">
                        {formatBytes(doc.dimensione)} · {doc.dataCaricamento}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded bg-zinc-100 border border-zinc-300 px-1.5 py-0.5 text-[10px] font-mono text-zinc-800">
                        <Tag size={10} />
                        <select
                          value={doc.categoria}
                          onChange={(e) =>
                            aggiornaDoc(doc.id, {
                              categoria: e.target.value as CategoriaDocumento,
                            })
                          }
                          className="bg-transparent focus:outline-none"
                        >
                          {CATEGORIE.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </span>

                      <input
                        type="text"
                        value={doc.note}
                        onChange={(e) => aggiornaDoc(doc.id, { note: e.target.value })}
                        placeholder="Aggiungi nota / protocollo..."
                        className="flex-1 min-w-[180px] bg-transparent text-[11px] text-zinc-700 placeholder:text-zinc-400 focus:bg-zinc-50 focus:outline-none rounded px-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 shrink-0">
                  {doc.dataUrl && (
                    <>
                      <a
                        href={doc.dataUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Anteprima"
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-900 hover:border-zinc-950"
                      >
                        <Eye size={12} />
                        <span>Apri</span>
                      </a>
                      <a
                        href={doc.dataUrl}
                        download={doc.nome}
                        title="Scarica file"
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-900 hover:border-zinc-950"
                      >
                        <Download size={12} />
                        <span>Scarica</span>
                      </a>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => rimuoviDoc(doc.id)}
                    title="Elimina documento"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}