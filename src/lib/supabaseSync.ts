import { getSupabase } from './supabase';
import type { Commessa, Vano, VoceComputo } from './types';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export async function caricaDaSupabase() {
  const sb = getSupabase();
  if (!sb) return null;

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data: commesseRows, error } = await sb
    .from('commesse')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !commesseRows || commesseRows.length === 0) return null;

  const commesse: Commessa[] = commesseRows.map((r) => ({
    id: r.id,
    codice: r.codice_commessa,
    titolo: r.titolo,
    indirizzo: r.indirizzo ?? '',
    municipio: r.municipio ?? 'Municipio I',
    foglio: r.dati_catastali?.foglio ?? '',
    particella: r.dati_catastali?.particella ?? '',
    subalterno: r.dati_catastali?.subalterno ?? '',
    categoriaCatastale: r.dati_catastali?.categoria ?? 'A/2',
    rendita: String(r.dati_catastali?.rendita ?? ''),
    tipologia: r.tipologia_intervento ?? 'CILA',
    tessutoPRG: r.tessuto_prg ?? '',
    cartaQualita: Boolean(r.carta_qualita),
    vincoloSoprintendenza: Boolean(r.vincoli_note),
    createdAt: r.created_at,
  }));

  const [raiRes, vociRes] = await Promise.all([
    sb.from('verifiche_rai').select('*'),
    sb.from('voci_computo').select('*').order('ordine', { ascending: true }),
  ]);

  const vani: Record<string, Vano[]> = {};
  (raiRes.data ?? []).forEach((v) => {
    if (!vani[v.commessa_id]) vani[v.commessa_id] = [];
    vani[v.commessa_id].push({
      id: v.id,
      nome: v.nome_vano,
      destinazione: v.destinazione_uso,
      superficie: Number(v.superficie_calpestabile),
      superfFinestrata: Number(v.superficie_finestrata_apribile),
      altezzaMedia: Number(v.altezza_media_ponderale),
      vmc: (v.note_tecniche ?? '').includes('VMC'),
    });
  });

  const voci: Record<string, VoceComputo[]> = {};
  (vociRes.data ?? []).forEach((vc) => {
    if (!voci[vc.commessa_id]) voci[vc.commessa_id] = [];
    voci[vc.commessa_id].push({
      id: vc.id,
      codicePrezzario: vc.codice_prezzario,
      wbs: vc.categoria_wbs,
      descrizione: vc.descrizione,
      um: vc.unita_misura,
      quantita: Number(vc.quantita),
      prezzoUnitario: Number(vc.prezzo_unitario),
      oneriSicurezza: Boolean(vc.is_sicurezza_non_ribassabile),
    } as VoceComputo);
  });

  return { commesse, vani, voci };
}

export async function sincronizzaCommessaSuSupabase(
  c: Commessa,
  vaniCommessa: Vano[] = [],
  vociCommessa: VoceComputo[] = []
) {
  const sb = getSupabase();
  if (!sb) throw new Error('Client Supabase non configurato');

  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    throw new Error('Effettua il login per sincronizzare su Cloud');
  }

  const safeCommessaId = isUuid(c.id) ? c.id : crypto.randomUUID();

  const { error: errComm } = await sb.from('commesse').upsert({
    id: safeCommessaId,
    user_id: user.id,
    codice_commessa: c.codice,
    titolo: c.titolo,
    indirizzo: c.indirizzo,
    municipio: c.municipio,
    dati_catastali: {
      foglio: c.foglio,
      particella: c.particella,
      subalterno: c.subalterno,
      categoria: c.categoriaCatastale,
      rendita: c.rendita,
    },
    tipologia_intervento: c.tipologia,
    tessuto_prg: c.tessutoPRG,
    carta_qualita: c.cartaQualita,
    vincoli_note: c.vincoloSoprintendenza ? 'Vincolo D.Lgs 42/2004' : '',
  });
  if (errComm) throw errComm;

  await sb.from('verifiche_rai').delete().eq('commessa_id', safeCommessaId);
  if (vaniCommessa.length > 0) {
    const { error: errRai } = await sb.from('verifiche_rai').insert(
      vaniCommessa.map((v) => ({
        id: isUuid(v.id) ? v.id : crypto.randomUUID(),
        commessa_id: safeCommessaId,
        nome_vano: v.nome || 'Vano senza nome',
        destinazione_uso: v.destinazione,
        superficie_calpestabile: v.superficie,
        superficie_finestrata_apribile: v.superfFinestrata,
        altezza_media_ponderale: v.altezzaMedia,
        note_tecniche: v.vmc ? 'VMC attiva' : '',
      }))
    );
    if (errRai) throw errRai;
  }

  await sb.from('voci_computo').delete().eq('commessa_id', safeCommessaId);
  if (vociCommessa.length > 0) {
    const { error: errVoci } = await sb.from('voci_computo').insert(
      vociCommessa.map((vc, idx) => ({
        id: isUuid(vc.id) ? vc.id : crypto.randomUUID(),
        commessa_id: safeCommessaId,
        ordine: idx + 1,
        codice_prezzario: vc.codicePrezzario,
        categoria_wbs: vc.wbs,
        descrizione: vc.descrizione,
        unita_misura: vc.um,
        quantita: vc.quantita,
        prezzo_unitario: vc.prezzoUnitario,
        is_sicurezza_non_ribassabile: vc.oneriSicurezza,
      }))
    );
    if (errVoci) throw errVoci;
  }
}