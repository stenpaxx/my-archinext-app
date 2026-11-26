export const STEP_LABELS = [
  'Due Diligence, Catasto & PRG',
  'Audit Distributivo & RAI (DM 05/07/1975)',
  'Automazione CAD Gialli/Rossi (AutoLISP)',
  'Dimensionamento Impianti (CEI 64-8)',
  'Abachi & Computo Metrico Lazio',
  'Relazione Asseverata SUET Roma',
] as const;

export const TOTAL_STEPS = STEP_LABELS.length; // 6

export type StepIndex = 0 | 1 | 2 | 3 | 4 | 5;

export type DestinazioneVano =
  | 'Soggiorno / Pranzo'
  | 'Camera da letto'
  | 'Camera singola'
  | 'Cucina / Tinello'
  | 'Cucinotto / Angolo cottura'
  | 'Bagno / WC'
  | 'Disimpegno / Corridoio'
  | 'Ripostiglio / Lavanderia'
  | 'Studio';

export const DESTINAZIONI_VANO: DestinazioneVano[] = [
  'Soggiorno / Pranzo',
  'Camera da letto',
  'Camera singola',
  'Cucina / Tinello',
  'Cucinotto / Angolo cottura',
  'Bagno / WC',
  'Disimpegno / Corridoio',
  'Ripostiglio / Lavanderia',
  'Studio',
];

// Altezze minime (in metri) — D.M. 05/07/1975 & Regolamento Edilizio Roma Capitale
export const ALTEZZA_MINIMA: Record<DestinazioneVano, number> = {
  'Soggiorno / Pranzo': 2.70,
  'Camera da letto': 2.70,
  'Camera singola': 2.70,
  'Cucina / Tinello': 2.70,
  'Cucinotto / Angolo cottura': 2.40,
  'Bagno / WC': 2.40,
  'Disimpegno / Corridoio': 2.40,
  'Ripostiglio / Lavanderia': 2.40,
  'Studio': 2.70,
};

// Superfici minime (in mq) — D.M. 05/07/1975
export const SUPERFICIE_MINIMA: Record<DestinazioneVano, number> = {
  'Soggiorno / Pranzo': 14.0,
  'Camera da letto': 14.0,
  'Camera singola': 9.0,
  'Cucina / Tinello': 9.0,
  'Cucinotto / Angolo cottura': 0.0,
  'Bagno / WC': 0.0,
  'Disimpegno / Corridoio': 0.0,
  'Ripostiglio / Lavanderia': 0.0,
  'Studio': 9.0,
};

// Rapporto Aeroilluminante (RAI) minimo standard (1/8 = 0.125)
export const RAI_MINIMO = 1 / 8;