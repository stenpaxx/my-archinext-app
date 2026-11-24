export type TipologiaCommessa =
  | 'Manutenzione Straordinaria CILA'
  | 'Frazionamento CILA'
  | 'Ristrutturazione SCIA'
  | 'Cambio d’uso SCIA';

export interface Commessa {
  id: string;
  codice: string;
  titolo: string;
  indirizzo: string;
  municipio: string;
  foglio: string;
  particella: string;
  subalterno: string;
  categoriaCatastale: string;
  rendita: string;
  tipologia: TipologiaCommessa;
  tessutoPRG: string;
  cartaQualita: boolean;
  vincoloSoprintendenza: boolean;
  createdAt: string;
}

export interface Vano {
  id: string;
  nome: string;
  destinazione: string;
  superficie: number;
  superfFinestrata: number;
  altezzaMedia: number;
  vmc: boolean;
}

export interface VoceComputo {
  id: string;
  codicePrezzario: string;
  wbs: string;
  descrizione: string;
  um: string;
  quantita: number;
  prezzoUnitario: number;
  oneriSicurezza: boolean;
}

export interface AbacoInfissi {
  id: string;
  locale: string;
  tipo: string;
  dimensioni: string;
  quantita: number;
  prezzoUnitario: number;
}

export interface AbacoSanitari {
  id: string;
  ambiente: string;
  apparecchio: string;
  quantita: number;
  prezzoUnitario: number;
}

export const DESTINAZIONI_VANO = [
  'Camera singola',
  'Camera matrimoniale',
  'Soggiorno',
  'Cucina abitabile',
  'Monolocale',
  'Bagno',
  'Corridoio',
  'Locale commerciale',
  'Altro',
] as const;

export const TIPI_INFSSI = [
  'Finestra SC.A. legno', 'Finestra SC.A. PVC', 'Finestra SC.A. alluminio a taglio termico',
  'Portafinestra legno', 'Porta-finestra alluminio', 'Porta blindata', 'Porta interna incasso',
  'Lucernario fisso',
] as const;

export const APPARECCHI_SANITARI = [
  'Lavabo ceramica con piletta', 'Vaso WC sospeso scarico a parete',
  'Cassetta di scarico incasso', 'Bidet', 'Box doccia 80x120', 'Vasca da bagno 170x70',
  'Lavello cucina inox 2 vasche', 'Lavatrice / Lavastoviglie (allacci)',
] as const;

// Superfici minime DM 05/07/1975 (abitazioni); altezze: 2,70 m abitazioni - 2,40 m corridoi/bagni
export const SUPERFICIE_MINIMA: Record<string, number> = {
  'Camera singola': 9,
  'Camera matrimoniale': 14,
  'Soggiorno': 14,
  'Cucina abitabile': 9,
  'Monolocale': 28, // abitabile da 1 persona; 38 mq per 2 persone
  'Locale commerciale': 9,
};

export const ALTEZZA_MINIMA: Record<string, number> = {
  'Bagno': 2.4,
  'Corridoio': 2.4,
  '__default__': 2.7,
};

export const WBS_CATEGORIE = [
  'Demolizioni',
  'Murature',
  'Intonaci',
  'Massetti',
  'Pavimenti',
  'Infissi',
  'Elettrico CEI 64-8',
  'Idrico',
  'Oneri Sicurezza',
] as const;

export const STEP_LABELS = [
  'Due diligence urbanistica e catastale (NTA PRG Roma, Carta per la Qualità)',
  'Audit distributivo varianti (DM 05/07/1975, Reg. Edilizio Roma, colonne di scarico)',
  'Verifica Rapporti Aeroilluminanti (RAI ≥ 1/8) e superfici minime',
  'Automazione Gialli e Rossi CAD (AutoLISP)',
  'Dimensionamento impianti (CEI 64-8 Livello 1 e idrico-sanitario)',
  'Abachi e Computo Metrico Estimativo (Prezzario Lazio + Sicurezza separata)',
  'Relazione Asseverata SUET Roma, Capitolato FIR e Informativa AI L. 132/2025',
] as const;

export const MUNICIPI = [
  'Municipio I', 'Municipio II', 'Municipio III', 'Municipio IV', 'Municipio V',
  'Municipio VI', 'Municipio VII', 'Municipio VIII', 'Municipio IX', 'Municipio X',
  'Municipio XI', 'Municipio XII', 'Municipio XIII', 'Municipio XIV', 'Municipio XV',
] as const;

export interface TessutoPrg {
  sigla: string;
  nome: string;
  ammessi: string[];
  note: string;
}

