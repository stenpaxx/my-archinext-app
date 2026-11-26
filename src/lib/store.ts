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
  superfFinestrata: number;
  altezzaMedia: number;
  vmc?: boolean;
  note?: string;
}

export interface VoceComputo {
  id: string;
  codice: string;
  descrizione: string;
  categoria?: string;
  unitaMisura: string;
  um: string;
  quantita: number;
  prezzoUnitario: number;
  prezzo: number;
  importo?: number;
  oneriSicurezza?: boolean;
  sicurezza?: boolean;
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

export interface RisultatoImportSynaps {
  ok: boolean;
  vaniImportati: number;
  superficieTotale: number;
  messaggio: string;
  vani: Vano[];
}

export interface RisultatoImportDocumento {
  vaniAggiunti: number;
  vociAggiornate: number;
  riepilogo: string;
}

export const EMPTY_VANI: Vano[] = [];
export const EMPTY_VOCI: VoceComputo[] = [];

const DEFAULT_STEPS = [false, false, false, false, false, false];
const INITIAL_COMMESSA_ID = '2026-014';

const INITIAL_COMMESSE: Commessa[] = [
  {
    id: INITIAL_COMMESSA_ID,
    codice: INITIAL_COMMESSA_ID,
    titolo: 'Ristrutturazione',
    indirizzo: 'Via del Boschetto, 72, 00184 Roma RM',
    municipio: 'Municipio I',
    tipologia: 'Manutenzione Straordinaria CILA',
    tessutoPRG: 'T1 — Tessuti di origine medievale',
    foglio: '481',
    particella: '112',
    subalterno: '7',
    categoriaCatastale: 'A/2',
    cartaQualita: false,
    vincoloSoprintendenza: false,
  },
];

const VANI_ESEMPIO_72MQ: Vano[] = [
  {
    id: 'vano-72-soggiorno',
    nome: 'Soggiorno / Pranzo',
    destinazione: 'Soggiorno',
    superficie: 24.0,
    superfFinestrata: 3.4,
    altezzaMedia: 3.1,
    vmc: false,
    note: 'RAI = 3,40 / 24,00 = 1/7,06 (>= 1/8 verificato)',
  },
  {
    id: 'vano-72-cucina',
    nome: 'Cucina Abitabile',
    destinazione: 'Cucina abitabile',
    superficie: 11.0,
    superfFinestrata: 1.6,
    altezzaMedia: 3.1,
    vmc: false,
    note: 'Superficie >= 9 mq e RAI >= 1/8 verificato',
  },
  {
    id: 'vano-72-matrimoniale',
    nome: 'Camera Matrimoniale',
    destinazione: 'Camera matrimoniale',
    superficie: 15.0,
    superfFinestrata: 2.2,
    altezzaMedia: 3.1,
    vmc: false,
    note: 'Superficie >= 14 mq e RAI >= 1/8 verificato',
  },
  {
    id: 'vano-72-singola',
    nome: 'Camera Singola / Studio',
    destinazione: 'Camera singola',
    superficie: 10.0,
    superfFinestrata: 1.5,
    altezzaMedia: 3.1,
    vmc: false,
    note: 'Superficie >= 9 mq e RAI >= 1/8 verificato',
  },
  {
    id: 'vano-72-bagno1',
    nome: 'Bagno Principale',
    destinazione: 'Bagno',
    superficie: 6.5,
    superfFinestrata: 0.9,
    altezzaMedia: 2.7,
    vmc: false,
    note: 'Altezza >= 2,40 m · Finestra apribile su chiostrina/cortile',
  },
  {
    id: 'vano-72-bagno2',
    nome: 'Bagno di Servizio / Lavanderia',
    destinazione: 'Bagno cieco',
    superficie: 5.5,
    superfFinestrata: 0.0,
    altezzaMedia: 2.7,
    vmc: true,
    note: 'Bagno cieco con VMC / aerazione forzata ex REC Roma',
  },
];

function buildVoce(
  id: string,
  codice: string,
  descrizione: string,
  unitaMisura: string,
  quantita: number,
  prezzoUnitario: number,
  oneriSicurezza = false,
  categoria = 'Opere edili'
): VoceComputo {
  const q = Number(quantita) || 0;
  const p = Number(prezzoUnitario) || 0;
  return {
    id,
    codice,
    descrizione,
    categoria,
    unitaMisura,
    um: unitaMisura,
    quantita: q,
    prezzoUnitario: p,
    prezzo: p,
    importo: Number((q * p).toFixed(2)),
    oneriSicurezza,
    sicurezza: oneriSicurezza,
  };
}

const VOCI_TIPO_LAZIO: Array<{
  codice: string;
  descrizione: string;
  categoria: string;
  unitaMisura: string;
  quantita: number;
  prezzoUnitario: number;
  oneriSicurezza: boolean;
}> = [
  {
    codice: 'A 01.01.010.a',
    descrizione:
      'Demolizione di tramezzi in laterizio forato spessore fino a 12 cm, compreso carico e trasporto a discarica autorizzata',
    categoria: 'Demolizioni e Rimozioni',
    unitaMisura: 'mq',
    quantita: 28.0,
    prezzoUnitario: 24.5,
    oneriSicurezza: false,
  },
  {
    codice: 'A 01.02.015.b',
    descrizione:
      'Rimozione di pavimenti in ceramica, marmette o parquet, compreso sottostante massetto di allettamento fino a 5 cm',
    categoria: 'Demolizioni e Rimozioni',
    unitaMisura: 'mq',
    quantita: 72.0,
    prezzoUnitario: 19.8,
    oneriSicurezza: false,
  },
  {
    codice: 'A 04.01.020.c',
    descrizione:
      'Muratura di tamponamento o tramezzatura in laterizio forato spessore 10 cm legata con malta bastarda',
    categoria: 'Murature e Divisori',
    unitaMisura: 'mq',
    quantita: 32.0,
    prezzoUnitario: 46.2,
    oneriSicurezza: false,
  },
  {
    codice: 'A 12.01.005.a',
    descrizione:
      'Fornitura e posa in opera di pavimentazione in gres porcellanato rettificato posato a colla, escluso massetto',
    categoria: 'Pavimenti e Rivestimenti',
    unitaMisura: 'mq',
    quantita: 72.0,
    prezzoUnitario: 68.0,
    oneriSicurezza: false,
  },
  {
    codice: 'E 01.01.010.a',
    descrizione:
      'Rifacimento completo impianto elettrico sottotraccia per unità abitativa (CEI 64-8 Livello 1), punti luce e prese',
    categoria: 'Impianti Elettrici e Speciali',
    unitaMisura: 'p.to',
    quantita: 45,
    prezzoUnitario: 65.0,
    oneriSicurezza: false,
  },
  {
    codice: 'I 01.02.008.a',
    descrizione:
      'Impianto idrico-sanitario per bagno completo con tubazioni multistrato coibentate, scarichi in PP e collettori',
    categoria: 'Impianti Idrico-Termici',
    unitaMisura: 'cad',
    quantita: 2,
    prezzoUnitario: 1850.0,
    oneriSicurezza: false,
  },
  {
    codice: 'S 01.01.001.a',
    descrizione:
      'Oneri per la sicurezza aziendali e apprestamenti di cantiere D.Lgs 81/2008 (non soggetti a ribasso)',
    categoria: 'Oneri Sicurezza',
    unitaMisura: 'a corpo',
    quantita: 1,
    prezzoUnitario: 2450.0,
    oneriSicurezza: true,
  },
];

function parseNumero(valore: unknown, fallback = 0): number {
  if (typeof valore === 'number') {
    return Number.isFinite(valore) ? valore : fallback;
  }
  if (typeof valore === 'string') {
    const normalizzato = valore
      .replace(/\s+/g, ' ')
      .replace(/m²|mq|m2|mt|m/gi, '')
      .replace(',', '.')
      .trim();
    const match = normalizzato.match(/-?\d+(\.\d+)?/);
    if (match) {
      const n = parseFloat(match[0]);
      return Number.isFinite(n) ? n : fallback;
    }
  }
  return fallback;
}

function normalizzaRecordInVano(raw: Record<string, unknown>, index: number): Vano | null {
  const nomeCandidate =
    raw.nome ??
    raw.name ??
    raw.label ??
    raw.titolo ??
    raw.vano ??
    raw.room ??
    raw.ambiente ??
    raw.locale;

  const supCandidate =
    raw.superficie ??
    raw.sup ??
    raw.mq ??
    raw.area ??
    raw.consistenza ??
    raw.superficieMq ??
    raw.superficie_mq ??
    raw.superficieNetta ??
    raw.superficie_netta;

  const hCandidate =
    raw.altezzaMedia ??
    raw.altezza_media ??
    raw.altezza ??
    raw.h ??
    raw.hMedia ??
    raw.h_media ??
    raw.altezzaNetta ??
    raw.altezza_netta;

  const finCandidate =
    raw.superfFinestrata ??
    raw.superf_finestrata ??
    raw.superficieFinestrata ??
    raw.superficie_finestrata ??
    raw.finestrata ??
    raw.aeroilluminante ??
    raw.supFinestrata ??
    raw.sup_finestrata;

  const destCandidate =
    raw.destinazione ??
    raw.destinazioneUso ??
    raw.destinazione_uso ??
    raw.uso ??
    raw.tipo ??
    raw.category;

  const superficie = parseNumero(supCandidate, 0);
  const nome =
    typeof nomeCandidate === 'string' && nomeCandidate.trim()
      ? nomeCandidate.trim()
      : '';

  if (!nome && superficie <= 0) return null;

  const altezzaMedia = parseNumero(hCandidate, 2.7);
  const superfFinestrata = parseNumero(finCandidate, 0);
  const vmcRaw =
    raw.vmc ?? raw.aerazioneForzata ?? raw.aerazione_forzata ?? raw.ventilazione;
  const vmc =
    typeof vmcRaw === 'boolean'
      ? vmcRaw
      : typeof vmcRaw === 'string'
        ? /true|si|sì|vmc|forzata|meccanica|1/i.test(vmcRaw)
        : false;

  const destinazione =
    typeof destCandidate === 'string' && destCandidate.trim()
      ? destCandidate.trim()
      : /bagno|wc|servizio/i.test(nome)
        ? superfFinestrata > 0
          ? 'Bagno'
          : 'Bagno cieco'
        : /cucina|cottura/i.test(nome)
          ? 'Cucina abitabile'
          : /letto|camera|matrimoniale|singola/i.test(nome)
            ? 'Camera'
            : /soggiorno|pranzo|living|salone/i.test(nome)
              ? 'Soggiorno'
              : 'Residenziale';

  return {
    id:
      typeof raw.id === 'string' && raw.id.trim()
        ? raw.id.trim()
        : `synaps-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    nome: nome || `Vano Synaps ${index + 1}`,
    destinazione,
    superficie: Number(superficie.toFixed(2)),
    superfFinestrata: Number(superfFinestrata.toFixed(2)),
    altezzaMedia: Number((altezzaMedia > 0 ? altezzaMedia : 2.7).toFixed(2)),
    vmc,
    note:
      typeof raw.note === 'string' && raw.note.trim()
        ? raw.note.trim()
        : 'Importato da documento / output Synaps',
  };
}

function estraiVaniDaOggetto(data: unknown): Vano[] {
  const trovati: Vano[] = [];

  const visita = (nodo: unknown) => {
    if (!nodo) return;
    if (Array.isArray(nodo)) {
      for (const item of nodo) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const vano = normalizzaRecordInVano(
            item as Record<string, unknown>,
            trovati.length
          );
          if (vano) {
            trovati.push(vano);
            continue;
          }
        }
        visita(item);
      }
      return;
    }

    if (typeof nodo === 'object') {
      const obj = nodo as Record<string, unknown>;
      const chiaviVani = [
        'vani',
        'rooms',
        'ambienti',
        'locali',
        'spazi',
        'planimetria',
        'risultati',
        'data',
      ];
      for (const chiave of chiaviVani) {
        if (obj[chiave] !== undefined) {
          visita(obj[chiave]);
        }
      }
    }
  };

  visita(data);
  return trovati;
}

function estraiVaniDaTesto(testo: string): Vano[] {
  const pulito = testo.trim();
  if (!pulito) return [];

  if (pulito.startsWith('{') || pulito.startsWith('[')) {
    try {
      const parsed = JSON.parse(pulito);
      const daJson = estraiVaniDaOggetto(parsed);
      if (daJson.length > 0) return daJson;
    } catch {
      // Prosegue con parse testuale/CSV
    }
  }

  const righe = pulito
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean);

  if (righe.length === 0) return [];

  const separatore = righe[0].includes(';')
    ? ';'
    : righe[0].includes('\t')
      ? '\t'
      : righe[0].includes('|')
        ? '|'
        : ',';

  const colonne = righe[0].split(separatore).map((c) => c.trim().toLowerCase());
  const haIntestazione = colonne.some((c) =>
    /nome|vano|room|sup|mq|area|consistenza|altezza|h\b|finestr|destinazione/.test(c)
  );

  const vani: Vano[] = [];
  const startIdx = haIntestazione ? 1 : 0;

  for (let i = startIdx; i < righe.length; i++) {
    const parti = righe[i].split(separatore).map((p) => p.trim());
    if (parti.length < 2) continue;

    if (haIntestazione) {
      const record: Record<string, string> = {};
      colonne.forEach((col, cIdx) => {
        record[col] = parti[cIdx] ?? '';
      });
      const vano = normalizzaRecordInVano(record, vani.length);
      if (vano) vani.push(vano);
    } else {
      const nome = parti[0];
      const supMatch = righe[i].match(/(\d+(?:[.,]\d+)?)\s*(?:m²|mq|m2)\b/i);
      const hMatch = righe[i].match(
        /\b(?:h|alt(?:ezza)?)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*m?\b/i
      );
      const finMatch = righe[i].match(
        /\b(?:fin(?:estrata)?|rai|apribile)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:m²|mq|m2)?\b/i
      );

      const superficie = supMatch
        ? parseNumero(supMatch[1], 0)
        : parseNumero(parti[1], 0);
      const altezzaMedia = hMatch
        ? parseNumero(hMatch[1], 2.7)
        : parseNumero(parti[2], 2.7);
      const superfFinestrata = finMatch
        ? parseNumero(finMatch[1], 0)
        : parseNumero(parti[3], 0);

      const vano = normalizzaRecordInVano(
        {
          nome,
          destinazione: parti.find((p) =>
            /soggiorno|cucina|camera|letto|bagno|wc|studio|ingresso|corridoio|disimpegno/i.test(
              p
            )
          ),
          superficie,
          altezzaMedia: altezzaMedia > 0 ? altezzaMedia : 2.7,
          superfFinestrata,
          vmc: /vmc|aerazione forzata|meccanica/i.test(righe[i]),
        },
        vani.length
      );
      if (vano) vani.push(vano);
    }
  }

  return vani;
}

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

  aggiungiVano: (
    commessaIdOrVano?: string | Partial<Vano>,
    maybeVano?: Partial<Vano>
  ) => void;
  addVano: (commessaIdOrVano?: string | Partial<Vano>, maybeVano?: Partial<Vano>) => void;
  aggiornaVano: (
    commessaIdOrVanoId: string,
    vanoIdOrPatch: string | Partial<Vano>,
    maybePatch?: Partial<Vano>
  ) => void;
  updateVano: (
    commessaIdOrVanoId: string,
    vanoIdOrPatch: string | Partial<Vano>,
    maybePatch?: Partial<Vano>
  ) => void;
  rimuoviVano: (commessaIdOrVanoId: string, maybeVanoId?: string) => void;
  deleteVano: (commessaIdOrVanoId: string, maybeVanoId?: string) => void;
  removeVano: (commessaIdOrVanoId: string, maybeVanoId?: string) => void;

  importaDaSynaps: (
    fileOrPayload:
      | File
      | string
      | Record<string, unknown>
      | Array<Record<string, unknown>>,
    options?: { commessaId?: string; modalita?: 'sostituisci' | 'unisci' }
  ) => Promise<RisultatoImportSynaps>;
  caricaSynaps: (
    fileOrPayload:
      | File
      | string
      | Record<string, unknown>
      | Array<Record<string, unknown>>,
    options?: { commessaId?: string; modalita?: 'sostituisci' | 'unisci' }
  ) => Promise<RisultatoImportSynaps>;
  importaVaniDaSynaps: (
    fileOrPayload:
      | File
      | string
      | Record<string, unknown>
      | Array<Record<string, unknown>>,
    options?: { commessaId?: string; modalita?: 'sostituisci' | 'unisci' }
  ) => Promise<RisultatoImportSynaps>;
  importaDaDocumento: (
    file: File,
    options?: {
      commessaId?: string;
      categoria?: string;
      modalita?: 'sostituisci' | 'unisci';
    }
  ) => Promise<RisultatoImportDocumento>;

  setVoci: (commessaId: string, nuoveVoci: Array<Partial<VoceComputo>>) => void;
  aggiungiVoce: (
    commessaIdOrVoce?: string | Partial<VoceComputo>,
    maybeVoce?: Partial<VoceComputo>
  ) => void;
  addVoce: (
    commessaIdOrVoce?: string | Partial<VoceComputo>,
    maybeVoce?: Partial<VoceComputo>
  ) => void;
  aggiornaVoce: (
    commessaIdOrVoceId: string,
    voceIdOrPatch: string | Partial<VoceComputo>,
    maybePatch?: Partial<VoceComputo>
  ) => void;
  updateVoce: (
    commessaIdOrVoceId: string,
    voceIdOrPatch: string | Partial<VoceComputo>,
    maybePatch?: Partial<VoceComputo>
  ) => void;
  eliminaVoce: (commessaIdOrVoceId: string, maybeVoceId?: string) => void;
  rimuoviVoce: (commessaIdOrVoceId: string, maybeVoceId?: string) => void;
  deleteVoce: (commessaIdOrVoceId: string, maybeVoceId?: string) => void;
  removeVoce: (commessaIdOrVoceId: string, maybeVoceId?: string) => void;

  popolaVociLazio: (commessaId?: string) => void;
  popolaVociTipoLazio: (commessaId?: string) => void;
  popolaComputoLazio: (commessaId?: string) => void;
  aggiungiVociTipoLazio: (commessaId?: string) => void;
  seedVociLazio: (commessaId?: string) => void;
  popolaDefault: (commessaId?: string) => void;
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
    (set, get) => {
      const applicaVaniImportati = (
        vaniEstratti: Vano[],
        options?: { commessaId?: string; modalita?: 'sostituisci' | 'unisci' }
      ): RisultatoImportSynaps => {
        const targetId = options?.commessaId || get().attivaId;
        const modalita = options?.modalita ?? 'sostituisci';

        if (!targetId) {
          return {
            ok: false,
            vaniImportati: 0,
            superficieTotale: 0,
            messaggio: 'Nessuna commessa attiva selezionata.',
            vani: [],
          };
        }

        if (vaniEstratti.length === 0) {
          return {
            ok: false,
            vaniImportati: 0,
            superficieTotale: 0,
            messaggio:
              'Nessun vano riconosciuto nel file. Verifica che siano presenti nome/ambiente, superficie (mq) e altezza.',
            vani: [],
          };
        }

        let listaFinale = vaniEstratti;
        set((state) => {
          const attuali = state.vani[targetId] ?? [];
          listaFinale =
            modalita === 'unisci' ? [...attuali, ...vaniEstratti] : vaniEstratti;
          return {
            vani: {
              ...state.vani,
              [targetId]: listaFinale,
            },
          };
        });

        const superficieTotale = Number(
          listaFinale
            .reduce((acc, v) => acc + (Number(v.superficie) || 0), 0)
            .toFixed(2)
        );

        return {
          ok: true,
          vaniImportati: vaniEstratti.length,
          superficieTotale,
          messaggio: `Importati ${vaniEstratti.length} vani (${superficieTotale.toFixed(2)} mq totali).`,
          vani: listaFinale,
        };
      };

      const handleImportaDaSynaps = async (
        fileOrPayload:
          | File
          | string
          | Record<string, unknown>
          | Array<Record<string, unknown>>,
        options?: { commessaId?: string; modalita?: 'sostituisci' | 'unisci' }
      ): Promise<RisultatoImportSynaps> => {
        if (typeof File !== 'undefined' && fileOrPayload instanceof File) {
          const contenuto = await fileOrPayload.text();
          const estratti = estraiVaniDaTesto(contenuto);
          return applicaVaniImportati(estratti, options);
        }

        if (typeof fileOrPayload === 'string') {
          const estratti = estraiVaniDaTesto(fileOrPayload);
          return applicaVaniImportati(estratti, options);
        }

        const estratti = estraiVaniDaOggetto(fileOrPayload);
        return applicaVaniImportati(estratti, options);
      };

      const handleAggiungiVano = (
        commessaIdOrVano?: string | Partial<Vano>,
        maybeVano?: Partial<Vano>
      ) => {
        const targetId =
          typeof commessaIdOrVano === 'string' ? commessaIdOrVano : get().attivaId;
        const dati =
          typeof commessaIdOrVano === 'object' && commessaIdOrVano !== null
            ? commessaIdOrVano
            : maybeVano;
        if (!targetId) return;

        const esistenti = get().vani[targetId] ?? [];
        const nuovoVano: Vano = {
          id: dati?.id || `vano-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          nome: dati?.nome?.trim() || `Vano ${esistenti.length + 1}`,
          destinazione: dati?.destinazione?.trim() || 'Soggiorno',
          superficie: dati?.superficie !== undefined ? Number(dati.superficie) : 14,
          superfFinestrata:
            dati?.superfFinestrata !== undefined ? Number(dati.superfFinestrata) : 2.0,
          altezzaMedia:
            dati?.altezzaMedia !== undefined ? Number(dati.altezzaMedia) : 3.0,
          vmc: Boolean(dati?.vmc),
          note: dati?.note,
        };

        set((state) => ({
          vani: {
            ...state.vani,
            [targetId]: [...(state.vani[targetId] ?? []), nuovoVano],
          },
        }));
      };

