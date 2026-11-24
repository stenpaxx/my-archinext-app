import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AbacoInfissi, AbacoSanitari, Commessa, Vano, VoceComputo } from './types';
import { PREZZARIO_LAZIO } from '@/data/prezzarioLazio';

interface State {
  commesse: Commessa[];
  attivaId: string | null;
  vani: Record<string, Vano[]>;
  voci: Record<string, VoceComputo[]>;
  infissi: Record<string, AbacoInfissi[]>;
  sanitari: Record<string, AbacoSanitari[]>;
  steps: Record<string, boolean[]>;
  creaCommessa: (c: Omit<Commessa, 'id' | 'createdAt'>) => void;
  eliminaCommessa: (id: string) => void;
  setAttiva: (id: string) => void;
  aggiornaCommessa: (id: string, patch: Partial<Commessa>) => void;
  aggiungiVano: (commessaId: string) => void;
  aggiornaVano: (commessaId: string, id: string, patch: Partial<Vano>) => void;
  eliminaVano: (commessaId: string, id: string) => void;
  aggiungiVoce: (commessaId: string, v: Omit<VoceComputo, 'id'>) => void;
  aggiornaVoce: (commessaId: string, id: string, patch: Partial<VoceComputo>) => void;
  eliminaVoce: (commessaId: string, id: string) => void;
  aggiungiInfisso: (commessaId: string, v: Omit<AbacoInfissi, 'id'>) => void;
  aggiornaInfisso: (commessaId: string, id: string, patch: Partial<AbacoInfissi>) => void;
  eliminaInfisso: (commessaId: string, id: string) => void;
  aggiungiSanitario: (commessaId: string, v: Omit<AbacoSanitari, 'id'>) => void;
  aggiornaSanitario: (commessaId: string, id: string, patch: Partial<AbacoSanitari>) => void;
  eliminaSanitario: (commessaId: string, id: string) => void;
  toggleStep: (commessaId: string, index: number) => void;
}

const uid = () => crypto.randomUUID();

const demoCommessa: Commessa = {
  id: '00000000-0000-4000-8000-000000000014',
  codice: '2026-014',
  titolo: 'Ristrutturazione Appartamento Via del Boschetto - Rione Monti, Roma',
  indirizzo: 'Via del Boschetto 42, 00184 Roma RM',
  municipio: 'Municipio I',
  foglio: '112',
  particella: '547',
  subalterno: '7',
  categoriaCatastale: 'A/2',
  rendita: '€ 3.842,16',
  tipologia: 'Ristrutturazione SCIA',
  tessutoPRG: 'T1 (Città Storica)',
  cartaQualita: true,
  vincoloSoprintendenza: true,
  createdAt: new Date().toISOString(),
};

const demoVani: Vano[] = [
  { id: uid(), nome: 'Ingresso', destinazione: 'Corridoio', superficie: 8.5, superfFinestrata: 0, altezzaMedia: 3.1, vmc: false },
  { id: uid(), nome: 'Soggiorno', destinazione: 'Soggiorno', superficie: 22.4, superfFinestrata: 3.1, altezzaMedia: 3.2, vmc: false },
  { id: uid(), nome: 'Camera matrimoniale', destinazione: 'Camera matrimoniale', superficie: 14.8, superfFinestrata: 1.9, altezzaMedia: 3.2, vmc: false },
  { id: uid(), nome: 'Studio (camera singola)', destinazione: 'Camera singola', superficie: 9.2, superfFinestrata: 1.35, altezzaMedia: 3.0, vmc: false },
  { id: uid(), nome: 'Cucina abitabile', destinazione: 'Cucina abitabile', superficie: 10.6, superfFinestrata: 1.1, altezzaMedia: 3.0, vmc: false },
  { id: uid(), nome: 'Bagno principale', destinazione: 'Bagno', superficie: 4.8, superfFinestrata: 0, altezzaMedia: 2.6, vmc: true },
  { id: uid(), nome: 'Bagno secondo (servizio)', destinazione: 'Bagno', superficie: 2.6, superfFinestrata: 0.35, altezzaMedia: 2.5, vmc: false },
];

