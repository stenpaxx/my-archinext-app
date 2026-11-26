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

export interface VoceComputo {
  id: string;
  codice?: string;
  descrizione: string;
  unitaMisura?: string;
  quantita?: number;
  prezzoUnitario?: number;
  importo?: number;
}

export const EMPTY_VANI: Vano[] = [];
export const EMPTY_VOCI: VoceComputo[] = [];

const COMMESSE_INIZIALI: Commessa[] = [
  {
    id: 'comm-2026-014',
    codice: '2026-014',
    titolo: 'Ristrutturazione Appartamento Via del Boschetto 72 - Rione Monti, Roma',
    indirizzo: 'Via del Boschetto, 72, 00184 Roma RM',
    municipio: 'Municipio I',
    foglio: '482',
    particella: '118',
    subalterno: '14',
    categoriaCatastale: 'A/2',
    rendita: '€ 1.480,00',
    tipologia: 'Manutenzione Straordinaria CILA',
    tessutoPRG: 'T1',
    cartaQualita: true,
    vincoloSoprintendenza: false,
  },
];

function componiTitoloAutomatico(indirizzo: string, tipologia: string, codice: string): string {
  const indirizzoPulito = indirizzo.trim();
  if (!indirizzoPulito || indirizzoPulito === 'Roma RM') {
    return `Ristrutturazione Appartamento — Commessa ${codice}`;
  }
  const viaSenzaCap = indirizzoPulito.replace(/,?\s*\d{5}\s+Roma\s+RM$/i, '').trim();
  const prefisso = tipologia.toLowerCase().includes('frazion')
    ? 'Frazionamento Appartamento'
    : 'Ristrutturazione Appartamento';
  return `${prefisso} ${viaSenzaCap || indirizzoPulito}`;
}

interface ArchinextStore {
  commesse: Commessa[];
  attivaId: string;
  vani: Record<string, Vano[]>;
  voci: Record<string, VoceComputo[]>;
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
  setVoci: (commessaId: string, voci: VoceComputo[]) => void;
  aggiungiDocumenti: (commessaId: string, docs: DocumentoCommessa[]) => void;
  rimuoviDocumento: (commessaId: string, docId: string) => void;
  caricaCataloghi: () => Promise<void> | void;
}

export const useStore = create<ArchinextStore>()(
  persist(
    (set, get) => ({
      commesse: COMMESSE_INIZIALI,
      attivaId: COMMESSE_INIZIALI[0].id,
      vani: {
        'comm-2026-014': [],
      },
      voci: {
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
        const currentCommesse = get().commesse;
        const maxNum = currentCommesse.reduce((acc, c) => {
          const match = c.codice?.match(/(\d+)$/);
          const num = match ? parseInt(match[1], 10) : 0;
          return Math.max(acc, num);
        }, 14);
        const codice = `2026-${String(maxNum + 1).padStart(3, '0')}`;
        const id = `comm-${Date.now()}`;
        const indirizzo = parziale?.indirizzo?.trim() || 'Via del Boschetto, 72, 00184 Roma RM';
        const tipologia = parziale?.tipologia ?? 'Manutenzione Straordinaria CILA';
        const titolo =
          parziale?.titolo?.trim() || componiTitoloAutomatico(indirizzo, tipologia, codice);

        const nuova: Commessa = {
          id,
          codice,
          titolo,
          indirizzo,
          municipio: parziale?.municipio ?? 'Municipio I',
          foglio: parziale?.foglio ?? '',
          particella: parziale?.particella ?? '',
          subalterno: parziale?.subalterno ?? '',
          categoriaCatastale: parziale?.categoriaCatastale ?? 'A/2',
          rendita: parziale?.rendita ?? '',
          tipologia,
          tessutoPRG: parziale?.tessutoPRG ?? 'T1',
          cartaQualita: parziale?.cartaQualita ?? true,
          vincoloSoprintendenza: parziale?.vincoloSoprintendenza ?? false,
        };

        set((s) => ({
          commesse: [nuova, ...s.commesse],
          attivaId: id,
          activeStepIndex: 0,
          vani: { ...s.vani, [id]: [] },
          voci: { ...s.voci, [id]: [] },
          steps: { ...s.steps, [id]: [false, false, false, false, false, false, false] },
          documenti: { ...s.documenti, [id]: [] },
        }));

        return id;
      },

      aggiornaCommessa: (id, patch) =>
        set((s) => ({
          commesse: s.commesse.map((c) => {
            if (c.id !== id) return c;
            const aggiornata = { ...c, ...patch };
            const staCambiandoIndirizzo =
              typeof patch.indirizzo === 'string' && patch.indirizzo !== c.indirizzo;
            const nonHaForzatoTitolo = patch.titolo === undefined;
            const titoloEraAutomatico =
              c.titolo === componiTitoloAutomatico(c.indirizzo, c.tipologia, c.codice) ||
              c.titolo.startsWith('Nuova Commessa');

            if (staCambiandoIndirizzo && nonHaForzatoTitolo && titoloEraAutomatico) {
              aggiornata.titolo = componiTitoloAutomatico(
                aggiornata.indirizzo,
                aggiornata.tipologia,
                aggiornata.codice
              );
            }
            return aggiornata;
          }),
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

      setVoci: (commessaId, voci) =>
        set((s) => ({
          voci: {
            ...s.voci,
            [commessaId]: voci,
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

      caricaCataloghi: async () => {
        // Hook di inizializzazione cataloghi all'avvio dell'app
      },
    }),
    {
      name: 'my-archinext-roma-storage',
    }
  )
);

export function useAttiva(): Commessa | undefined {
  const commesse = useStore((s) => s.commesse);
  const attivaId = useStore((s) => s.attivaId);
  return commesse.find((c) => c.id === attivaId) ?? commesse[0];
}