      const handleAggiornaVano = (
        commessaIdOrVanoId: string,
        vanoIdOrPatch: string | Partial<Vano>,
        maybePatch?: Partial<Vano>
      ) => {
        const hasExplicitCommessa = typeof vanoIdOrPatch === 'string';
        const targetId = hasExplicitCommessa ? commessaIdOrVanoId : get().attivaId;
        const vanoId = hasExplicitCommessa ? vanoIdOrPatch : commessaIdOrVanoId;
        const patch = (hasExplicitCommessa ? maybePatch : vanoIdOrPatch) ?? {};
        if (!targetId || !vanoId) return;

        set((state) => ({
          vani: {
            ...state.vani,
            [targetId]: (state.vani[targetId] ?? []).map((v) =>
              v.id === vanoId ? { ...v, ...patch } : v
            ),
          },
        }));
      };

      const handleRimuoviVano = (commessaIdOrVanoId: string, maybeVanoId?: string) => {
        const hasExplicitCommessa = typeof maybeVanoId === 'string';
        const targetId = hasExplicitCommessa ? commessaIdOrVanoId : get().attivaId;
        const vanoId = hasExplicitCommessa ? maybeVanoId! : commessaIdOrVanoId;
        if (!targetId || !vanoId) return;

        set((state) => ({
          vani: {
            ...state.vani,
            [targetId]: (state.vani[targetId] ?? []).filter((v) => v.id !== vanoId),
          },
        }));
      };

