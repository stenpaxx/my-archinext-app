import { getSupabase } from './supabase';

export interface VoceRegolamentoEdilizio {
  articolo: string;
  titolo: string;
  categoria: string;
  parametri_json: Record<string, number | string | boolean>;
  testo_sintesi: string;
  note_operative: string;
  versione: string;
}

export interface VoceNtaPrg {
  sigla: string;
  nome: string;
  macro_ambito: string;
  attuazione: string;
  titolo_indicativo: string;
  ammessi: string[];
  prescrizioni: string;
  note: string;
  versione: string;
}

export interface VocePrezzario {
  codice: string;
  descrizione: string;
  unita_misura: string;
  prezzo_unitario: number;
  incidenza_manodopera: number;
  categoria: string;
  fonte: string;
  versione: string;
  attivo: boolean;
}

export async function fetchCataloghiNormativi() {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      nta: [] as VoceNtaPrg[],
      regolamento: [] as VoceRegolamentoEdilizio[],
      prezzari: [] as VocePrezzario[],
      errors: {
        nta: 'Client Supabase non inizializzato',
        regolamento: 'Client Supabase non inizializzato',
        prezzari: 'Client Supabase non inizializzato',
      },
    };
  }

  const [ntaRes, recRes, prezzariRes] = await Promise.all([
    supabase.from('catalogo_nta').select('*').order('sigla'),
    supabase.from('catalogo_regolamento_edilizio').select('*').order('articolo'),
    supabase.from('catalogo_prezzari').select('*').eq('attivo', true).order('codice'),
  ]);

  return {
    nta: (ntaRes.data as VoceNtaPrg[]) || [],
    regolamento: (recRes.data as VoceRegolamentoEdilizio[]) || [],
    prezzari: (prezzariRes.data as VocePrezzario[]) || [],
    errors: {
      nta: ntaRes.error?.message || null,
      regolamento: recRes.error?.message || null,
      prezzari: prezzariRes.error?.message || null,
    },
  };
}