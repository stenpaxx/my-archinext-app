import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Commessa {
  id: string;
  codice: string;
  titolo: string;
  indirizzo: string;
  municipio?: string;
  tipologia?: string;
  tessutoPRG?: string;
  foglio?: string;
  particella?: string;
  subalterno?: string;
  categoriaCatastale?: string;
  cartaQualita?: boolean;
  vincoloSoprintendenza?: boolean;
  dettagliProcedimento?: Record<string, string | undefined>;
}

export interface Vano {
  id: string;
  nome: string;
  destinazione: string;
  superficie: number;
  superfFinestrata?: number;
  altezzaMedia?: number;
  vmc?: boolean;
}

export interface VoceComputo {
  id: string;
  codice?: string;
  descrizione: string;
  unitaMisura?: string;
  quantita: number;
  prezzoUnitario: number;
  oneriSicurezza?: boolean;
}

export interface CreaCommessaInput {
  codice?: string;
  titolo: string;
  indirizzo: string;
  municipio?: string;
  tipologia?: string;
  tessutoPRG?: string;
  foglio?: string;
  particella?: string;
  subalterno?: string;
  categoriaCatastale?: string;
  cartaQualita?: boolean;
  vincoloSoprintendenza?: boolean;
}

export const EMPTY_VANI: Vano[] = [];
export const EMPTY_VOCI: VoceComputo[] = [];

const DEFAULT_STEPS = [false, false, false, false, false, false];

const INITIAL_COMMESSE: Commessa[] = [
  {
    id: '2026-014',
    codice: '2026-014',
    titolo: 'Ristrutturazione',
    indirizzo: 'Via del Boschetto, 72, 00184 Roma RM',
    municipio: 'Municipio I',
    tipologia: 'Manutenzione Straordinaria CILA',
    tessutoPRG: 'T1 — Tessuti di origine medievale',
    categoriaCatastale: 'A/2',
    cartaQualita: false,
    vincoloSoprintendenza: false,
  },
];

interface ArchinextState {
  commesse: Commessa[];
  attivaId: string;
  steps: Record<string, boolean[]>;
  vani: Record<string, Vano[]>;
  voci: Record<string, VoceComputo[]>;

  selezionaCommessa: (id: string) => void;
  aggiornaCommessa: (id: string, patch: Partial<Commessa>) => void;
  aggiornaCommessaAttiva: (patch: Partial<Commessa>) => void;
  creaCommessa: (input: CreaCommessaInput) => Commessa;
  toggleStep: (commessaIdOrIndex: string | number, stepIndex?: number) => void;
}

function generaProssimoCodice(commesse: Commessa[]): string {
  const anno = new Date().getFullYear();
  const progressivi = commesse
    .map((c) => {
      const match = c.codice.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !Number.isNaN(n));

  const prossimo = (progressivi.length ? Math.max(...progressivi) : 14) + 1;
  return `${anno}-${String(prossimo).padStart(3, '0')}`;
}

export const useStore = create<ArchinextState>()(
  persist(
    (set, get) => ({
      commesse: INITIAL_COMMESSE,
      attivaId: INITIAL_COMMESSE[0].id,
      steps: {
        [INITIAL_COMMESSE[0].id]: [...DEFAULT_STEPS],
      },
      vani: {
        [INITIAL_COMMESSE[0].id]: [],
      },
      voci: {
        [INITIAL_COMMESSE[0].id]: [],
      },

      selezionaCommessa: (id) => {
        const esiste = get().commesse.some((c) => c.id === id);
        if (!esiste) return;

        set((state) => ({
          attivaId: id,
          steps: {
            ...state.steps,
            [id]: state.steps[id] ?? [...DEFAULT_STEPS],
          },
          vani: {
            ...state.vani,
            [id]: state.vani[id] ?? [],
          },
          voci: {
            ...state.voci,
            [id]: state.voci[id] ?? [],
          },
        }));
      },

      aggiornaCommessa: (id, patch) => {
        set((state) => ({
          commesse: state.commesse.map((c) => {
            if (c.id !== id) return c;
            const nuovoCodice =
              patch.codice !== undefined ? patch.codice.trim() || c.codice : c.codice;
            return {
              ...c,
              ...patch,
              codice: nuovoCodice,
              titolo: patch.titolo !== undefined ? patch.titolo.trim() || c.titolo : c.titolo,
              indirizzo:
                patch.indirizzo !== undefined ? patch.indirizzo.trim() : c.indirizzo,
            };
          }),
        }));
      },

      aggiornaCommessaAttiva: (patch) => {
        const { attivaId, aggiornaCommessa } = get();
        if (!attivaId) return;
        aggiornaCommessa(attivaId, patch);
      },

      creaCommessa: (input) => {
        const current = get().commesse;
        const codice = input.codice?.trim() || generaProssimoCodice(current);
        const id = codice;

        const nuova: Commessa = {
          id,
          codice,
          titolo: input.titolo.trim() || 'Nuova Commessa',
          indirizzo: input.indirizzo.trim() || 'Via del Boschetto, 72, 00184 Roma RM',
          municipio: input.municipio?.trim() || 'Municipio I',
          tipologia: input.tipologia || 'Manutenzione Straordinaria CILA',
          tessutoPRG: input.tessutoPRG || 'T1 — Tessuti di origine medievale',
          foglio: input.foglio?.trim(),
          particella: input.particella?.trim(),
          subalterno: input.subalterno?.trim(),
          categoriaCatastale: input.categoriaCatastale?.trim() || 'A/2',
          cartaQualita: Boolean(input.cartaQualita),
          vincoloSoprintendenza: Boolean(input.vincoloSoprintendenza),
        };

        set((state) => ({
          commesse: [nuova, ...state.commesse],
          attivaId: nuova.id,
          steps: {
            ...state.steps,
            [nuova.id]: [...DEFAULT_STEPS],
          },
          vani: {
            ...state.vani,
            [nuova.id]: [],
          },
          voci: {
            ...state.voci,
            [nuova.id]: [],
          },
        }));

        return nuova;
      },

      toggleStep: (commessaIdOrIndex, stepIndex) => {
        const { attivaId, steps } = get();
        const targetId =
          typeof commessaIdOrIndex === 'string' ? commessaIdOrIndex : attivaId;
        const idxToToggle =
          typeof commessaIdOrIndex === 'number' ? commessaIdOrIndex : stepIndex;

        if (
          !targetId ||
          typeof idxToToggle !== 'number' ||
          idxToToggle < 0 ||
          idxToToggle >= DEFAULT_STEPS.length
        ) {
          return;
        }

        const corrente = steps[targetId] ?? [...DEFAULT_STEPS];
        const aggiornati = corrente.map((val, idx) => (idx === idxToToggle ? !val : val));

        set({
          steps: {
            ...steps,
            [targetId]: aggiornati,
          },
        });
      },
    }),
    {
      name: 'my-archinext-store-v1',
      partialize: (state) => ({
        commesse: state.commesse,
        attivaId: state.attivaId,
        steps: state.steps,
        vani: state.vani,
        voci: state.voci,
      }),
    }
  )
);

export function useAttiva() {
  const commesse = useStore((s) => s.commesse);
  const attivaId = useStore((s) => s.attivaId);

  const commessa =
    commesse.find((c) => c.id === attivaId) ?? commesse[0] ?? null;

  return {
    attivaId: commessa?.id ?? attivaId,
    commessa,
    codice: commessa?.codice ?? '',
    indirizzo: commessa?.indirizzo ?? '',
  };
}