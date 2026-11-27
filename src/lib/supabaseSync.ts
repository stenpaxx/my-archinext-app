import { getSupabase } from './supabase';
import { useStore } from './store';
import type { Commessa, Vano, VoceComputo } from './types';

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

const EMPTY_STEPS: boolean[] = [false, false, false, false, false, false];

export async function caricaDaSupabase() {
  const sb = getSupabase();
  if (!sb) return null;

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data: commesseRows, error } = await sb
    .from('commesse')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !commesseRows || commesseRows.length === 0) return null;

  const stepsLoaded: Record<string, boolean[]> = {};

  const commesse: Commessa[] = commesseRows.map((r) => {
    const dc = (r.dati_catastali ?? {}) as Record<string, unknown>;
    const proc =
      (dc.dettagliProcedimento as Record<string, string> | undefined) ??
      ((r.dettagli_procedimento as Record<string, string> | undefined) ?? {});

    if (Array.isArray(dc.steps)) {
      stepsLoaded[r.id] = EMPTY_STEPS.map((_, idx) => Boolean(dc.steps[idx]));
    }

    return {
      id: r.id,
      codice: r.codice_commessa,
      titolo: r.titolo,
      indirizzo: r.indirizzo ?? '',
      municipio: r.municipio ?? 'Municipio I',
      foglio: String(dc.foglio ?? ''),
      particella: String(dc.particella ?? ''),
      subalterno: String(dc.subalterno ?? ''),
      categoriaCatastale: String(dc.categoria ?? 'A/2'),
      rendita: String(dc.rendita ?? ''),
      tipologia: r.tipologia_intervento ?? 'Manutenzione Straordinaria CILA',
      tessutoPRG: r.tessuto_prg ?? '',
      cartaQualita: Boolean(r.carta_qualita),
      vincoloSoprintendenza: Boolean(r.vincoli_note),
      dettagliProcedimento: proc,
      createdAt: r.created_at,
    } as Commessa;
  });

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
      superficie: Number(v.superficie_calpestabile) || 0,
      superfFinestrata: Number(v.superficie_finestrata_apribile) || 0,
      altezzaMedia: Number(v.altezza_media_ponderale) || 2.7,
      vmc: (v.note_tecniche ?? '').includes('VMC'),
    });
  });

  const voci: Record<string, VoceComputo[]> = {};
  (vociRes.data ?? []).forEach((vc) => {
    if (!voci[vc.commessa_id]) voci[vc.commessa_id] = [];
    const codice = vc.codice_prezzario ?? '';
    const categoria = vc.categoria_wbs ?? 'Opere edili';
    const um = vc.unita_misura ?? 'mq';
    const q = Number(vc.quantita) || 0;
    const p = Number(vc.prezzo_unitario) || 0;
    const sicurezza = Boolean(vc.is_sicurezza_non_ribassabile);

    voci[vc.commessa_id].push({
      id: vc.id,
      codice,
      codicePrezzario: codice,
      categoria,
      wbs: categoria,
      descrizione: vc.descrizione ?? '',
      unitaMisura: um,
      um,
      quantita: q,
      prezzoUnitario: p,
      prezzo: p,
      importo: Number((q * p).toFixed(2)),
      oneriSicurezza: sicurezza,
      sicurezza,
    });
  });

  return { commesse, vani, voci, steps: stepsLoaded };
}

