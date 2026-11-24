import type { VoceComputo } from '@/lib/types';

export interface VocePrezzario extends VoceComputo {
  scheda: string;
}

// Catalogo Prezzario Regionale Opere Pubbliche Lazio (estratto simbolico, prezzi indicativi €/UM)
export const PREZZARIO_LAZIO: VocePrezzario[] = [
  { id: 'pl-001', codicePrezzario: 'L1.A.02.010', scheda: 'Demolizioni', wbs: 'Demolizioni', descrizione: 'Demolizione tramezzo in laterizio sp. 12 cm con doppio intonaco gessato', um: 'mq', quantita: 0, prezzoUnitario: 17.4, oneriSicurezza: false },
  { id: 'pl-002', codicePrezzario: 'L1.A.02.025', scheda: 'Demolizioni', wbs: 'Demolizioni', descrizione: 'Demolizione tramezzo in doppialasso sp. 24 cm intonacato', um: 'mq', quantita: 0, prezzoUnitario: 24.6, oneriSicurezza: false },
  { id: 'pl-003', codicePrezzario: 'L1.A.05.015', scheda: 'Demolizioni', wbs: 'Demolizioni', descrizione: 'Demolizione pavimento in gres porcellanato su sottofondo cementizio, incluso trasporto rifiuti a terra', um: 'mq', quantita: 0, prezzoUnitario: 11.9, oneriSicurezza: false },
  { id: 'pl-004', codicePrezzario: 'L1.A.05.030', scheda: 'Demolizioni', wbs: 'Demolizioni', descrizione: 'Demolizione intonaco su muro interno, altezza superiore a 4 m', um: 'mq', quantita: 0, prezzoUnitario: 5.8, oneriSicurezza: false },
  { id: 'pl-005', codicePrezzario: 'L1.B.01.012', scheda: 'Murature', wbs: 'Murature', descrizione: 'Tramezzo in laterizio forato sp. 8 cm con malta cementizia, incluso intonaco doppia faccia', um: 'mq', quantita: 0, prezzoUnitario: 48.3, oneriSicurezza: false },
  { id: 'pl-006', codicePrezzario: 'L1.B.01.018', scheda: 'Murature', wbs: 'Murature', descrizione: 'Tramezzo in blocchi gessati forati sp. 10 cm con intonaco, per interni a secco', um: 'mq', quantita: 0, prezzoUnitario: 38.7, oneriSicurezza: false },
  { id: 'pl-007', codicePrezzario: 'L1.B.03.005', scheda: 'Murature', wbs: 'Intonaci', descrizione: 'Intonaco singolo a calce su muro interno con fondo attivante', um: 'mq', quantita: 0, prezzoUnitario: 14.2, oneriSicurezza: false },
  { id: 'pl-008', codicePrezzario: 'L1.C.01.008', scheda: 'Massetti', wbs: 'Massetti', descrizione: 'Massetto in cemento alleggerito sp. 6 cm su solaio interfloor, compresa armatura', um: 'mq', quantita: 0, prezzoUnitario: 21.5, oneriSicurezza: false },
  { id: 'pl-009', codicePrezzario: 'L1.C.02.014', scheda: 'Massetti', wbs: 'Massetti', descrizione: 'Massetto autolivellante in resina sp. 3 mm per posa incollata', um: 'mq', quantita: 0, prezzoUnitario: 12.8, oneriSicurezza: false },
  { id: 'pl-010', codicePrezzario: 'L1.D.01.021', scheda: 'Pavimenti', wbs: 'Pavimenti', descrizione: 'Pavimento in gres porcellanato 60x60 posato a colla su fondo esistente', um: 'mq', quantita: 0, prezzoUnitario: 42.6, oneriSicurezza: false },
  { id: 'pl-011', codicePrezzario: 'L1.D.01.045', scheda: 'Pavimenti', wbs: 'Pavimenti', descrizione: 'Pavimento in parquet prefinito rovere posato a incollaggio su massetto', um: 'mq', quantita: 0, prezzoUnitario: 68.9, oneriSicurezza: false },
  { id: 'pl-012', codicePrezzario: 'L1.D.02.010', scheda: 'Pavimenti', wbs: 'Pavimenti', descrizione: 'Rivestimento murale in piastrelle ceramico posato a colla, fino a soffitto', um: 'mq', quantita: 0, prezzoUnitario: 38.4, oneriSicurezza: false },
  { id: 'pl-013', codicePrezzario: 'L1.E.01.005', scheda: 'Infissi', wbs: 'Infissi', descrizione: 'Fornitura e posa finestra a garantia in legno-alluminio doppio vetro basso emissivo', um: 'pz', quantita: 0, prezzoUnitario: 680.0, oneriSicurezza: false },
  { id: 'pl-014', codicePrezzario: 'L1.E.03.012', scheda: 'Infissi', wbs: 'Infissi', descrizione: 'Fornitura e posa porta blindata classe 3 con bordo assestato e maniglione', um: 'pz', quantita: 0, prezzoUnitario: 920.0, oneriSicurezza: false },
  { id: 'pl-015', codicePrezzario: 'L2.A.01.030', scheda: 'Impianti', wbs: 'Elettrico CEI 64-8', descrizione: 'Impianto elettrico sotto intonaco con schema CEI 64-8 liv. 1: canalizzazione, punti prese e punti luce, quadro con differenziali', um: 'mq', quantita: 0, prezzoUnitario: 54.0, oneriSicurezza: false },
  { id: 'pl-016', codicePrezzario: 'L2.A.02.018', scheda: 'Impianti', wbs: 'Elettrico CEI 64-8', descrizione: 'Impianto elettrico a secco (canalizzati esterni) per locali commerciali o ristrutturazioni leggere', um: 'mq', quantita: 0, prezzoUnitario: 41.5, oneriSicurezza: false },
  { id: 'pl-017', codicePrezzario: 'L2.B.01.006', scheda: 'Impianti', wbs: 'Idrico', descrizione: 'Impianto idrico-sanitario in multistrato/PPR con allacci apparecchi sanitari, inclusi scarichi', um: 'mq', quantita: 0, prezzoUnitario: 47.8, oneriSicurezza: false },
  { id: 'pl-018', codicePrezzario: 'L2.B.02.011', scheda: 'Impianti', wbs: 'Idrico', descrizione: 'Sostituzione colonne di scarico in polipropilene con allacci apparecchi', um: 'col', quantita: 0, prezzoUnitario: 1250.0, oneriSicurezza: false },
  { id: 'pl-019', codicePrezzario: 'OS.01.001', scheda: 'Sicurezza', wbs: 'Oneri Sicurezza', descrizione: 'Oneri sicurezza: DPI (caschi, parapetti, imbragature) e attrezzature anticaduta', um: 'gg', quantita: 0, prezzoUnitario: 85.0, oneriSicurezza: true },
  { id: 'pl-020', codicePrezzario: 'OS.02.003', scheda: 'Sicurezza', wbs: 'Oneri Sicurezza', descrizione: 'Oneri sicurezza: ponteggio fassatura perimetrale con autobloccanti e reti perz.', um: 'gg', quantita: 0, prezzoUnitario: 145.0, oneriSicurezza: true },
  { id: 'pl-021', codicePrezzario: 'OS.03.002', scheda: 'Sicurezza', wbs: 'Oneri Sicurezza', descrizione: 'Oneri sicurezza: cartelli segnaletici, barriere pedonalizzate e recinzioni cantiere', um: 'gg', quantita: 0, prezzoUnitario: 45.0, oneriSicurezza: true },
];
