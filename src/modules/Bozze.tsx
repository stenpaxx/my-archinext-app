import { useMemo, useState } from 'react';
import { CopyButton } from '@/components/CopyButton';
import { Download } from 'lucide-react';
import { useStore, useAttiva } from '@/lib/store';
import { TESSUTI_PRG } from '@/lib/types';
import type { Commessa, Vano } from '@/lib/types';

const dataIt = (d = new Date()) => d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

function auditRAI(vani: Vano[]): string {
  if (vani.length === 0) return '  [Audit RAI non ancora eseguito nel modulo 2]';
  return vani.map((v) => {
    const rai = v.superficie > 0 ? v.superfFinestrata / v.superficie : 0;
    const esito = v.superficie > 0 ? (rai >= 0.125 ? 'CONFORME' : 'NON CONFORME') : 'N/D';
    return `  - ${v.nome || '(vano)'} | ${v.destinazione} | Sup. ${v.superficie.toFixed(2).replace('.', ',')} mq | Finestr. aprib. ${v.superfFinestrata.toFixed(2).replace('.', ',')} mq | RAI ${rai.toFixed(3).replace('.', ',')} ${esito}${!v.vmc && v.destinazione === 'Bagno' && v.superfFinestrata <= 0 ? ' | bagno cieco: previsto VMC' : ''}`;
  }).join('\n');
}

function relazioneSUET(c: Commessa, vani: Vano[]): string {
  const protocollo = c.tipologia.includes('SCIA') ? 'SCIA' : 'CILA';
  const tessuto = TESSUTI_PRG.find((t) => t.sigla === c.tessutoPRG);
  const raiTuttiConformi = vani.length > 0 && vani.every((v) => v.superficie <= 0 || v.superfFinestrata / v.superficie >= 0.125 || v.destinazione === 'Bagno' || v.destinazione === 'Corridoio');

  return `RELAZIONE TECNICA ${protocollo === 'SCIA' ? 'DI ASSEVERAZIONE A CORREDO DELLA SCIA' : 'ASSEVERATA A CORREDO DELLA CILA'}
(ex art. 5 DPR 380/2001 – art. 6 D.P.R. 31/2017 – DM 02/03/2017 n. 37 – SUET Roma Capitale)

Committa/e: [dati committente]
Tecnico incaricato: Arch./Ing. [nome e cognome], iscritto/a all'Ordine degli Architetti PPC di Roma n. [__]
Oggetto: ${c.titolo}
Ubicazione immobile: ${c.indirizzo || '[indirizzo]'} — ${c.municipio || '[municipio]'}, Roma Capitale
Dati catastali: Fg. ${c.foglio || '__'} — Part. ${c.particella || '__'} — Sub. ${c.subalterno || '__'} — Cat. ${c.categoriaCatastale} — Rendita ${c.rendita || '[__]'}
Tipologia intervento: ${c.tipologia}
Tessuto urbanistico PRG: ${c.tessutoPRG}${tessuto ? ` (${tessuto.nome})` : ''}

1. QUADRO URBANISTICO E VINCOLISTICO
Il sottoscritto ha verificato la conformità dell'intervento alle NTA del PRG di Roma Capitale. L'immobile è ubicato in ${tessuto ? `tessuto "${tessuto.nome}" (${tessuto.sigla})` : c.tessutoPRG}; gli interventi ammessi nel tessuto includono: ${tessuto ? tessuto.ammessi.join(', ') : '—'}.${c.cartaQualita ? '\nL\'intervento è inserito negli indirizzi della Carta per la Qualità di Roma Capitale: sono stati adottati requisiti di qualità architettonica, ambientale e di relazione con il contesto, ai fini della valutazione di quality shaping.' : ''}${c.vincoloSoprintendenza ? '\nL\'immobile è assoggettato a vincolo ex D.Lgs 42/2004 (Codice dei beni culturali e del paesaggio): si provvederà all\'acquisizione dell\'autorizzazione paesaggistica in procedimento contestato da parte della competente Soprintendenza Speciale di Roma.' : ''}

2. VERIFICA DEI RAPPORTI AEROILLUMINANTI (DM 05/07/1975)
Ai sensi del DM 05/07/1975 e del Regolamento Edilizio di Roma Capitale, si riporta l'audit dei vani con calcolo del rapporto aeroilluminante (RAI = superficie finestrata apribile / superficie calpestabile, minimo 1/8):

${auditRAI(vani)}

${raiTuttiConformi ? 'Dall\'audit risultano soddisfatti i requisiti di RAI ≥ 1/8 e le superfici minime per tutti gli ambienti abitabili.' : 'ATTENZIONE: uno o più vani risultano NON CONFORMI alla soglia RAI ≥ 1/8 o alle superfici minime del DM 05/07/1975: si rimanda all\'audit di dettaglio e alle prescrizioni progettuali per la messa a norma.'}

3. VERIFICA DISTRIBUTIVA E IMPIANTISTICA
La distribuzione dei vani è conforme ai requisiti del DM 05/07/1975; l'audit delle varianti distributive ha considerato il tracciato delle colonne di scarico esistenti. Gli impianti elettrico (CEI 64-8 — Livello di progettazione appropriato allo scenario residenziale) e idrico-sanitario sono dimensionati secondo le norme tecniche di riferimento (D.M. 37/2008).

4. CONFORMITÀ CATASTALE
L'intervento è verificato ai fini della conformità catastale ex art. 6 e 7 della Legge 652/1996; eventuali variazioni saranno documentate con aggiornamento del catastale Edifici Urbani (planimetrie frazione, atlante geografico e cascata documentale).

5. ONORABILE IMPEGNO
Il sottoscritto Tecnico, presa visione della documentazione prodotta, dichiarata sotto la propria responsabilità la verità delle cose esposte e la conformità dell'intervento alla normativa vigente (PRG di Roma Capitale, Regolamento Edilizio, DM 05/07/1975), assevera quanto sopra in merito al procedimento ${protocollo} di cui alla presente.

Luogo e data: Roma, ${dataIt()}
Il Tecnico incaricato
_____________________________`;
}

