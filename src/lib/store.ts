import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Commessa, Vano } from '@/lib/types';

export interface DocumentoCommessa {
  id: string;
  nome: string;
  categoria: 'Catasto / Titoli' | 'Elaborati CAD / BIM' | 'Relazioni / Computi' | 'Altro';
  dimensione: number;
  dataCaricamento: string;
  dataUrl?: string;
}

export const EMPTY_VANI: Vano[] = [];

const COMMESSE_INIZIALI: Commessa[] = [
  {
    id: 'comm-2026-014',
    codice: '2026-014',
    titolo: 'Ristrutturazione Appartamento Via del Boschetto',
    indirizzo: 'Via del Boschetto, 00184 Roma RM',
    municipio: 'Municipio I',
    foglio: '482',
    particella: '118',
    subalterno: '14',
    categoriaCatastale: 'A/2',
    rendita: '€ 1.480,00',
    tipologia: 'Manutenzione Straordinaria CILA',
    tessutoPRG: 'T2',
    cartaQualita: true,
    vincoloSoprintendenza: false,
  },
];

interface ArchinextStore {
  commesse: Commessa[];
  attivaId: string;
  vani: Record<string, Vano[]>;
  steps: Record<string, boolean[]>;
  documenti: Record<string, DocumentoCommessa[]>;
  activeStepIndex: number;

  setAttiva: (id: string) => void;
  setActiveStepIndex: (index: number) => void;
  creaCommessa: (parziale?: Partial<Commessa>) => string;
  aggiornaCommessa: (id: string, patch: Partial<Commessa>) => void;
  eliminaCommessa: (id: string) => void;
  toggleStep: (commessaId: string, stepIndex: number) => void;
  setVani: (commessaId: string, vani: Vano[]) => void;
  aggiungiDocumenti: (commessaId: string, docs: DocumentoCommessa[]) => void;
  rimuoviDocumento: (commessaId: string, docId: string) => void;
}

export const useStore = create<ArchinextStore>()(
  persist(
    (set, get) => ({
      commesse: COMMESSE_INIZIALI,
      attivaId: COMMESSE_INIZIALI[0].id,
      vani: {
        'comm-2026-014': [],
      },
      steps: {
        'comm-2026-014': [true, true, false, false, false, false, false],
      },
      documenti: {
        'comm-2026-014': [],
      },
      activeStepIndex: 0,

      setAttiva: (id) => set({ attivaId: id }),

      setActiveStepIndex: (index) => set({ activeStepIndex: index }),

      creaCommessa: (parziale) => {
        const count = get().commesse.length + 15;
        const codice = `2026-${String(count).padStart(3, '0')}`;
        const id = `comm-${Date.now()}`;
        const nuova: Commessa = {
          id,
          codice,
          titolo: parziale?.titolo ?? `Nuova Commessa ${codice}`,
          indirizzo: parziale?.indirizzo ?? 'Roma RM',
          municipio: parziale?.municipio ?? 'Municipio I',
          foglio: parziale?.foglio ?? '',
          particella: parziale?.particella ?? '',
          subalterno: parziale?.subalterno ?? '',
          categoriaCatastale: parziale?.categoriaCatastale ?? 'A/2',
          rendita: parziale?.rendita ?? '',
          tipologia: parziale?.tipologia ?? 'Manutenzione Straordinaria CILA',
          tessutoPRG: parziale?.tessutoPRG ?? 'T2',
          cartaQualita: parziale?.cartaQualita ?? false,
          vincoloSoprintendenza: parziale?.vincoloSoprintendenza ?? false,
        };

        set((s) => ({
          commesse: [nuova, ...s.commesse],
          attivaId: id,
          vani: { ...s.vani, [id]: [] },
          steps: { ...s.steps, [id]: [false, false, false, false, false, false, false] },
          documenti: { ...s.documenti, [id]: [] },
        }));

        return id;
      },

      aggiornaCommessa: (id, patch) =>
        set((s) => ({
          commesse: s.commesse.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      eliminaCommessa: (id) =>
        set((s) => {
          const rimanenti = s.commesse.filter((c) => c.id !== id);
          const nextAttiva =
            s.attivaId === id ? (rimanenti[0]?.id ?? '') : s.attivaId;
          return {
            commesse: rimanenti,
            attivaId: nextAttiva,
          };
        }),

      toggleStep: (commessaId, stepIndex) =>
        set((s) => {
          const current = s.steps[commessaId] ?? [false, false, false, false, false, false, false];
          const updated = current.map((val, idx) => (idx === stepIndex ? !val : val));
          return {
            steps: {
              ...s.steps,
              [commessaId]: updated,
            },
          };
        }),

      setVani: (commessaId, vani) =>
        set((s) => ({
          vani: {
            ...s.vani,
            [commessaId]: vani,
          },
        })),

      aggiungiDocumenti: (commessaId, docs) =>
        set((s) => ({
          documenti: {
            ...s.documenti,
            [commessaId]: [...docs, ...(s.documenti[commessaId] ?? [])],
          },
        })),

      rimuoviDocumento: (commessaId, docId) =>
        set((s) => ({
          documenti: {
            ...s.documenti,
            [commessaId]: (s.documenti[commessaId] ?? []).filter((d) => d.id !== docId),
          },
        })),
    }),
    {
      name: 'my-archinext-roma-storage',
    }
  )
);