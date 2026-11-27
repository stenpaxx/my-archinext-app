import type { Vano, VoceComputo } from './types';

export interface RiepilogoEconomico {
  modalita: 'computo' | 'stima' | 'vuoto';
  superficieTotale: number;
  importoLavori: number;
  oneriSicurezza: number;
  totaleGenerale: number;
  numeroVoci: number;
}

const PARAMETRO_LAVORI_MQ = 280; // €/mq stima preliminare ristrutturazione leggera/media
const PARAMETRO_SICUREZZA_MQ = 25; // €/mq stima preliminare oneri sicurezza

export function calcolaRiepilogoEconomico(
  voci: VoceComputo[] = [],
  vani: Vano[] = []
): RiepilogoEconomico {
  const superficieTotale = vani.reduce((acc, v) => acc + (Number(v.superficie) || 0), 0);

  if (voci.length > 0) {
    let importoLavori = 0;
    let oneriSicurezza = 0;

    for (const vc of voci) {
      const q = Number(vc.quantita) || 0;
      const p = Number(vc.prezzoUnitario ?? vc.prezzo) || 0;
      const tot = q * p;
      const isSicurezza = Boolean(vc.oneriSicurezza ?? vc.sicurezza);

      if (isSicurezza) {
        oneriSicurezza += tot;
      } else {
        importoLavori += tot;
      }
    }

    return {
      modalita: 'computo',
      superficieTotale,
      importoLavori,
      oneriSicurezza,
      totaleGenerale: importoLavori + oneriSicurezza,
      numeroVoci: voci.length,
    };
  }

  if (superficieTotale > 0) {
    const importoLavori = superficieTotale * PARAMETRO_LAVORI_MQ;
    const oneriSicurezza = superficieTotale * PARAMETRO_SICUREZZA_MQ;

    return {
      modalita: 'stima',
      superficieTotale,
      importoLavori,
      oneriSicurezza,
      totaleGenerale: importoLavori + oneriSicurezza,
      numeroVoci: 0,
    };
  }

  return {
    modalita: 'vuoto',
    superficieTotale: 0,
    importoLavori: 0,
    oneriSicurezza: 0,
    totaleGenerale: 0,
    numeroVoci: 0,
  };
}