const demoVoci: VoceComputo[] = [
  { id: uid(), codicePrezzario: 'L1.A.02.010', wbs: 'Demolizioni', descrizione: 'Demolizione tramezzi in laterizio sp. 12 cm con doppio gessato, incluso trasporto rifiuti a terra', um: 'mq', quantita: 45.0, prezzoUnitario: 17.4, oneriSicurezza: false },
  { id: uid(), codicePrezzario: 'L1.A.05.015', wbs: 'Demolizioni', descrizione: 'Demolizione e rimozione pavimento in gres porcellanato su sottofondo cementizio', um: 'mq', quantita: 95.0, prezzoUnitario: 11.9, oneriSicurezza: false },
  { id: uid(), codicePrezzario: 'L1.B.01.012', wbs: 'Murature', descrizione: 'Nuovo tramezzo in laterizio forato sp. 8 cm con intonaco doppia faccia', um: 'mq', quantita: 32.0, prezzoUnitario: 48.3, oneriSicurezza: false },
  { id: uid(), codicePrezzario: 'L1.C.01.008', wbs: 'Massetti', descrizione: 'Massetto in cemento alleggerito sp. 6 cm su solaio interfloor', um: 'mq', quantita: 95.0, prezzoUnitario: 21.5, oneriSicurezza: false },
  { id: uid(), codicePrezzario: 'L1.D.01.021', wbs: 'Pavimenti', descrizione: 'Pavimento in gres porcellanato 60x60 posato a colla', um: 'mq', quantita: 88.0, prezzoUnitario: 42.6, oneriSicurezza: false },
  { id: uid(), codicePrezzario: 'L1.E.01.005', wbs: 'Infissi', descrizione: 'Finestre a garantia legno-alluminio doppio vetro basso emissivo', um: 'pz', quantita: 5, prezzoUnitario: 680.0, oneriSicurezza: false },
  { id: uid(), codicePrezzario: 'L2.A.01.030', wbs: 'Elettrico CEI 64-8', descrizione: 'Impianto elettrico sotto intonaco CEI 64-8 Livello 2 (quadro, prese, punti luce, differenziali)', um: 'mq', quantita: 95.0, prezzoUnitario: 54.0, oneriSicurezza: false },
  { id: uid(), codicePrezzario: 'L2.B.01.006', wbs: 'Idrico', descrizione: 'Impianto idrico-sanitario in multistrato con allacci apparecchi e scarichi', um: 'mq', quantita: 95.0, prezzoUnitario: 47.8, oneriSicurezza: false },
  { id: uid(), codicePrezzario: 'OS.02.003', wbs: 'Oneri Sicurezza', descrizione: 'Oneri sicurezza: ponteggio fassatura perimetrale con autobloccanti e reti perz.', um: 'gg', quantita: 60, prezzoUnitario: 145.0, oneriSicurezza: true },
  { id: uid(), codicePrezzario: 'OS.01.001', wbs: 'Oneri Sicurezza', descrizione: 'Oneri sicurezza: DPI (parapetti, corde, caschi) e attrezzature anticaduta', um: 'gg', quantita: 60, prezzoUnitario: 85.0, oneriSicurezza: true },
];

const demoInfissi: AbacoInfissi[] = [
  { id: uid(), locale: 'Soggiorno', tipo: 'Finestra SC.A. legno', dimensioni: '150x220 h', quantita: 1, prezzoUnitario: 1450 },
  { id: uid(), locale: 'Soggiorno', tipo: 'Portafinestra legno', dimensioni: '120x230 h', quantita: 1, prezzoUnitario: 1650 },
  { id: uid(), locale: 'Camera matrimoniale', tipo: 'Finestra SC.A. legno', dimensioni: '120x220 h', quantita: 1, prezzoUnitario: 1250 },
  { id: uid(), locale: 'Studio', tipo: 'Finestra SC.A. PVC', dimensioni: '90x200 h', quantita: 1, prezzoUnitario: 850 },
  { id: uid(), locale: 'Cucina', tipo: 'Finestra SC.A. PVC', dimensioni: '90x180 h', quantita: 1, prezzoUnitario: 780 },
  { id: uid(), locale: 'Ingresso', tipo: 'Porta blindata', dimensioni: '90x210 h', quantita: 1, prezzoUnitario: 1850 },
];

const demoSanitari: AbacoSanitari[] = [
  { id: uid(), ambiente: 'Bagno principale', apparecchio: 'Lavabo ceramica con piletta', quantita: 1, prezzoUnitario: 180 },
  { id: uid(), ambiente: 'Bagno principale', apparecchio: 'Vaso WC sospeso scarico a parete', quantita: 1, prezzoUnitario: 420 },
  { id: uid(), ambiente: 'Bagno principale', apparecchio: 'Cassetta di scarico incasso', quantita: 1, prezzoUnitario: 210 },
  { id: uid(), ambiente: 'Bagno principale', apparecchio: 'Box doccia 80x120', quantita: 1, prezzoUnitario: 890 },
  { id: uid(), ambiente: 'Bagno principale', apparecchio: 'Bidet', quantita: 1, prezzoUnitario: 240 },
  { id: uid(), ambiente: 'Bagno secondo', apparecchio: 'Lavabo ceramica con piletta', quantita: 1, prezzoUnitario: 140 },
  { id: uid(), ambiente: 'Bagno secondo', apparecchio: 'Vaso WC sospeso scarico a parete', quantita: 1, prezzoUnitario: 420 },
  { id: uid(), ambiente: 'Bagno secondo', apparecchio: 'Box doccia 80x120', quantita: 1, prezzoUnitario: 890 },
  { id: uid(), ambiente: 'Cucina', apparecchio: 'Lavello cucina inox 2 vasche', quantita: 1, prezzoUnitario: 320 },
];

const demoState = {
  commesse: [demoCommessa],
  attivaId: demoCommessa.id,
  vani: { [demoCommessa.id]: demoVani },
  voci: { [demoCommessa.id]: demoVoci },
  infissi: { [demoCommessa.id]: demoInfissi },
  sanitari: { [demoCommessa.id]: demoSanitari },
  steps: { [demoCommessa.id]: [true, true, false, false, false, false, false] },
};

