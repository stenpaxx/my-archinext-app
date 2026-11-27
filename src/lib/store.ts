import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Commessa {
  id: string;
  codice: string;
  titolo: string;
  indirizzo?: string;
  municipio?: string;
  tipologia?: string;
  foglio?: string;
  particella?: string;
  subalterno?: string;
  categoriaCatastale?: string;
  tessutoPRG?: string;
  cartaQualita?: boolean;
  vincoloSoprintendenza?: boolean;
  dettagliProcedimento?: Record<string, string>;
}

export interface Vano {
  id: string;
  nome: string;
  destinazione: string;
  superficie: number;
  superfFinestrata?: number;
  altezzaMedia: number;
  vmc?: boolean;
}

export interface VoceComputo {
  id: string;
  codice?: string;
  codicePrezzario?: string;
  descrizione: string;
  categoria?: string;
  wbs?: string;
  unitaMisura?: string;
  um?: string;
  quantita: number;
  prezzoUnitario?: number;
  prezzo?: number;
  importo?: number;
  oneriSicurezza?: boolean;
  sicurezza?: boolean;
}

export const EMPTY_VANI: Vano[] = [];
export const EMPTY_VOCI: VoceComputo[] = [];

interface AppState {
  commesse: Commessa[];
  attivaId: string;
  vani: Record<string, Vano[]>;
  voci: Record<string, VoceComputo[]>;
  steps: Record<string, boolean[]>;
  selezionaCommessa: (id: string) => void;
  creaCommessa: (payload: { titolo: string; indirizzo?: string }) => void;
  aggiornaCommessa: (id: string, patch: Partial<Commessa>) => void;
  toggleStep: (commessaId: string, stepIndex: number) => void;
  aggiungiVoce: (commessaId: string) => void;
  aggiornaVoce: (commessaId: string, voceId: string, patch: Partial<VoceComputo>) => void;
  eliminaVoce: (commessaId: string, voceId: string) => void;
  setVoci: (commessaId: string, voci: VoceComputo[]) => void;
}

const INITIAL_COMMESSE: Commessa[] = [
  {
    id: 'comm-2026-001',
    codice: '2026-001',
    titolo: 'Ristrutturazione appartamento Monti',
    indirizzo: 'Via del Boschetto, 72, 00184 Roma RM',
    municipio: 'Municipio I',
    tipologia: 'Manutenzione Straordinaria CILA',
    tessutoPRG: 'T1 — Tessuti di origine medievale',
    cartaQualita: true,
    vincoloSoprintendenza: false,
  },
  {
    id: 'comm-2026-002',
    codice: '2026-002',
    titolo: 'Nuova commessa',
    indirizzo: 'Via del Boschetto, 72, 00184 Roma RM',
    municipio: 'Municipio I',
    tipologia: 'Manutenzione Straordinaria CILA',
    tessutoPRG: 'T1 — Tessuti di origine medievale',
    cartaQualita: false,
    vincoloSoprintendenza: false,
  },
];

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      commesse: INITIAL_COMMESSE,
      attivaId: INITIAL_COMMESSE[0].id,
      vani: {},
      voci: {},
      steps: {},

      selezionaCommessa: (id) => set({ attivaId: id }),

      creaCommessa: ({ titolo, indirizzo }) =>
        set((state) => {
          const nextNum = state.commesse.length + 1;
          const codice = `2026-${String(nextNum).padStart(3, '0')}`;
          const id = `comm-${codice}-${Date.now()}`;
          const nuova: Commessa = {
            id,
            codice,
            titolo,
            indirizzo: indirizzo ?? 'Via del Boschetto, 72, 00184 Roma RM',
            municipio: 'Municipio I',
            tipologia: 'Manutenzione Straordinaria CILA',
            tessutoPRG: 'T1 — Tessuti di origine medievale',
            cartaQualita: false,
            vincoloSoprintendenza: false,
          };
          return {
            commesse: [...state.commesse, nuova],
            attivaId: id,
          };
        }),

      aggiornaCommessa: (id, patch) =>
        set((state) => ({
          commesse: state.commesse.map((c) => {
            if (c.id !== id) return c;
            const nuovoCodice =
              patch.codice !== undefined ? patch.codice.trim() || c.codice : c.codice;
            return {
              ...c,
              ...patch,
              codice: nuovoCodice,
              titolo: patch.titolo !== undefined ? patch.titolo : c.titolo,
              indirizzo: patch.indirizzo !== undefined ? patch.indirizzo : c.indirizzo,
            };
          }),
        })),

      toggleStep: (commessaId, stepIndex) =>
        set((state) => {
          const current = state.steps[commessaId] ?? [false, false, false, false, false, false];
          const updated = [...current];
          updated[stepIndex] = !updated[stepIndex];
          return {
            steps: {
              ...state.steps,
              [commessaId]: updated,
            },
          };
        }),

      aggiungiVoce: (commessaId) =>
        set((state) => {
          const list = state.voci[commessaId] ?? [];
          const nuova: VoceComputo = {
            id: `voce-${Date.now()}-${list.length + 1}`,
            codice: '',
            descrizione: '',
            categoria: 'Opere edili',
            unitaMisura: 'mq',
            um: 'mq',
            quantita: 1,
            prezzoUnitario: 0,
            importo: 0,
            oneriSicurezza: false,
          };
          return {
            voci: {
              ...state.voci,
              [commessaId]: [...list, nuova],
            },
          };
        }),

      aggiornaVoce: (commessaId, voceId, patch) =>
        set((state) => {
          const list = state.voci[commessaId] ?? [];
          return {
            voci: {
              ...state.voci,
              [commessaId]: list.map((v) => {
                if (v.id !== voceId) return v;
                const merged = { ...v, ...patch };
                const q = Number(merged.quantita) || 0;
                const p = Number(merged.prezzoUnitario ?? merged.prezzo) || 0;
                return {
                  ...merged,
                  um: merged.um || merged.unitaMisura || 'mq',
                  unitaMisura: merged.unitaMisura || merged.um || 'mq',
                  importo: Number((q * p).toFixed(2)),
                };
              }),
            },
          };
        }),

      eliminaVoce: (commessaId, voceId) =>
        set((state) => {
          const list = state.voci[commessaId] ?? [];
          return {
            voci: {
              ...state.voci,
              [commessaId]: list.filter((v) => v.id !== voceId),
            },
          };
        }),

      setVoci: (commessaId, voci) =>
        set((state) => ({
          voci: {
            ...state.voci,
            [commessaId]: voci,
          },
        })),
    }),
    { name: 'my-archinext-store' }
  )
);

export function useAttiva() {
  const commesse = useStore((s) => s.commesse);
  const attivaId = useStore((s) => s.attivaId);
  const commessa = commesse.find((c) => c.id === attivaId) ?? commesse[0] ?? null;
  return { commessa };
}