export async function sincronizzaCommessaSuSupabase(
  c: Commessa,
  vaniCommessa: Vano[] = [],
  vociCommessa: VoceComputo[] = []
) {
  const sb = getSupabase();
  if (!sb) throw new Error('Client Supabase non configurato');

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    throw new Error('Effettua il login per sincronizzare su Cloud');
  }

  const currentState = useStore.getState();
  const stepsCommessa = currentState.steps?.[c.id] ?? EMPTY_STEPS;
  const dettagliProc =
    ((c as unknown as { dettagliProcedimento?: Record<string, string> })
      .dettagliProcedimento) ?? {};

  let safeCommessaId = c.id;
  if (!isUuid(c.id)) {
    safeCommessaId = crypto.randomUUID();
    useStore.setState((prev) => {
      const nextSteps = { ...prev.steps };
      if (prev.steps?.[c.id]) {
        nextSteps[safeCommessaId] = prev.steps[c.id];
      }
      return {
        commesse: prev.commesse.map((item) =>
          item.id === c.id ? { ...item, id: safeCommessaId } : item
        ),
        attivaId: prev.attivaId === c.id ? safeCommessaId : prev.attivaId,
        vani: {
          ...prev.vani,
          [safeCommessaId]: prev.vani[c.id] ?? vaniCommessa,
        },
        voci: {
          ...prev.voci,
          [safeCommessaId]: prev.voci[c.id] ?? vociCommessa,
        },
        steps: nextSteps,
      };
    });
  }

  const { error: errComm } = await sb.from('commesse').upsert(
    {
      id: safeCommessaId,
      user_id: user.id,
      codice_commessa: c.codice,
      titolo: c.titolo,
      indirizzo: c.indirizzo,
      municipio: c.municipio,
      dati_catastali: {
        foglio: c.foglio ?? '',
        particella: c.particella ?? '',
        subalterno: c.subalterno ?? '',
        categoria: c.categoriaCatastale ?? 'A/2',
        rendita: c.rendita ?? '',
        dettagliProcedimento: dettagliProc,
        steps: stepsCommessa,
      },
      tipologia_intervento: c.tipologia ?? 'Manutenzione Straordinaria CILA',
      tessuto_prg: c.tessutoPRG ?? '',
      carta_qualita: Boolean(c.cartaQualita),
      vincoli_note: c.vincoloSoprintendenza ? 'Vincolo D.Lgs 42/2004' : '',
    },
    { onConflict: 'id' }
  );
  if (errComm) throw new Error(`Commessa: ${errComm.message}`);

  const { error: delRaiErr } = await sb
    .from('verifiche_rai')
    .delete()
    .eq('commessa_id', safeCommessaId);
  if (delRaiErr) throw new Error(`Pulizia RAI: ${delRaiErr.message}`);

  if (vaniCommessa.length > 0) {
    const { error: errRai } = await sb.from('verifiche_rai').insert(
      vaniCommessa.map((v) => ({
        id: isUuid(v.id) ? v.id : crypto.randomUUID(),
        commessa_id: safeCommessaId,
        nome_vano: v.nome || 'Vano senza nome',
        destinazione_uso: v.destinazione || 'Soggiorno',
        superficie_calpestabile: Number(v.superficie) || 0,
        superficie_finestrata_apribile: Number(v.superfFinestrata) || 0,
        altezza_media_ponderale: Number(v.altezzaMedia) || 2.7,
        note_tecniche: v.vmc ? 'VMC attiva' : '',
      }))
    );
    if (errRai) throw new Error(`Vani RAI: ${errRai.message}`);
  }

  const { error: delVociErr } = await sb
    .from('voci_computo')
    .delete()
    .eq('commessa_id', safeCommessaId);
  if (delVociErr) throw new Error(`Pulizia computo: ${delVociErr.message}`);

  if (vociCommessa.length > 0) {
    const { error: errVoci } = await sb.from('voci_computo').insert(
      vociCommessa.map((vc, idx) => ({
        id: isUuid(vc.id) ? vc.id : crypto.randomUUID(),
        commessa_id: safeCommessaId,
        ordine: idx + 1,
        codice_prezzario: vc.codicePrezzario || vc.codice || 'A 01.01.001.a',
        categoria_wbs: vc.wbs || vc.categoria || 'Opere edili',
        descrizione: vc.descrizione || 'Voce di computo',
        unita_misura: vc.um || vc.unitaMisura || 'mq',
        quantita: Number(vc.quantita) || 0,
        prezzo_unitario: Number(vc.prezzoUnitario ?? vc.prezzo) || 0,
        is_sicurezza_non_ribassabile: Boolean(vc.oneriSicurezza ?? vc.sicurezza),
      }))
    );
    if (errVoci) throw new Error(`Voci computo: ${errVoci.message}`);
  }
}