function capitolatoFIR(c: Commessa): string {
  return `CLAUSOLA CONTRATTUALE SPECIALE D'APPALTO — GESTIONE MACERIE E RIFIUTI
(Committente / Appaltatore — ${c.titolo}, ${c.indirizzo || '[indirizzo]'}, Roma)

ART. 1 — OGGETTO
L'Appaltatore si obbliga a gestire integralmente i rifiuti da demolizione e costruzione (capitoli CER 17) derivanti dai lavori commissati con il presente contratto, in ottemperanza al D.Lgs. 152/2006 (Parte IV) e al D.M. 185/2007.

ART. 2 — CARICO, SCARICO E TRASPORTO
L'Appaltatore provvede al carico, trasporto e conferimento dei rifiuti presso impianti autorizzati, con mezzi idonei e coperti, escludendo dispersione o abbandono lungo il tragitto. L'Appaltatore è esclusivamente responsabile di ogni sanzione amministrativa e penale a riguardo.

ART. 3 — FORMULARO IDENTIFICAZIONE RIFIUTI (FIR)
Per ogni operazione di trasporto, l'Appaltatore provvede alla compilazione e sottoscrizione (anche digitale) del Formulario di Identificazione Rifiuti (FIR) ex art. 193 D.Lgs. 152/2006, dandone comunicazione al Committente e al Direttore dei Lavori entro 48 ore.

ART. 4 — TRACCIABILITÀ E DOCUMENTI
L'Appaltatore trasmette al Committente copia di: (a) registro di carico/scarico ex art. 190 D.Lgs. 152/2006; (b) certificato di conferimento dell'impianto di destinazione; (c) dichiarazione di fine lavorazione / reciproca ex art. 185 D.Lgs. 152/2006.

ART. 5 — VERBALE DI CONSEGNA E RITENUTE
Prima di ogni ritenuta o liquidazione, l'Appaltatore deposita la documentazione integrale di tracciabilità dei rifiuti. In caso di omissione, il Committente trattiene un importo pari al 10% di ogni stato di avanzamento lavori fino alla presentazione.

Letto, confermato e sottoscritto per accettazione.

Roma, ${dataIt()}          Il Committente          L'Appaltatore`;
}

