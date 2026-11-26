import { useState } from 'react';
import {
  BookOpen,
  Plus,
  CheckCircle2,
  Circle,
  FolderKanban,
  FileText,
  Trash2,
  X,
  Upload,
  Download,
} from 'lucide-react';
import { useStore, type DocumentoCommessa } from '@/lib/store';
import { STEP_LABELS } from '@/lib/types';

export interface SidebarProps {
  section?: unknown;
  onChange?: unknown;
  onOpenCatalogo?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const DOC_ACCEPT =
  '.dwg,.dxf,.ifc,.pdf,.xlsx,.xls,.docx,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg';

const EMPTY_STEPS: boolean[] = [false, false, false, false, false, false, false];
const EMPTY_DOCS: DocumentoCommessa[] = [];

const IDB_NAME = 'my_archinext_docs_db';
const IDB_VERSION = 1;
const IDB_STORE = 'documenti_binari';

function openDocsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB non disponibile'));
      return;
    }

    const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Errore apertura IndexedDB'));
  });
}

async function salvaFileBinario(id: string, file: File): Promise<void> {
  const db = await openDocsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put({
      id,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      blob: file,
    });

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Errore salvataggio file su IndexedDB'));
    };
  });
}

async function leggiFileBinario(
  id: string
): Promise<{ blob: Blob; name: string; mimeType: string } | null> {
  try {
    const db = await openDocsDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(id);

      req.onsuccess = () => {
        const res = req.result as
          | { id: string; name: string; mimeType: string; blob: Blob }
          | undefined;
        db.close();
        if (res && res.blob) {
          resolve({ blob: res.blob, name: res.name, mimeType: res.mimeType });
        } else {
          resolve(null);
        }
      };

      req.onerror = () => {
        db.close();
        reject(req.error ?? new Error('Errore lettura file da IndexedDB'));
      };
    });
  } catch {
    return null;
  }
}