      const normalizzaVoce = (
        dati: Partial<VoceComputo> | undefined,
        fallbackId: string
      ): VoceComputo => {
        const um = dati?.unitaMisura?.trim() || dati?.um?.trim() || 'mq';
        const qta = dati?.quantita !== undefined ? Number(dati.quantita) : 1;
        const prezzo =
          dati?.prezzoUnitario !== undefined
            ? Number(dati.prezzoUnitario)
            : dati?.prezzo !== undefined
              ? Number(dati.prezzo)
              : 35;
        const sicurezza = Boolean(dati?.oneriSicurezza ?? dati?.sicurezza);

        return buildVoce(
          dati?.id || fallbackId,
          dati?.codice?.trim() || 'A 01.01.001.a',
          dati?.descrizione?.trim() || 'Nuova lavorazione Prezzario Lazio',
          um,
          qta,
          prezzo,
          sicurezza,
          dati?.categoria?.trim() || 'Opere edili'
        );
      };

      const handleSetVoci = (
        commessaId: string,
        nuoveVoci: Array<Partial<VoceComputo>>
      ) => {
        const targetId = commessaId || get().attivaId;
        if (!targetId) return;

        const normalizzate = (nuoveVoci ?? []).map((item, idx) =>
          normalizzaVoce(
            item,
            item.id || `voce-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`
          )
        );

        set((state) => ({
          voci: {
            ...state.voci,
            [targetId]: normalizzate,
          },
        }));
      };