export const TESSUTI_PRG: TessutoPrg[] = [
  { sigla: 'T1 (Città Storica)', nome: 'Città Storica', ammessi: ['CILA', 'SCIA', 'Frazionamento', 'Cambio d’uso (negli ambiti previsti)'], note: 'Centro storico: vincolo paesaggistico frequente; verificare interventi ex art. 12 L. 1089/1942 e farettatura.' },
  { sigla: 'T2 (Città Storica)', nome: 'Città Storica', ammessi: ['CILA', 'SCIA', 'Frazionamento'], note: 'Tessuto ottocentesco/a metà Novecento di alto pregio.' },
  { sigla: 'T3 (Città Storica)', nome: 'Città Storica', ammessi: ['CILA', 'SCIA', 'Frazionamento'], note: 'Tessuto di fine ’800/inizi ’900 di modesto pregio.' },
  { sigla: 'T4 (Città Storica)', nome: 'Città Storica', ammessi: ['CILA', 'SCIA', 'Frazionamento'], note: 'Tessuto periferico di interesse storico-ambientale.' },
  { sigla: 'T5 (Città Storica)', nome: 'Città Storica', ammessi: ['CILA', 'SCIA', 'Frazionamento'], note: 'Tessuto di edilizia residenziale a blocco di inizio secolo.' },
  { sigla: 'T6 (Città Storica)', nome: 'Città Storica', ammessi: ['CILA', 'SCIA', 'Frazionamento'], note: 'Tessuto della città fascista, con particolarità strutturali e tipologiche.' },
  { sigla: 'T7 (Città Storica)', nome: 'Città Storica', ammessi: ['CILA', 'SCIA'], note: 'Tessuto spontaneo di interesse conformato; frazionamento generalmente non ammesso.' },
  { sigla: 'T8 (Città Storica)', nome: 'Città Storica', ammessi: ['CILA', 'SCIA'], note: 'Tessuto spontaneo di interesse documentario.' },
  { sigla: 'T9 (Città Storica)', nome: 'Città Storica', ammessi: ['CILA', 'SCIA'], note: 'Tessuto storico di evacuazione.' },
  { sigla: 'A (Consolidata)', nome: 'Città Consolidata', ammessi: ['CILA', 'SCIA', 'Frazionamento', 'Cambio d’uso'], note: 'Tessuto a media densità dell’edificato residenziale di pregio.' },
  { sigla: 'B (Consolidata)', nome: 'Città Consolidata', ammessi: ['CILA', 'SCIA', 'Frazionamento', 'Cambio d’uso'], note: 'Tessuto a media densità di edificato residenziale.' },
  { sigla: 'C (Consolidata)', nome: 'Città Consolidata', ammessi: ['CILA', 'SCIA', 'Cambio d’uso'], note: 'Tessuto di edilizia non residenziale di aria compatta.' },
  { sigla: 'D (Consolidata)', nome: 'Città Consolidata', ammessi: ['CILA', 'SCIA', 'Frazionamento'], note: 'Tessuto residenziale di media densità ad aggregati compatti.' },
  { sigla: 'E (Ristrutturare)', nome: 'Città da Ristrutturare', ammessi: ['CILA', 'SCIA', 'Frazionamento', 'Cambio d’uso (nuclei di trasformazione)'], note: 'Ambiti in trasformazione: verificare PUA e standard urbanistici.' },
  { sigla: 'F (Ristrutturare)', nome: 'Città da Ristrutturare', ammessi: ['SCIA', 'Cambio d’uso'], note: 'Tessuto produttivo di edilizia non residenziale.' },
  { sigla: 'G (Residenz.)', nome: 'Tessuti prevalentemente residenziali', ammessi: ['CILA', 'SCIA', 'Frazionamento', 'Cambio d’uso'], note: 'Tessuto a media densità residenziale consolidata; ammessi piani di recupero.' },
  { sigla: 'H (Residenz.)', nome: 'Tessuti prevalentemente residenziali', ammessi: ['CILA', 'SCIA'], note: 'Tessuto residenziale a bassa densità; verificare indirizzi di quality shaping.' },
];

export interface LivelloCei {
  livello: string;
  descrizione: string;
  potenza: string;
  circuitiBase: number;
  presePerMq: number; // derive min presa count
  lucePerVano: number;
  differenziali: string;
}

export const LIVELLI_CEI: LivelloCei[] = [
  { livello: 'Livello 1 — Base', descrizione: 'Schema funzionale minimo CEI 64-8 sez. 520', potenza: '3 kW', circuitiBase: 5, presePerMq: 0.08, lucePerVano: 1, differenziali: '1 differenziale 30 mA generale (o 2 per punti luce/presse separate)' },
  { livello: 'Livello 2 — Standard', descrizione: 'Schema standard residenziale CEI 64-8 sez. 526', potenza: '4,5 kW', circuitiBase: 7, presePerMq: 0.1, lucePerVano: 1, differenziali: '2-3 differenziali 30 mA (piastre separate: prese/luce; forno/lavatrice/lavastoviglie)' },
  { livello: 'Livello 3 — Domotico', descrizione: 'Sistema domotico BUS (KNX/MyHome), CEI 64-8 + CEI 100-1', potenza: '6 kW', circuitiBase: 9, presePerMq: 0.12, lucePerVano: 1, differenziali: '3-4 differenziali 30 mA ripartiti per aree/domotica' },
];