function informativaAI(c: Commessa): string {
  return `INFORMATIVA AL COMMITTENTE SULL'UTILIZZO DI SISTEMI DI INTELLIGENZA ARTIFICIALE
(Ai sensi dell'art. 13 del Regolamento UE 2016/679 e dell'art. 13 della Legge 132/2025)

Gentile Committente,
in relazione all'incarico professionale riferito all'immobile sito in ${c.indirizzo || '[indirizzo]'} (Roma), ${c.titolo}, il sottoscritto Tecnico incaricato La informa che, nell'ambito dell'elaborazione degli studi, documenti tecnici e materiali grafici relativi all'incarico, fa ausilio di strumenti software dotati di sistemi di Intelligenza Artificiale generativa.

1. NATURA DEGLI STRUMENTI UTILIZZATI
Gli strumenti di IA impiegati sono utilizzati in qualità di supporto tecnologico ausiliario e comprendono: sistemi di generazione e revisione di testi tecnici, strumenti di calcolo automatico, software di automazione grafica CAD e sistemi di revisione documentale.

2. RESPONSABILITÀ PROFESSIONALE
Resta fermo che ogni prodotto, elaborato, relazione, computo e documento tecnico emesso nell'ambito dell'incarico è verificato, validato e sottoscritto dal Tecnico incaricato, che ne assume la piena e integrale responsabilità professionale ai sensi delle norme di disciplina dell'Ordine di appartenenza. I sistemi di IA non sostituiscono in alcun modo la vigilanza, il controllo e la firma del Professionista.

3. TRATTAMENTO DEI DATI
Nell'utilizzo di tali strumenti, il Professionista si astiene dal conferire dati personali identificativi del Committente e di terzi ove non necessari, adottando le opportune misure di salvaguardia ai sensi del Regolamento UE 2016/679 (GDPR).

4. DIRITTI DEL COMMITTENTE
Il Committente ha diritto di ottenere informazioni sugli strumenti di IA impiegati e di richiedere che determinate elaborazioni siano prodotte senza l'ausilio di tali sistemi, con eventuale ripercussione su tempi e costi dell'incarico.

5. ACCETTAZIONE
La presente informativa è consegnata ai sensi dell'art. 13 della Legge 132/2025; si invita il Committente a prenderne visione e a sottoscriverne l'accettazione.

Roma, ${dataIt()}
Il Tecnico incaricato
_____________________________`;
}

type DocId = 'relazione' | 'capitolato' | 'ai';

const TABS: { id: DocId; label: string; file: string }[] = [
  { id: 'relazione', label: 'Relazione Tecnica Asseverata SUET', file: 'Relazione_Asseverata_SUET' },
  { id: 'capitolato', label: 'Capitolato & FIR', file: 'Capitolato_FIR' },
  { id: 'ai', label: 'Informativa AI (L. 132/2025)', file: 'Informativa_AI_L132_2025' },
];

export function Bozze() {
  const { commessa } = useAttiva();
  const vani = useStore((s) => (commessa ? s.vani[commessa.id] ?? [] : []));
  const [tab, setTab] = useState<DocId>('relazione');

  const testo = useMemo(() => {
    if (!commessa) return '';
    if (tab === 'relazione') return relazioneSUET(commessa, vani);
    if (tab === 'capitolato') return capitolatoFIR(commessa);
    return informativaAI(commessa);
  }, [commessa, vani, tab]);

  if (!commessa) return <div className="p-10 text-slate-500">Nessuna commessa attiva.</div>;

  const activeTab = TABS.find((t) => t.id === tab)!;

  const scaricaTxt = () => {
    const blob = new Blob([testo], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${activeTab.file}_${commessa.codice}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const scaricaDoc = () => {
    const html = `<html><head><meta charset="utf-8"></head><body><pre style="font-family:Georgia,serif;white-space:pre-wrap;font-size:11pt;line-height:1.5">${testo.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre></body></html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${activeTab.file}_${commessa.codice}.doc`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="p-8 max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">6. Atti SUET, FIR &amp; L.132/2025</h1>
        <p className="text-sm text-slate-500 mt-1">
          Documenti precompilati dinamicamente con catastale, PRG e calcoli RAI della commessa: <strong className="text-slate-700">{commessa.codice}</strong>
        </p>
      </header>

      <div className="flex flex-wrap gap-1 mb-4 border-b border-slate-300">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-[13px] font-medium -mb-px border-b-2 transition-colors ${
              tab === t.id ? 'border-sky-600 text-sky-800 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-100 border-b border-slate-200">
          <p className="text-xs text-slate-500">Anteprima bozza — aggiornata automaticamente con i dati del Registro e dell'Audit RAI.</p>
          <div className="flex items-center gap-2">
            <CopyButton text={testo} label="Copia Testo" />
            <button onClick={scaricaTxt} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-800 text-white hover:bg-slate-700 transition-colors">
              <Download size={13} /> .txt
            </button>
            <button onClick={scaricaDoc} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-sky-700 text-white hover:bg-sky-600 transition-colors">
              <Download size={13} /> .doc (Word)
            </button>
          </div>
        </div>
        <textarea
          readOnly
          value={testo}
          className="w-full h-[640px] p-6 text-[13px] leading-relaxed font-mono text-slate-800 bg-white resize-none focus:outline-none"
        />
      </div>
    </div>
  );
}