async function eliminaFileBinario(id: string): Promise<void> {
  try {
    const db = await openDocsDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.delete(id);

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error ?? new Error('Errore eliminazione file da IndexedDB'));
      };
    });
  } catch {
    // ignora errori se il record non esiste
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function inferCategoria(fileName: string): DocumentoCommessa['categoria'] {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (['dwg', 'dxf', 'ifc'].includes(ext)) return 'Elaborati CAD / BIM';
  if (['xlsx', 'xls', 'docx'].includes(ext)) return 'Relazioni / Computi';
  if (ext === 'pdf') return 'Catasto / Titoli';
  return 'Altro';
}

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const commesse = useStore((s) => s.commesse);
  const attivaId = useStore((s) => s.attivaId);
  const setAttiva = useStore((s) => s.setAttiva);
  const creaCommessa = useStore((s) => s.creaCommessa);
  const steps = useStore((s) => (attivaId ? s.steps[attivaId] ?? EMPTY_STEPS : EMPTY_STEPS));
  const toggleStep = useStore((s) => s.toggleStep);

  const documenti = useStore((s) =>
    attivaId ? s.documenti?.[attivaId] ?? EMPTY_DOCS : EMPTY_DOCS
  );
  const aggiungiDocumenti = useStore((s) => s.aggiungiDocumenti);
  const rimuoviDocumento = useStore((s) => s.rimuoviDocumento);

  const [cassettoModalOpen, setCassettoModalOpen] = useState(false);
  const [categoriaUpload, setCategoriaUpload] =
    useState<DocumentoCommessa['categoria']>('Catasto / Titoli');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('Tutte');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const commessaAttiva = commesse.find((c) => c.id === attivaId) ?? commesse[0];
  const currentId = commessaAttiva?.id ?? '';
  const pct = Math.round((steps.filter(Boolean).length / 7) * 100);

  const handleFilesUpload = async (
    fileList: FileList | null,
    forcedCategoria?: DocumentoCommessa['categoria']
  ) => {
    if (!fileList || fileList.length === 0 || !currentId) return;
    const now = new Date().toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const nuoviDocs: DocumentoCommessa[] = [];

    for (const f of Array.from(fileList)) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await salvaFileBinario(id, f);

      nuoviDocs.push({
        id,
        nome: f.name,
        categoria: forcedCategoria ?? inferCategoria(f.name),
        dimensione: f.size,
        dataCaricamento: now,
      });
    }

    if (nuoviDocs.length > 0) {
      aggiungiDocumenti(currentId, nuoviDocs);
    }
  };

  const handleDownload = async (doc: DocumentoCommessa) => {
    setDownloadingId(doc.id);
    try {
      const stored = await leggiFileBinario(doc.id);
      if (stored?.blob) {
        const url = URL.createObjectURL(stored.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = stored.name || doc.nome;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!currentId) return;
    await eliminaFileBinario(docId);
    rimuoviDocumento(currentId, docId);
  };

  const documentiFiltrati =
    filtroCategoria === 'Tutte'
      ? documenti
      : documenti.filter((d) => d.categoria === filtroCategoria);

  return (
    <>
      {mobileOpen && (
        <div
          onClick={() => onCloseMobile?.()}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 shrink-0 bg-zinc-950 text-zinc-100 border-r border-zinc-800 flex flex-col min-h-screen select-none transform transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="px-4 py-4 border-b border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0">
              <FolderKanban size={18} className="text-zinc-200" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold tracking-tight text-white truncate">
                  My ARCHINEXT
                </span>
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-300">
                  RM
                </span>
              </div>
              <p className="font-mono text-[10px] text-zinc-400 truncate mt-0.5">
                Assistente Tecnico Generativo
              </p>
            </div>
          </div>

          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Chiudi menu"
              className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Commessa attiva + Cassetto Documentale */}
        <div className="p-4 border-b border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Commessa Attiva
            </span>
            <button
              type="button"
              onClick={() => creaCommessa()}
              className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-zinc-200 hover:text-white transition-colors"
            >
              <Plus size={12} /> Nuova
            </button>
          </div>

          <select
            value={currentId}
            onChange={(e) => setAttiva(e.target.value)}
            className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-zinc-400"
          >
            {commesse.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codice} — {c.titolo}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              onCloseMobile?.();
              setCassettoModalOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <BookOpen size={14} className="text-emerald-400 shrink-0" />
            <span>Cassetto Documentale</span>
            {documenti.length > 0 && (
              <span className="rounded-full bg-emerald-950 border border-emerald-700 px-1.5 py-0.2 font-mono text-[10px] text-emerald-300">
                {documenti.length}
              </span>
            )}
          </button>
        </div>

        {/* Avanzamento 7 step */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between font-mono text-xs mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Avanzamento 7 Step
            </span>
            <span className="font-bold text-white tabular-nums">{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Elenco 7 step */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {STEP_LABELS.map((label, idx) => {
            const done = Boolean(steps[idx]);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => currentId && toggleStep(currentId, idx)}
                className={`w-full text-left flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs transition-colors ${
                  idx === 0
                    ? 'bg-zinc-800/90 text-white font-semibold border border-zinc-700'
                    : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                {done ? (
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                ) : (
                  <Circle size={14} className="text-zinc-500 shrink-0" />
                )}
                <span className="truncate">
                  {idx + 1}. {label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Modale Cassetto Documentale */}
      {cassettoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-zinc-950 w-full max-w-2xl rounded-2xl border border-zinc-300 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-zinc-950 text-white px-5 py-4 flex items-center justify-between border-b border-zinc-800">
              <div>
                <p className="text-[11px] font-mono text-zinc-400">
                  COMMESSA {commessaAttiva?.codice}
                </p>
                <h2 className="text-base font-bold">
                  Cassetto Documentale — {commessaAttiva?.titolo}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCassettoModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Area caricamento */}
            <div className="p-5 bg-zinc-100 border-b border-zinc-300 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-800">
                  <span>Categoria upload:</span>
                  <select
                    value={categoriaUpload}
                    onChange={(e) =>
                      setCategoriaUpload(e.target.value as DocumentoCommessa['categoria'])
                    }
                    className="bg-white border border-zinc-400 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-950"
                  >
                    <option value="Catasto / Titoli">Catasto / Titoli</option>
                    <option value="Elaborati CAD / BIM">Elaborati CAD / BIM</option>
                    <option value="Relazioni / Computi">Relazioni / Computi</option>
                    <option value="Altro">Altro</option>
                  </select>
                </label>

                <label className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 cursor-pointer transition-colors">
                  <Upload size={14} />
                  <span>Carica documenti (multiplo)</span>
                  <input
                    type="file"
                    multiple
                    accept={DOC_ACCEPT}
                    className="hidden"
                    onChange={async (e) => {
                      await handleFilesUpload(e.target.files, categoriaUpload);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <p className="text-[11px] font-mono text-zinc-600">
                  Persistenza locale attiva (IndexedDB + localStorage) · Formati: PDF, DWG, DXF, IFC, XLSX, DOCX, PNG, JPG.
                </p>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      'Tutte',
                      'Catasto / Titoli',
                      'Elaborati CAD / BIM',
                      'Relazioni / Computi',
                      'Altro',
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFiltroCategoria(cat)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
                        filtroCategoria === cat
                          ? 'bg-zinc-950 text-white border-zinc-950'
                          : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-950'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Lista documenti */}
            <div className="p-5 overflow-y-auto flex-1">
              {documentiFiltrati.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-zinc-300 rounded-xl bg-zinc-50">
                  <p className="text-sm font-semibold text-zinc-800">
                    Nessun documento in questa vista
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Clicca su &ldquo;Carica documenti (multiplo)&rdquo; qui sopra per popolare la commessa.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-200 border border-zinc-200 rounded-xl overflow-hidden">
                  {documentiFiltrati.map((doc) => (
                    <li
                      key={doc.id}
                      className="px-4 py-3 flex items-center justify-between gap-3 bg-white hover:bg-zinc-50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText size={16} className="text-zinc-700 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-950 truncate">{doc.nome}</p>
                          <p className="text-[11px] font-mono text-zinc-600 mt-0.5">
                            {doc.categoria} · {formatBytes(doc.dimensione)} · {doc.dataCaricamento}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={downloadingId === doc.id}
                          onClick={() => handleDownload(doc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-300 text-[11px] font-semibold text-zinc-800 hover:border-zinc-950 disabled:opacity-50"
                        >
                          <Download size={12} />
                          <span>{downloadingId === doc.id ? 'Attendi...' : 'Scarica'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200"
                          title="Elimina documento"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}