      const handleAggiungiVoce = (
        commessaIdOrVoce?: string | Partial<VoceComputo>,
        maybeVoce?: Partial<VoceComputo>
      ) => {
        const targetId =
          typeof commessaIdOrVoce === 'string' ? commessaIdOrVoce : get().attivaId;
        const dati =
          typeof commessaIdOrVoce === 'object' && commessaIdOrVoce !== null
            ? commessaIdOrVoce
            : maybeVoce;
        if (!targetId) return;

        const nuovaVoce = normalizzaVoce(
          dati,
          `voce-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        );

        set((state) => ({
          voci: {
            ...state.voci,
            [targetId]: [...(state.voci[targetId] ?? []), nuovaVoce],
          },
        }));
      };

      const handleAggiornaVoce = (
        commessaIdOrVoceId: string,
        voceIdOrPatch: string | Partial<VoceComputo>,
        maybePatch?: Partial<VoceComputo>
      ) => {
        const hasExplicitCommessa = typeof voceIdOrPatch === 'string';
        const targetId = hasExplicitCommessa ? commessaIdOrVoceId : get().attivaId;
        const voceId = hasExplicitCommessa ? voceIdOrPatch : commessaIdOrVoceId;
        const patch = (hasExplicitCommessa ? maybePatch : voceIdOrPatch) ?? {};
        if (!targetId || !voceId) return;

        set((state) => ({
          voci: {
            ...state.voci,
            [targetId]: (state.voci[targetId] ?? []).map((item) => {
              if (item.id !== voceId) return item;
              const nextUm = patch.unitaMisura ?? patch.um ?? item.unitaMisura;
              const nextQta =
                patch.quantita !== undefined ? Number(patch.quantita) : item.quantita;
              const nextPrezzo =
                patch.prezzoUnitario !== undefined
                  ? Number(patch.prezzoUnitario)
                  : patch.prezzo !== undefined
                    ? Number(patch.prezzo)
                    : item.prezzoUnitario;
              const nextSic =
                patch.oneriSicurezza !== undefined
                  ? Boolean(patch.oneriSicurezza)
                  : patch.sicurezza !== undefined
                    ? Boolean(patch.sicurezza)
                    : item.oneriSicurezza;

              return {
                ...item,
                ...patch,
                categoria: patch.categoria ?? item.categoria ?? 'Opere edili',
                unitaMisura: nextUm,
                um: nextUm,
                quantita: nextQta,
                prezzoUnitario: nextPrezzo,
                prezzo: nextPrezzo,
                importo: Number((nextQta * nextPrezzo).toFixed(2)),
                oneriSicurezza: nextSic,
                sicurezza: nextSic,
              };
            }),
          },
        }));
      };

      const handleRimuoviVoce = (commessaIdOrVoceId: string, maybeVoceId?: string) => {
        const hasExplicitCommessa = typeof maybeVoceId === 'string';
        const targetId = hasExplicitCommessa ? commessaIdOrVoceId : get().attivaId;
        const voceId = hasExplicitCommessa ? maybeVoceId! : commessaIdOrVoceId;
        if (!targetId || !voceId) return;

        set((state) => ({
          voci: {
            ...state.voci,
            [targetId]: (state.voci[targetId] ?? []).filter((item) => item.id !== voceId),
          },
        }));
      };

      const handlePopolaLazio = (commessaId?: string) => {
        const targetId = typeof commessaId === 'string' ? commessaId : get().attivaId;
        if (!targetId) return;

        const generate: VoceComputo[] = VOCI_TIPO_LAZIO.map((v, i) =>
          buildVoce(
            `laz-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
            v.codice,
            v.descrizione,
            v.unitaMisura,
            v.quantita,
            v.prezzoUnitario,
            Boolean(v.oneriSicurezza),
            v.categoria
          )
        );

