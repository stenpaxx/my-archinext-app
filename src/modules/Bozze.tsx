import { useMemo, useState } from 'react';
import { FileCheck2, Copy, Check, Download } from 'lucide-react';
import { useStore, useAttiva, EMPTY_VANI, EMPTY_VOCI } from '@/lib/store';
import type { DettagliProcedimento } from '@/modules/DueDiligence';

export function Bozze() {
  const { commessa } = useAttiva();
  const vani = useStore((s) => (commessa ? s.vani?.[commessa.id] ?? EMPTY_VANI : EMPTY_VANI));
  const voci = useStore((s) => (commessa ? s.voci?.[commessa.id] ?? EMPTY_VOCI : EMPTY_VOCI));

  const [tecnicoNome, setTecnicoNome] = useState(
    'Arch. Stefano — Ordine degli Architetti PPC di Roma e Provincia n. 20061'
  );
  const [committenteNome, setCommittenteNome] = useState('');
  const [copied, setCopied] = useState(false);

  const testoRelazione = useMemo(() => {
    const mqTotali = vani.reduce((acc, v) => acc + (Number(v.superficie) || 0), 0);
    const mqFinestratiTotali = vani.reduce(
      (acc, v) => acc + (Number(v.superfFinestrata) || 0),
      0
    );

    const prezzoVoce = (v: (typeof voci)[number]) =>
      Number(v.prezzoUnitario ?? v.prezzo) || 0;

    const lavoriNetti = voci
      .filter((v) => !v.oneriSicurezza && !v.sicurezza)
      .reduce((acc, v) => acc + (Number(v.quantita) || 0) * prezzoVoce(v), 0);
    const oneriSicurezza = voci
      .filter((v) => Boolean(v.oneriSicurezza || v.sicurezza))
      .reduce((acc, v) => acc + (Number(v.quantita) || 0) * prezzoVoce(v), 0);
    const totaleLavori = lavoriNetti + oneriSicurezza;

    const elencoVani =
      vani.length > 0
        ? vani
            .map((v) => {
              const sup = Number(v.superficie) || 0;
              const fin = Number(v.superfFinestrata) || 0;
              const hMedia = Number(v.altezzaMedia) || 0;
              const rai = sup > 0 ? fin / sup : 0;
              const esitoRai =
                sup <= 0
                  ? 'sup. da definire'
                  : rai >= 0.125
                    ? `RAI ${rai.toFixed(3)} (>= 1/8 conforme)`
                    : v.vmc
                      ? `RAI ${rai.toFixed(3)} con VMC integrativa`
                      : `RAI ${rai.toFixed(3)} (< 1/8 da verificare)`;
              return `  * ${v.nome || 'Vano'} [${v.destinazione || 'Destinazione da indicare'}]: Sup. ${sup.toFixed(
                2
              )} mq | Sup. finestrata apribile ${fin.toFixed(2)} mq | H media ${hMedia.toFixed(
                2
              )} m | ${esitoRai}`;
            })
            .join('\n')
        : '  * Vani da censire e riscontrare in fase di rilievo esecutivo e restituzione grafica.';

    const codiceCommessa = commessa?.codice ?? '2026-014';
    const titoloCommessa = commessa?.titolo?.trim() || 'Intervento Edilizio in Roma Capitale';
    const indirizzoCommessa = commessa?.indirizzo?.trim() || 'Via del Boschetto, 72, 00184 Roma RM';
    const municipioCommessa = commessa?.municipio?.trim() || 'Municipio I';
    const foglio = commessa?.foglio || '—';
    const particella = commessa?.particella || '—';
    const subalterno = commessa?.subalterno || '—';
    const categoriaCatastale = commessa?.categoriaCatastale || 'A/2';
    const tipologiaTitolo = commessa?.tipologia ?? 'Manutenzione Straordinaria CILA';
    const tessutoPRG = commessa?.tessutoPRG ?? 'T1';
    const haCartaQualita = Boolean(commessa?.cartaQualita);
    const haVincolo = Boolean(commessa?.vincoloSoprintendenza);

    const proc =
      ((commessa as unknown as { dettagliProcedimento?: DettagliProcedimento })
        ?.dettagliProcedimento ?? {}) as DettagliProcedimento;

    const cartaQualitaLabel = haCartaQualita
      ? `SI (${proc.ambitoCartaQualita?.trim() || 'ambito Carta per la Qualità PRG'})`
      : 'NO';

    const vincoloSoprintendenza = haVincolo
      ? `SI (${
          proc.tipoTutelaBeniCulturali?.trim() || 'immobile/contesto soggetto a tutela D.Lgs. 42/2004'
        } — Atto/Istanza: ${
          proc.attoSoprintendenza?.trim() || 'da acquisire/riscontrare presso Soprintendenza'
        })`
      : 'NO (ordinario, fermo restando l’accertamento puntuale dei vincoli sovraordinati)';

    const impresa =
      proc.impresaEsecutrice?.trim() ||
      'Da indicare / verificare prima dell’inizio lavori (D.Lgs. 81/2008 e DURC)';

    const coordinatore =
      proc.coordinatoreSicurezza?.trim() ||
      'Da verificare ai sensi del D.Lgs. 81/2008 in relazione alle imprese presenti in cantiere';

    const titoloLegittimante =
      proc.titoloLegittimante?.trim() ||
      'Titoli edilizi legittimanti, provvedimenti d’uso e documentazione probatoria acquisita';

    const aggiornamentoCatastale =
      proc.aggiornamentoCatastale?.trim() ||
      'Da curare presso l’Agenzia delle Entrate — Territorio ai sensi dell’art. 19, comma 14, L. 122/2010 ove pertinente';

    const testoCombinato = `${tipologiaTitolo} ${titoloCommessa}`.toLowerCase();
    const isFrazionamento = testoCombinato.includes('frazionamento');
    const isCilaOrLibera =
      !isFrazionamento &&
      (tipologiaTitolo.includes('CILA') || tipologiaTitolo.includes('Libera'));
    const isScia = !isFrazionamento && tipologiaTitolo.includes('SCIA');
    const isEdificazione =
      !isFrazionamento &&
      (tipologiaTitolo.includes('Permesso di Costruire') ||
        tipologiaTitolo.includes('Nuova Edificazione'));

    const sezioneProcedimentoSpecifica = isFrazionamento
      ? `QUADRO PROCEDIMENTALE SPECIFICO — FRAZIONAMENTO (${tipologiaTitolo.toUpperCase()})
- Unità immobiliari risultanti (U.I.U.): ${
    proc.unitaRisultanti?.trim() ||
    'Suddivisione in unità immobiliari distinte come da elaborati di progetto e planimetrie'
  }
- Requisiti igienico-sanitari / RAI / VMC / impianti per unità: ${
    proc.requisitiUnitaFrazionate?.trim() ||
    'Verifica RAI >= 1/8, ventilazione/VMC, superfici/altezze minime D.M. 05/07/1975 e autonomia impiantistica D.M. 37/08 per ciascuna unità'
  }
- Contributo di costruzione / monetizzazione: ${
    proc.oneriFrazionamento?.trim() ||
    'Da verificare ai sensi del D.P.R. 380/2001, del R.E.C. e della normativa regionale del Lazio'
  }
- Impresa esecutrice: ${impresa}`
      : isEdificazione
        ? `QUADRO PROCEDIMENTALE SPECIFICO — ${tipologiaTitolo.toUpperCase()}
- Parametri urbanistici di progetto (SUL / Volume / Indice): ${
    proc.sulVolumeProgetto?.trim() || 'Come da elaborati plano-volumetrici e verifiche N.T.A.'
  }
- Contributo di costruzione (oneri urbanizzazione / costo costruzione): ${
    proc.contributoCostruzione?.trim() || 'Da computare / versare secondo tariffe Roma Capitale'
  }
- Invarianza idraulica e permeabilità dei suoli (DAC 90/2026 & R.E.C.): ${
    proc.invarianzaIdraulica?.trim() ||
    'Verifica superfici drenanti/permeabili e laminazione meteorica'
  }
- Impresa esecutrice: ${impresa}`
        : isScia
          ? `QUADRO PROCEDIMENTALE SPECIFICO — ${tipologiaTitolo.toUpperCase()}
- Profilo strutturale / sismico: ${
    proc.opereStrutturali?.trim() ||
    'Verifiche e depositi strutturali ex D.P.R. 380/2001 e L.R. Lazio ove dovuti'
  }
- Sagoma, prospetti e destinazioni d'uso: ${
    proc.variazioneSagomaProspetti?.trim() ||
    'Coerenza con N.T.A. del P.R.G. e pareri/nulla osta acquisiti'
  }
- Impresa esecutrice: ${impresa}`
          : `QUADRO PROCEDIMENTALE SPECIFICO — ${tipologiaTitolo.toUpperCase()}
- Esclusione opere strutturali / prospetti: ${
    proc.opereStrutturali?.trim() ||
    'Nessuna opera su parti strutturali portanti o prospetti esterni'
  }
- Impresa esecutrice: ${impresa}`;

    const sezioneCartaQualita = haCartaQualita
      ? `\nCARTA PER LA QUALITÀ — P.R.G. ROMA CAPITALE
- Ambito / elemento: ${
    proc.ambitoCartaQualita?.trim() || 'Ambito soggetto a Carta per la Qualità del P.R.G.'
  }
- Prescrizioni e verifiche ambientali/tipologiche: ${
    proc.prescrizioniCartaQualita?.trim() ||
    'Coerenza con materiali, caratteri tipologici, permeabilità dei suoli e invarianza idraulica (DAC 90/2026 & R.E.C.)'
  }\n`
      : '';

    const sezioneTutelaSoprintendenza = haVincolo
      ? `\nVINCOLO SOPRINTENDENZA — D.LGS. 42/2004
- Tipologia di tutela: ${
    proc.tipoTutelaBeniCulturali?.trim() || 'Tutela beni culturali / paesaggistici ex D.Lgs. 42/2004'
  }
- Estremi atto / parere / istanza: ${
    proc.attoSoprintendenza?.trim() || 'Da richiamare con estremi di protocollo/autorizzazione'
  }
- Prescrizioni e condizioni operative: ${
    proc.prescrizioniTutela?.trim() ||
    'Rispetto integrale delle prescrizioni impartite dalla Soprintendenza in fase esecutiva'
  }\n`
      : '';

    return `RELAZIONE TECNICA ASSEVERATA (R.T.A.)
PORTALE SUET — ROMA CAPITALE
================================================================================
IDENTIFICATIVO PRATICA / COMMESSA: ${codiceCommessa}
OGGETTO DELL'INTERVENTO: ${titoloCommessa}
UBICAZIONE IMMOBILE: ${indirizzoCommessa} — ${municipioCommessa}, Roma Capitale
DATI CATASTALI (C.F. / C.T.): Foglio ${foglio}, Particella ${particella}, Subalterno ${subalterno} — Categoria ${categoriaCatastale}
TITOLO ABILITATIVO / PROCEDIMENTO: ${tipologiaTitolo}
INQUADRAMENTO URBANISTICO (P.R.G. ROMA): ${tessutoPRG}
CARTA PER LA QUALITÀ: ${cartaQualitaLabel}
VINCOLO PAESAGGISTICO / STORICO-ARTISTICO (D.LGS. 42/2004): ${vincoloSoprintendenza}
COMMITTENTE / AVENTE TITOLO: ${committenteNome.trim() || 'Come da procura e dichiarazioni sostitutive allegate al fascicolo SUET'}
TECNICO PROGETTISTA E ASSEVERANTE: ${tecnicoNome.trim() || 'Tecnico abilitato iscritto al relativo Ordine/Collegio'}

--------------------------------------------------------------------------------
1. INQUADRAMENTO URBANISTICO, STATO LEGITTIMO E COERENZA CON IL P.R.G.
--------------------------------------------------------------------------------
L'unità immobiliare oggetto della presente relazione ricade nel territorio di Roma Capitale (${municipioCommessa}), in corrispondenza di ${indirizzoCommessa}, ed è identificata al Catasto Edilizio Urbano al Foglio ${foglio}, Particella ${particella}, Subalterno ${subalterno} (Categoria ${categoriaCatastale}).

In base alle previsioni del Piano Regolatore Generale (P.R.G.) vigente di Roma Capitale e del Regolamento Edilizio di Roma Capitale (R.E.C.), l'area/immobile si colloca in ${tessutoPRG}. L'intervento proposto risulta coerente con la disciplina del tessuto di appartenenza e con le relative Norme Tecniche di Attuazione (N.T.A.), nel rispetto del procedimento "${tipologiaTitolo}".

Ai sensi dell'art. 9-bis del D.P.R. 380/2001 e s.m.i., lo stato legittimo dell'immobile è desunto da: ${titoloLegittimante}, riscontrato con lo stato attuale rilevato. Aggiornamento catastale: ${aggiornamentoCatastale}.

${sezioneProcedimentoSpecifica}
${sezioneCartaQualita}${sezioneTutelaSoprintendenza}
--------------------------------------------------------------------------------
2. DESCRIZIONE DETTAGLIATA DELLE OPERE PROGETTATE
--------------------------------------------------------------------------------
L'intervento consiste nelle opere riconducibili al procedimento "${tipologiaTitolo}" così come rappresentate negli elaborati progettuali:
- Realizzazione delle lavorazioni edilizie interne e/o esterne coerenti con il titolo abilitativo indicato e con le prescrizioni del P.R.G. e del R.E.C.
- Adeguamento, integrazione o rifacimento degli impianti tecnologici (elettrico/dati, idrico-sanitario, scarichi, climatizzazione e ventilazione), eseguiti a regola d'arte da imprese abilitate ai sensi del D.M. 22 gennaio 2008, n. 37, con rilascio delle relative Dichiarazioni di Conformità (Di.Co.) a fine lavori.
${
  isCilaOrLibera
    ? '  * Lavori eseguiti senza alterazione di parti strutturali portanti né modifica delle superfici/volumi urbanistici.'
    : '  * Esecuzione delle opere nel rispetto delle verifiche tecniche, strutturali, energetiche e ambientali previste dal titolo abilitativo.'
}

--------------------------------------------------------------------------------
3. VERIFICHE IGIENICO-SANITARIE, DISTRIBUTIVE E RAPPORTO AEROILLUMINANTE
--------------------------------------------------------------------------------
Le lavorazioni sono progettate nel rispetto del D.M. 5 luglio 1975 e delle disposizioni del Regolamento Edilizio di Roma Capitale in materia di superfici minime, altezze nette interne, aeroilluminazione naturale diretta (rapporto aeroilluminante R.A.I. >= 1/8 per i locali di abitazione) e ventilazione meccanica controllata (V.M.C.) per i locali di servizio/bagni ciechi.

Sintesi dei parametri rilevati/progettati (Superficie complessiva censita: ${mqTotali.toFixed(
      2
    )} mq | Superficie finestrata apribile complessiva: ${mqFinestratiTotali.toFixed(2)} mq):
${elencoVani}

--------------------------------------------------------------------------------
4. QUADRO ECONOMICO DI RIFERIMENTO, SICUREZZA E GESTIONE RIFIUTI
--------------------------------------------------------------------------------
Sulla base del computo metrico estimativo redatto con riferimento al Prezzario Regionale del Lazio vigente, l'importo stimato delle opere risulta così articolato:
- Importo lavori a misura / a corpo (IVA esclusa): € ${lavoriNetti.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}
- Oneri della sicurezza (IVA esclusa): € ${oneriSicurezza.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}
- Totale complessivo stimato delle opere (IVA esclusa): € ${totaleLavori.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}

In fase esecutiva saranno osservate le disposizioni del D.Lgs. 9 aprile 2008, n. 81 (inclusa la verifica dell'idoneità tecnico-professionale dell'impresa esecutrice, la notifica preliminare ove dovuta, la redazione del PSC/POS e il ruolo di coordinamento per la sicurezza: ${coordinatore}). I rifiuti e i materiali di risulta saranno conferiti a impianti autorizzati nel rispetto del D.Lgs. 152/2006, conservando i relativi formulari (FIR).

--------------------------------------------------------------------------------
5. ASSEVERAZIONE DEL TECNICO ABILITATO
--------------------------------------------------------------------------------
Il sottoscritto ${
      tecnicoNome.trim() || 'tecnico abilitato'
    }, in qualità di tecnico progettista e asseverante, consapevole delle responsabilità penali e amministrative derivanti da dichiarazioni mendaci o false asseverazioni ai sensi degli artt. 359 e 481 del Codice Penale e del D.P.R. 445/2000, ASSEVERA:
  a) la conformità delle opere da realizzare agli elaborati progettuali allegati e al vigente strumentario urbanistico ed edilizio di Roma Capitale (P.R.G., N.T.A. e R.E.C.);
  b) il rispetto delle norme igienico-sanitarie (D.M. 05/07/1975), delle norme di sicurezza (D.Lgs. 81/2008) e delle disposizioni in materia di efficienza energetica e sicurezza degli impianti (D.M. 37/2008), per quanto di competenza;
  c) che l'intervento non comporta violazione di diritti di terzi né pregiudizio alla statica dell'edificio, fermo restando l'obbligo di integrare eventuali ulteriori pareri, nulla osta o atti di assenso qualora in corso d'opera emergano condizioni non rilevabili a priori.

Data: ${new Date().toLocaleDateString('it-IT')}
Il Tecnico Asseverante
${tecnicoNome.trim() || 'Tecnico abilitato'}
`;
  }, [commessa, vani, voci, tecnicoNome, committenteNome]);

  if (!commessa) {
    return <div className="p-10 text-zinc-600">Nessuna commessa attiva.</div>;
  }

  const handleCopy = async () => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(testoRelazione).catch(() => {});
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([testoRelazione], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relazione_Asseverata_SUET_${commessa.codice}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
6. Relazione Asseverata SUET Roma
          </h1>
          <p className="text-xs sm:text-sm text-zinc-700 mt-0.5">
            Bozza tecnica asseverata strutturata secondo la prassi SUET Roma Capitale e i campi
            attivati dal titolo abilitativo e dai vincoli per la commessa{' '}
            <strong className="text-zinc-950">{commessa.codice}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:border-zinc-950 transition-colors"
          >
            {copied ? (
              <Check size={13} className="text-emerald-700" />
            ) : (
              <Copy size={13} />
            )}
            <span>{copied ? 'Copiata' : 'Copia bozza'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors"
          >
            <Download size={13} />
            <span>Scarica .TXT</span>
          </button>
        </div>
      </header>

      <section className="rounded-xl bg-white border border-zinc-300 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <label className="block">
          <span className="block font-semibold text-zinc-700 mb-1">Tecnico Asseverante</span>
          <input
            className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
            value={tecnicoNome}
            onChange={(e) => setTecnicoNome(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="block font-semibold text-zinc-700 mb-1">Committente / Richiedente</span>
          <input
            className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
            value={committenteNome}
            placeholder="Nome e cognome o denominazione"
            onChange={(e) => setCommittenteNome(e.target.value)}
          />
        </label>
      </section>

      <section className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-xs">
        <div className="px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-300">
          <span className="inline-flex items-center gap-2">
            <FileCheck2 size={13} className="text-zinc-400" />
            Bozza_SUET_{commessa.codice}.txt
          </span>
          <span className="text-[11px] text-zinc-400">Roma Capitale · R.T.A.</span>
        </div>
        <textarea
          readOnly
          value={testoRelazione}
          rows={32}
          className="w-full bg-zinc-950 p-4 text-xs font-mono text-zinc-100 leading-relaxed focus:outline-none resize-y"
        />
      </section>
    </div>
  );
}