export const useStore = create<State>()(
  persist(
    (set) => ({
      ...demoState,

      creaCommessa: (c) => {
        const id = uid();
        set((s) => ({
          commesse: [...s.commesse, { ...c, id, createdAt: new Date().toISOString() }],
          attivaId: id,
          vani: { ...s.vani, [id]: [] },
          voci: { ...s.voci, [id]: [] },
          infissi: { ...s.infissi, [id]: [] },
          sanitari: { ...s.sanitari, [id]: [] },
          steps: { ...s.steps, [id]: Array(7).fill(false) },
        }));
      },

      eliminaCommessa: (id) =>
        set((s) => {
          const commesse = s.commesse.filter((c) => c.id !== id);
          const rest = (obj: Record<string, unknown>) => {
            const { [id]: _drop, ...r } = obj;
            return r;
          };
          return {
            commesse,
            vani: rest(s.vani) as State['vani'],
            voci: rest(s.voci) as State['voci'],
            infissi: rest(s.infissi) as State['infissi'],
            sanitari: rest(s.sanitari) as State['sanitari'],
            steps: rest(s.steps) as State['steps'],
            attivaId: s.attivaId === id ? commesse[0]?.id ?? null : s.attivaId,
          };
        }),

      setAttiva: (id) => set({ attivaId: id }),

      aggiornaCommessa: (id, patch) =>
        set((s) => ({
          commesse: s.commesse.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      aggiungiVano: (commessaId) =>
        set((s) => ({
          vani: {
            ...s.vani,
            [commessaId]: [
              ...(s.vani[commessaId] ?? []),
              { id: uid(), nome: '', destinazione: 'Camera singola', superficie: 0, superfFinestrata: 0, altezzaMedia: 2.7, vmc: false },
            ],
          },
        })),

      aggiornaVano: (commessaId, id, patch) =>
        set((s) => ({
          vani: {
            ...s.vani,
            [commessaId]: (s.vani[commessaId] ?? []).map((v) => (v.id === id ? { ...v, ...patch } : v)),
          },
        })),

      eliminaVano: (commessaId, id) =>
        set((s) => ({
          vani: { ...s.vani, [commessaId]: (s.vani[commessaId] ?? []).filter((v) => v.id !== id) },
        })),

      aggiungiVoce: (commessaId, v) =>
        set((s) => ({
          voci: { ...s.voci, [commessaId]: [...(s.voci[commessaId] ?? []), { ...v, id: uid() }] },
        })),

      aggiornaVoce: (commessaId, id, patch) =>
        set((s) => ({
          voci: {
            ...s.voci,
            [commessaId]: (s.voci[commessaId] ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
          },
        })),

      eliminaVoce: (commessaId, id) =>
        set((s) => ({
          voci: { ...s.voci, [commessaId]: (s.voci[commessaId] ?? []).filter((c) => c.id !== id) },
        })),

      aggiungiInfisso: (commessaId, v) =>
        set((s) => ({
          infissi: { ...s.infissi, [commessaId]: [...(s.infissi[commessaId] ?? []), { ...v, id: uid() }] },
        })),

      aggiornaInfisso: (commessaId, id, patch) =>
        set((s) => ({
          infissi: {
            ...s.infissi,
            [commessaId]: (s.infissi[commessaId] ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
          },
        })),

      eliminaInfisso: (commessaId, id) =>
        set((s) => ({
          infissi: { ...s.infissi, [commessaId]: (s.infissi[commessaId] ?? []).filter((c) => c.id !== id) },
        })),

      aggiungiSanitario: (commessaId, v) =>
        set((s) => ({
          sanitari: { ...s.sanitari, [commessaId]: [...(s.sanitari[commessaId] ?? []), { ...v, id: uid() }] },
        })),

      aggiornaSanitario: (commessaId, id, patch) =>
        set((s) => ({
          sanitari: {
            ...s.sanitari,
            [commessaId]: (s.sanitari[commessaId] ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
          },
        })),

      eliminaSanitario: (commessaId, id) =>
        set((s) => ({
          sanitari: { ...s.sanitari, [commessaId]: (s.sanitari[commessaId] ?? []).filter((c) => c.id !== id) },
        })),

      toggleStep: (commessaId, index) =>
        set((s) => {
          const current = s.steps[commessaId] ?? Array(7).fill(false);
          const next = [...current];
          next[index] = !next[index];
          return { steps: { ...s.steps, [commessaId]: next } };
        }),
    }),
    {
      name: 'gestionale-dt-roma-v2',
      onRehydrateStorage: () => (state) => {
        if (state && state.commesse.length === 0) {
          useStore.setState(demoState);
        }
      },
    }
  )
);

export const useAttiva = () => {
  const attivaId = useStore((s) => s.attivaId);
  const commessa = useStore((s) => s.commesse.find((c) => c.id === s.attivaId));
  return { attivaId, commessa };
};

export { PREZZARIO_LAZIO };