        set((state) => ({
          voci: {
            ...state.voci,
            [targetId]: generate,
          },
        }));
      };

      const handleImportaDaDocumento = async (
        file: File,
        options?: {
          commessaId?: string;
          categoria?: string;
          modalita?: 'sostituisci' | 'unisci';
        }
      ): Promise<RisultatoImportDocumento> => {
        const targetId = options?.commessaId || get().attivaId;
        if (!targetId) {
          return {
            vaniAggiunti: 0,
            vociAggiornate: 0,
            riepilogo: 'Nessuna commessa attiva.',
          };
        }

        let testo = '';
        try {
          testo = await file.text();
        } catch {
          testo = '';
        }

        const estratti = testo ? estraiVaniDaTesto(testo) : [];
        let vaniAggiunti = 0;

        if (estratti.length > 0) {
          const res = applicaVaniImportati(estratti, {
            commessaId: targetId,
            modalita: options?.modalita ?? 'unisci',
          });
          vaniAggiunti = res.vaniImportati;
        }

        const mqMatch = `${file.name} ${testo.slice(0, 2000)}`.match(
          /(\d+(?:[.,]\d+)?)\s*(?:m²|mq|m2)\b/i
        );
        const mqRilevati = mqMatch ? parseNumero(mqMatch[1], 0) : 0;

        let vociAggiornate = 0;
        const catLower = (options?.categoria ?? '').toLowerCase();
        const isComputoOrCatasto =
          /computo|preventiv|catast|planimetr|rai|impiant/.test(catLower) ||
          mqRilevati > 0;

        if (mqRilevati > 0 && isComputoOrCatasto) {
          const vociAttuali = get().voci[targetId] ?? [];
          if (vociAttuali.length > 0) {
            set((state) => ({
              voci: {
                ...state.voci,
                [targetId]: (state.voci[targetId] ?? []).map((v) => {
                  if (v.oneriSicurezza) return v;
                  if (v.unitaMisura === 'mq' || v.unitaMisura === 'm²' || v.um === 'mq') {
                    vociAggiornate += 1;
                    const q = Number(mqRilevati.toFixed(2));
                    const p = Number(v.prezzoUnitario) || 0;
                    return {
                      ...v,
                      quantita: q,
                      importo: Number((q * p).toFixed(2)),
                    };
                  }
                  return v;
                }),
              },
            }));
          } else {
            handlePopolaLazio(targetId);
            vociAggiornate = VOCI_TIPO_LAZIO.length;
          }
        }

        const partiRiepilogo: string[] = [];
        if (vaniAggiunti > 0) {
          partiRiepilogo.push(
            `${vaniAggiunti} vani sincronizzati su Audit & RAI / Abachi`
          );
        }
        if (vociAggiornate > 0) {
          partiRiepilogo.push(`${vociAggiornate} voci collegate su Computo Metrico`);
        }
        if (partiRiepilogo.length === 0) {
          partiRiepilogo.push('Archiviato nel fascicolo e collegato alla commessa');
        }

        return {
          vaniAggiunti,
          vociAggiornate,
          riepilogo: partiRiepilogo.join(' · '),
        };
      };

      return {
        commesse: INITIAL_COMMESSE,
        attivaId: INITIAL_COMMESSA_ID,
        steps: {
          [INITIAL_COMMESSA_ID]: [...DEFAULT_STEPS],
        },
        vani: {
          [INITIAL_COMMESSA_ID]: VANI_ESEMPIO_72MQ.map((v) => ({ ...v })),
        },
        voci: {
          [INITIAL_COMMESSA_ID]: [],
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
                titolo:
                  patch.titolo !== undefined ? patch.titolo.trim() || c.titolo : c.titolo,
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
          const aggiornati = corrente.map((val, idx) =>
            idx === idxToToggle ? !val : val
          );

          set({
            steps: {
              ...steps,
              [targetId]: aggiornati,
            },
          });
        },

        aggiungiVano: handleAggiungiVano,
        addVano: handleAggiungiVano,
        aggiornaVano: handleAggiornaVano,
        updateVano: handleAggiornaVano,
        rimuoviVano: handleRimuoviVano,
        deleteVano: handleRimuoviVano,
        removeVano: handleRimuoviVano,

        importaDaSynaps: handleImportaDaSynaps,
        caricaSynaps: handleImportaDaSynaps,
        importaVaniDaSynaps: handleImportaDaSynaps,
        importaDaDocumento: handleImportaDaDocumento,

        setVoci: handleSetVoci,
        aggiungiVoce: handleAggiungiVoce,
        addVoce: handleAggiungiVoce,
        aggiornaVoce: handleAggiornaVoce,
        updateVoce: handleAggiornaVoce,
        eliminaVoce: handleRimuoviVoce,
        rimuoviVoce: handleRimuoviVoce,
        deleteVoce: handleRimuoviVoce,
        removeVoce: handleRimuoviVoce,

        popolaVociLazio: handlePopolaLazio,
        popolaVociTipoLazio: handlePopolaLazio,
        popolaComputoLazio: handlePopolaLazio,
        aggiungiVociTipoLazio: handlePopolaLazio,
        seedVociLazio: handlePopolaLazio,
        popolaDefault: handlePopolaLazio,
      };
    },
    {
      name: 'my-archinext-store-v6',
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