import * as XLSX from 'xlsx';
import type { AbacoInfissi, AbacoSanitari, Commessa, Vano, VoceComputo } from './types';

const eur = (n: number) =>
  n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

export function esportaExcel(
  commessa: Commessa,
  voci: VoceComputo[],
  infissi: AbacoInfissi[],
  sanitari: AbacoSanitari[],
  vani: Vano[]
) {
  const lavori = voci.filter((v) => !v.oneriSicurezza);
  const sicurezza = voci.filter((v) => v.oneriSicurezza);
  const totLavori = lavori.reduce((a, v) => a + v.quantita * v.prezzoUnitario, 0);
  const totSicurezza = sicurezza.reduce((a, v) => a + v.quantita * v.prezzoUnitario, 0);

  const header = ['Codice Prezzario Lazio', 'Categoria WBS', 'Descrizione', 'UM', 'Quantità', 'Prezzo Unitario (€)', 'Importo (€)', 'Oneri Sicurezza'];

  const riga = (v: VoceComputo) => [
    v.codicePrezzario, v.wbs, v.descrizione, v.um,
    v.quantita, v.prezzoUnitario,
    Number((v.quantita * v.prezzoUnitario).toFixed(2)),
    v.oneriSicurezza ? 'SI' : 'NO',
  ];

  // Foglio 1: Computo Metrico
  const computoRows = [
    [`COMMESSA ${commessa.codice} — ${commessa.titolo}`],
    [`${commessa.indirizzo} — ${commessa.municipio}, Roma`],
    [`Fg. ${commessa.foglio} / Part. ${commessa.particella} / Sub. ${commessa.subalterno} — Cat. ${commessa.categoriaCatastale}`],
    [],
    header,
    ...lavori.map(riga),
    [],
    ['TOTALE LAVORI (SOGGETTO A RIBASSO D\'ASTA)', '', '', '', '', '', Number(totLavori.toFixed(2)), ''],
    ...sicurezza.map(riga),
    ['TOTALE ONERI SICUREZZA (NON SOGGETTI A RIBASSO)', '', '', '', '', '', Number(totSicurezza.toFixed(2)), 'SI'],
    ['TOTALE GENERALE COMMESSA (€)', '', '', '', '', '', Number((totLavori + totSicurezza).toFixed(2)), ''],
  ];
  const wsComputo = XLSX.utils.aoa_to_sheet(computoRows);
  wsComputo['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 70 }, { wch: 6 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];

  // Foglio 2: Quadro Economico
  const quadroRows = [
    ['QUADRO ECONOMICO — ' + commessa.codice],
    [],
    ['Voce', 'Importo (€)'],
    ['Totale Lavori (soggetto a ribasso d\'asta)', Number(totLavori.toFixed(2))],
    ['Totale Oneri della Sicurezza (non soggetti a ribasso)', Number(totSicurezza.toFixed(2))],
    ['TOTALE GENERALE COMMESSA', Number((totLavori + totSicurezza).toFixed(2))],
    [],
    ['Ribasso d\'asta ipotizzato', ''],
    ['Importo offerta (es. -15%)', Number((totLavori * 0.85).toFixed(2))],
  ];
  const wsQuadro = XLSX.utils.aoa_to_sheet(quadroRows);
  wsQuadro['!cols'] = [{ wch: 50 }, { wch: 16 }];

  // Foglio 3: Abachi
  const abachiRows: (string | number)[][] = [
    ['ABACO INFISSI'],
    ['Locale', 'Tipo', 'Dimensioni', 'Quantità', 'Prezzo Unitario (€)', 'Importo (€)'],
    ...infissi.map((i) => [i.locale, i.tipo, i.dimensioni, i.quantita, i.prezzoUnitario, Number((i.quantita * i.prezzoUnitario).toFixed(2))]),
    [],
    ['ABACO SANITARI'],
    ['Ambiente', 'Apparecchio', 'Quantità', 'Prezzo Unitario (€)', 'Importo (€)'],
    ...sanitari.map((s) => [s.ambiente, s.apparecchio, s.quantita, s.prezzoUnitario, Number((s.quantita * s.prezzoUnitario).toFixed(2))]),
    [],
    ['AUDIT VANI (RAI)'],
    ['Vano', 'Destinazione', 'Sup. mq', 'Finestrata mq', 'H media m', 'RAI', 'Esito'],
    ...vani.map((v) => {
      const rai = v.superficie > 0 ? v.superfFinestrata / v.superficie : 0;
      return [v.nome, v.destinazione, v.superficie, v.superfFinestrata, v.altezzaMedia, Number(rai.toFixed(3)), rai >= 0.125 ? 'CONFORME' : 'NON CONFORME'];
    }),
  ];
  const wsAbachi = XLSX.utils.aoa_to_sheet(abachiRows);
  wsAbachi['!cols'] = [{ wch: 22 }, { wch: 30 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 14 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsComputo, 'Computo_Metrico');
  XLSX.utils.book_append_sheet(wb, wsQuadro, 'Quadro_Economico');
  XLSX.utils.book_append_sheet(wb, wsAbachi, 'Abachi');
  XLSX.writeFile(wb, `Computo_${commessa.codice}.xlsx`);
}

export { eur };
