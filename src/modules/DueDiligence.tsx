import { useEffect, useMemo, useState } from 'react';
import {
  ExternalLink,
  CheckCircle2,
  Circle,
  ShieldAlert,
  Building2,
  FileCheck2,
  Compass,
  Map as MapIcon,
  Crosshair,
  SlidersHorizontal,
  Plus,
  Minus,
} from 'lucide-react';
import { useStore, useAttiva } from '@/lib/store';
import { STEP_LABELS } from '@/lib/types';

const EMPTY_STEPS: boolean[] = [false, false, false, false, false, false];

const TESSUTI_PRG = [
  'T1 — Tessuti di origine medievale',
  'T2 — Tessuti di espansione otto-novecentesca',
  'T3 — Tessuti di espansione novecentesca a lottizzazione edilizia',
  'T4 — Tessuti di ristrutturazione urbanistica',
  'T5 — Tessuti di espansione recente',
  'Città Consolidata — T1',
  'Città Consolidata — T2',
  'Città da Ristrutturare',
];

const TITOLI_ABILITATIVI = [
  'Manutenzione Straordinaria CILA',
  'Ristrutturazione Edilizia SCIA',
  'Frazionamento con SCIA / PdC',
  'SCIA Alternativa al PdC',
  'Permesso di Costruire (PdC)',
  'Nuova Edificazione',
  'Edilizia Libera',
];

export interface DettagliProcedimento {
  impresaEsecutrice?: string;
  coordinatoreSicurezza?: string;
  opereStrutturali?: string;
  variazioneSagomaProspetti?: string;
  sulVolumeProgetto?: string;
  contributoCostruzione?: string;
  invarianzaIdraulica?: string;
  unitaRisultanti?: string;
  requisitiUnitaFrazionate?: string;
  oneriFrazionamento?: string;
  tipoTutelaBeniCulturali?: string;
  attoSoprintendenza?: string;
  prescrizioniTutela?: string;
  ambitoCartaQualita?: string;
  prescrizioniCartaQualita?: string;
  titoloLegittimante?: string;
  aggiornamentoCatastale?: string;
}

interface GeoPoint {
  lat: number;
  lon: number;
  label: string;
}

function getFallbackCoords(indirizzo: string): GeoPoint {
  const clean = indirizzo.trim();
  const lower = clean.toLowerCase();
  if (lower.includes('boschetto')) {
    return { lat: 41.8955, lon: 12.4912, label: 'Rione Monti · Via del Boschetto' };
  }
  if (lower.includes('termini')) {
    return { lat: 41.9009, lon: 12.502, label: 'Roma Termini · Esquilino' };
  }
  return { lat: 41.8902, lon: 12.4922, label: clean || 'Roma Capitale' };
}

function parseStreetAndNumber(indirizzo: string): { streetQuery: string; cap?: string } {
  const firstPart = indirizzo.split(',')[0]?.trim() || indirizzo.trim();
  const capMatch = indirizzo.match(/\b(00\d{3})\b/);
  const cap = capMatch ? capMatch[1] : undefined;

  const parts = indirizzo.split(',').map((p) => p.trim());
  if (parts.length >= 2 && /^\d+[a-zA-Z]?$/.test(parts[1])) {
    return { streetQuery: `${parts[1]} ${parts[0]}`, cap };
  }
  const numMatch = firstPart.match(/^(.*?)\s+(\d+[a-zA-Z]?)$/);
  if (numMatch) {
    return { streetQuery: `${numMatch[2]} ${numMatch[1]}`, cap };
  }
  return { streetQuery: firstPart, cap };
}

export function DueDiligence() {
  const { commessa } = useAttiva();
  const aggiornaCommessa = useStore((s) => s.aggiornaCommessa);
  const rawSteps = useStore((s) => (commessa ? s.steps?.[commessa.id] : undefined));
  const toggleStep = useStore((s) => s.toggleStep);
  const [mostraMappa, setMostraMappa] = useState(true);
  const [zoomSpan, setZoomSpan] = useState(0.0014);

  const indirizzoSafe = commessa?.indirizzo?.trim() || 'Via del Boschetto, 72, 00184 Roma RM';
  const [coords, setCoords] = useState<GeoPoint>(() => getFallbackCoords(indirizzoSafe));
  const [geocodingLoading, setGeocodingLoading] = useState(false);

  useEffect(() => {
    const fallback = getFallbackCoords(indirizzoSafe);
    setCoords(fallback);

    if (indirizzoSafe.length < 5) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setGeocodingLoading(true);
      try {
        const { streetQuery, cap } = parseStreetAndNumber(indirizzoSafe);
        const params = new URLSearchParams({
          format: 'json',
          limit: '1',
          street: streetQuery,
          city: 'Roma',
          country: 'Italy',
        });
        if (cap) params.set('postalcode', cap);

        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) return;
        let data = (await res.json()) as Array<{
          lat?: string;
          lon?: string;
          display_name?: string;
        }>;

        if (!Array.isArray(data) || data.length === 0) {
          const freeQuery = /roma/i.test(indirizzoSafe)
            ? indirizzoSafe
            : `${indirizzoSafe}, Roma, Italia`;
          const resFree = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
              freeQuery
            )}`,
            { signal: controller.signal, headers: { Accept: 'application/json' } }
          );
          if (resFree.ok) {
            data = (await resFree.json()) as Array<{
              lat?: string;
              lon?: string;
              display_name?: string;
            }>;
          }
        }

        if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            const shortLabel =
              data[0].display_name?.split(',').slice(0, 3).join(',').trim() || indirizzoSafe;
            setCoords({ lat, lon, label: shortLabel });
          }
        }
      } catch {
        // Fallback locale se offline o annullato
      } finally {
        if (!controller.signal.aborted) {
          setGeocodingLoading(false);
        }
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [indirizzoSafe]);

  const steps = useMemo(
    () => STEP_LABELS.map((_, idx) => Boolean(rawSteps?.[idx] ?? EMPTY_STEPS[idx])),
    [rawSteps]
  );

  if (!commessa) {
    return <div className="p-10 text-zinc-600">Nessuna commessa attiva.</div>;
  }

  const updateField = <K extends keyof typeof commessa>(
    key: K,
    value: (typeof commessa)[K]
  ) => {
    aggiornaCommessa(commessa.id, { [key]: value });
  };

  const rawDettagli =
    ((commessa as unknown as { dettagliProcedimento?: DettagliProcedimento })
      .dettagliProcedimento ?? {}) as DettagliProcedimento;

  const updateProcedimento = (patch: Partial<DettagliProcedimento>) => {
    aggiornaCommessa(commessa.id, {
      dettagliProcedimento: {
        ...rawDettagli,
        ...patch,
      },
    } as Partial<typeof commessa>);
  };

  const titoloAbilitativo = commessa.tipologia ?? TITOLI_ABILITATIVI[0];
  const testoCombinato = `${titoloAbilitativo} ${commessa.titolo ?? ''}`.toLowerCase();
  const isFrazionamento = testoCombinato.includes('frazionamento');
  const isCilaOrLibera =
    !isFrazionamento &&
    (titoloAbilitativo.includes('CILA') || titoloAbilitativo.includes('Libera'));
  const isScia = !isFrazionamento && titoloAbilitativo.includes('SCIA');
  const isEdificazione =
    !isFrazionamento &&
    (titoloAbilitativo.includes('Permesso di Costruire') ||
      titoloAbilitativo.includes('Nuova Edificazione'));
  const haVincoloSoprintendenza = Boolean(commessa.vincoloSoprintendenza);
  const haCartaQualita = Boolean(commessa.cartaQualita);

  const formapsUrl = `https://www.formaps.it/?q=${encodeURIComponent(indirizzoSafe)}`;
  const deltaLon = zoomSpan * 1.35;
  const deltaLat = zoomSpan * 0.85;
  const bbox = `${(coords.lon - deltaLon).toFixed(6)},${(coords.lat - deltaLat).toFixed(6)},${(
    coords.lon + deltaLon
  ).toFixed(6)},${(coords.lat + deltaLat).toFixed(6)}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&layer=mapnik&marker=${coords.lat.toFixed(6)}%2C${coords.lon.toFixed(6)}`;

  const completati = steps.filter(Boolean).length;
  const pct = Math.round((completati / STEP_LABELS.length) * 100);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
            1. Due Diligence, Catasto &amp; PRG
          </h1>
          <p className="text-xs sm:text-sm text-zinc-700 mt-0.5">
            Inquadramento urbanistico-edilizio, identificativi catastali e vincoli. Commessa:{' '}
            <strong className="text-zinc-950">{commessa.codice}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMostraMappa((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:border-zinc-950 transition-colors"
          >
            <MapIcon size={13} />
            <span>{mostraMappa ? 'Nascondi Mappa' : 'Mostra Mappa'}</span>
          </button>
          <a
            href={formapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors"
          >
            <Compass size={13} />
            <span>Apri su Formaps.it</span>
            <ExternalLink size={11} />
          </a>
        </div>
      </header>

      <section className="rounded-xl bg-white border border-zinc-300 p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-2.5">
          <Building2 size={15} className="text-zinc-800" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-900">
            Dati Commessa &amp; Localizzazione Roma Capitale
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <label className="block sm:col-span-2">
            <span className="block font-semibold text-zinc-700 mb-1">Oggetto Intervento</span>
            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
              value={commessa.titolo ?? ''}
              onChange={(e) => updateField('titolo', e.target.value)}
            />
          </label>

          <label className="block">
            <span className="block font-semibold text-zinc-700 mb-1">Municipio</span>
            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
              value={commessa.municipio ?? ''}
              onChange={(e) => updateField('municipio', e.target.value)}
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="block font-semibold text-zinc-700 mb-1">Indirizzo Immobile</span>
            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
              value={commessa.indirizzo ?? ''}
              onChange={(e) => updateField('indirizzo', e.target.value)}
            />
          </label>

          <label className="block">
            <span className="block font-semibold text-zinc-700 mb-1">Titolo Abilitativo</span>
            <select
              className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
              value={titoloAbilitativo}
              onChange={(e) => updateField('tipologia', e.target.value)}
            >
              {TITOLI_ABILITATIVI.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-900">
              <SlidersHorizontal size={13} />
              Parametri Attivati — {titoloAbilitativo}
            </span>
            <span className="text-[11px] font-mono text-zinc-600">
              Sincronizzati con la bozza SUET
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <label className="block">
              <span className="block font-semibold text-zinc-700 mb-1">
                Impresa Esecutrice (D.Lgs. 81/2008 · DURC)
              </span>
              <input
                className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
                value={rawDettagli.impresaEsecutrice ?? ''}
                placeholder="Ragione sociale e P.IVA impresa affidataria"
                onChange={(e) => updateProcedimento({ impresaEsecutrice: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="block font-semibold text-zinc-700 mb-1">
                Coordinatore Sicurezza (CSP / CSE — D.Lgs. 81/2008)
              </span>
              <input
                className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
                value={rawDettagli.coordinatoreSicurezza ?? ''}
                placeholder="Nominativo o 'Non ricorre / Verificare presenza più imprese'"
                onChange={(e) => updateProcedimento({ coordinatoreSicurezza: e.target.value })}
              />
            </label>

            {isFrazionamento && (
              <>
                <label className="block">
                  <span className="block font-semibold text-zinc-700 mb-1">
                    Unità Immobiliari Risultanti (U.I.U.)
                  </span>
                  <input
                    className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
                    value={rawDettagli.unitaRisultanti ?? ''}
                    placeholder="Es. n. 2 unità residenziali autonome (Sub. 14A e Sub. 14B)"
                    onChange={(e) => updateProcedimento({ unitaRisultanti: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className="block font-semibold text-zinc-700 mb-1">
                    Requisiti Igienico-Sanitari / RAI / Impianti per Unità
                  </span>
                  <input
                    className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
                    value={
                      rawDettagli.requisitiUnitaFrazionate ??
                      'RAI >= 1/8 o VMC per singola U.I.U., autonomia impiantistica D.M. 37/08 e superfici minime D.M. 05/07/1975'
                    }
                    onChange={(e) =>
                      updateProcedimento({ requisitiUnitaFrazionate: e.target.value })
                    }
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="block font-semibold text-zinc-700 mb-1">
                    Contributo di Costruzione / Monetizzazione Standard
                  </span>
                  <input
                    className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
                    value={rawDettagli.oneriFrazionamento ?? ''}
                    placeholder="Verifica oneri/monetizzazione o esenzioni ex D.P.R. 380/2001 e L.R. Lazio"
                    onChange={(e) => updateProcedimento({ oneriFrazionamento: e.target.value })}
                  />
                </label>
              </>
            )}

            {isCilaOrLibera && (
              <label className="block md:col-span-2">
                <span className="block font-semibold text-zinc-700 mb-1">
                  Esclusione Parti Strutturali (CILA / Edilizia Libera)
                </span>
                <input
                  className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
                  value={
                    rawDettagli.opereStrutturali ??
                    'Nessuna opera su parti strutturali portanti o prospetti'
                  }
                  onChange={(e) => updateProcedimento({ opereStrutturali: e.target.value })}
                />
              </label>
            )}

            {isScia && (
              <>
                <label className="block">
                  <span className="block font-semibold text-zinc-700 mb-1">
                    Profilo Strutturale / Sismico (SCIA)
                  </span>
                  <input
                    className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
                    value={
                      rawDettagli.opereStrutturali ??
                      'Verifiche e depositi strutturali ex D.P.R. 380/2001 e L.R. Lazio ove dovuti'
                    }
                    onChange={(e) => updateProcedimento({ opereStrutturali: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className="block font-semibold text-zinc-700 mb-1">
                    Sagoma, Prospetti &amp; Destinazioni d&apos;Uso (SCIA)
                  </span>
                  <input
                    className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
                    value={
                      rawDettagli.variazioneSagomaProspetti ??
                      'Coerenza con N.T.A. del P.R.G. e eventuale pareri/nulla osta acquisiti'
                    }
                    onChange={(e) =>
                      updateProcedimento({ variazioneSagomaProspetti: e.target.value })
                    }
                  />
                </label>
              </>
            )}

            {isEdificazione && (
              <>
                <label className="block">
                  <span className="block font-semibold text-zinc-700 mb-1">
                    Parametri Urbanistici di Progetto (SUL / Volume / Indice)
                  </span>
                  <input
                    className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
                    value={rawDettagli.sulVolumeProgetto ?? ''}
                    placeholder="Es. SUL di progetto mq, Volume mc, rispetto indici di tessuto"
                    onChange={(e) => updateProcedimento({ sulVolumeProgetto: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className="block font-semibold text-zinc-700 mb-1">
                    Contributo di Costruzione (Oneri Urbanizzazione + Costo Costruzione)
                  </span>
                  <input
                    className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
                    value={rawDettagli.contributoCostruzione ?? ''}
                    placeholder="Es. Dovuto / Scomputo / Esenzione ai sensi del D.P.R. 380/2001"
                    onChange={(e) => updateProcedimento({ contributoCostruzione: e.target.value })}
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="block font-semibold text-zinc-700 mb-1">
                    Invarianza Idraulica &amp; Permeabilità Suoli (DAC 90/2026 &amp; R.E.C.)
                  </span>
                  <input
                    className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
                    value={
                      rawDettagli.invarianzaIdraulica ??
                      'Verifica superfici permeabili/drenanti e laminazione meteorica'
                    }
                    onChange={(e) => updateProcedimento({ invarianzaIdraulica: e.target.value })}
                  />
                </label>
              </>
            )}
          </div>
        </div>

        {mostraMappa && (
          <div className="pt-1">
            <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950 text-zinc-100">
              <div className="px-3.5 py-2 bg-zinc-950 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                <span className="inline-flex items-center gap-1.5 text-zinc-200 min-w-0">
                  <Crosshair size={12} className="text-zinc-400 shrink-0" />
                  <span className="truncate">{indirizzoSafe}</span>
                  {geocodingLoading && (
                    <span className="text-[10px] text-zinc-400 shrink-0">(centramento...)</span>
                  )}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-zinc-400 tabular-nums">
                    LAT {coords.lat.toFixed(5)}° N · LON {coords.lon.toFixed(5)}° E
                  </span>
                  <div className="inline-flex rounded border border-zinc-700 bg-zinc-900 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setZoomSpan((z) => Math.max(0.0005, +(z * 0.72).toFixed(5)))}
                      title="Zoom avanti"
                      className="p-1 text-zinc-200 hover:bg-zinc-800 border-r border-zinc-700"
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomSpan((z) => Math.min(0.012, +(z * 1.38).toFixed(5)))}
                      title="Zoom indietro"
                      className="p-1 text-zinc-200 hover:bg-zinc-800"
                    >
                      <Minus size={12} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative bg-zinc-900">
                <iframe
                  key={`${coords.lat.toFixed(6)}-${coords.lon.toFixed(6)}-${zoomSpan}`}
                  title={`Mappa monocromatica ${indirizzoSafe}`}
                  src={osmEmbedUrl}
                  className="w-full h-56 border-0 block grayscale contrast-125 brightness-95"
                  loading="lazy"
                />
                <div className="pointer-events-none absolute inset-0 border border-inset border-zinc-800/60" />
              </div>

              <div className="px-3.5 py-2 bg-zinc-950 border-t border-zinc-800 flex items-center justify-end text-[11px] font-mono text-zinc-400">
                <a
                  href={formapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-200 hover:text-white"
                >
                  Verifica PRG su Formaps.it ↗
                </a>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl bg-white border border-zinc-300 p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-2.5">
          <ShieldAlert size={15} className="text-zinc-800" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-900">
            Identificativi Catastali, PRG &amp; Vincoli
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <label className="block">
            <span className="block font-semibold text-zinc-700 mb-1">Foglio</span>
            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 font-mono text-zinc-950 focus:outline-none focus:border-zinc-950"
              value={commessa.foglio ?? ''}
              placeholder="es. 482"
              onChange={(e) => updateField('foglio', e.target.value)}
            />
          </label>

          <label className="block">
            <span className="block font-semibold text-zinc-700 mb-1">Particella</span>
            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 font-mono text-zinc-950 focus:outline-none focus:border-zinc-950"
              value={commessa.particella ?? ''}
              placeholder="es. 118"
              onChange={(e) => updateField('particella', e.target.value)}
            />
          </label>

          <label className="block">
            <span className="block font-semibold text-zinc-700 mb-1">Subalterno</span>
            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 font-mono text-zinc-950 focus:outline-none focus:border-zinc-950"
              value={commessa.subalterno ?? ''}
              placeholder="es. 14"
              onChange={(e) => updateField('subalterno', e.target.value)}
            />
          </label>

          <label className="block">
            <span className="block font-semibold text-zinc-700 mb-1">Cat. Catastale</span>
            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 font-mono text-zinc-950 focus:outline-none focus:border-zinc-950"
              value={commessa.categoriaCatastale ?? ''}
              placeholder="es. A/2"
              onChange={(e) => updateField('categoriaCatastale', e.target.value)}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
          <label className="block">
            <span className="block font-semibold text-zinc-700 mb-1">
              Titolo / Precedente Edilizio Legittimante (art. 9-bis D.P.R. 380/2001)
            </span>
            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
              value={rawDettagli.titoloLegittimante ?? ''}
              placeholder="Es. Licenza / Concessione / DIA / SCIA / CILA / Condono n. e data"
              onChange={(e) => updateProcedimento({ titoloLegittimante: e.target.value })}
            />
          </label>

          <label className="block">
            <span className="block font-semibold text-zinc-700 mb-1">
              Aggiornamento Catastale a Fine Lavori (L. 122/2010)
            </span>
            <input
              className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
              value={rawDettagli.aggiornamentoCatastale ?? ''}
              placeholder="Es. DOCFA previsto a fine lavori / Nessuna variazione catastale"
              onChange={(e) => updateProcedimento({ aggiornamentoCatastale: e.target.value })}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          <label className="block">
            <span className="block font-semibold text-zinc-700 mb-1">Tessuto PRG Roma</span>
            <select
              className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
              value={commessa.tessutoPRG ?? TESSUTI_PRG[0]}
              onChange={(e) => updateField('tessutoPRG', e.target.value)}
            >
              {TESSUTI_PRG.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2.5 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 cursor-pointer mt-auto">
            <input
              type="checkbox"
              checked={haCartaQualita}
              onChange={(e) => updateField('cartaQualita', e.target.checked)}
              className="rounded border-zinc-400 text-zinc-950 focus:ring-zinc-950"
            />
            <span className="font-semibold text-zinc-900">Carta per la Qualità PRG</span>
          </label>

          <label className="flex items-center gap-2.5 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 cursor-pointer mt-auto">
            <input
              type="checkbox"
              checked={haVincoloSoprintendenza}
              onChange={(e) => updateField('vincoloSoprintendenza', e.target.checked)}
              className="rounded border-zinc-400 text-zinc-950 focus:ring-zinc-950"
            />
            <span className="font-semibold text-zinc-900">Vincolo D.Lgs 42/2004</span>
          </label>
        </div>

        {haCartaQualita && (
          <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-3.5 space-y-3 pt-2">
            <span className="block text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-900">
              Prescrizioni Carta per la Qualità — PRG Roma
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <label className="block">
                <span className="block font-semibold text-zinc-700 mb-1">
                  Ambito / Elemento della Carta per la Qualità
                </span>
                <input
                  className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
                  value={rawDettagli.ambitoCartaQualita ?? ''}
                  placeholder="Es. Tessuto storico, cortine edilizie, spazi aperti, verde o microclima"
                  onChange={(e) => updateProcedimento({ ambitoCartaQualita: e.target.value })}
                />
              </label>

              <label className="block">
                <span className="block font-semibold text-zinc-700 mb-1">
                  Coerenza Materiali / Infissi / Permeabilità (DAC 90/2026 &amp; R.E.C.)
                </span>
                <input
                  className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
                  value={rawDettagli.prescrizioniCartaQualita ?? ''}
                  placeholder="Rispetto caratteri tipologici, superfici permeabili e invarianza idraulica"
                  onChange={(e) =>
                    updateProcedimento({ prescrizioniCartaQualita: e.target.value })
                  }
                />
              </label>
            </div>
          </div>
        )}

        {haVincoloSoprintendenza && (
          <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-3.5 space-y-3 pt-2">
            <span className="block text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-900">
              Dettagli Tutela Soprintendenza — D.Lgs. 42/2004
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <label className="block">
                <span className="block font-semibold text-zinc-700 mb-1">Tipologia di Tutela</span>
                <input
                  className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
                  value={rawDettagli.tipoTutelaBeniCulturali ?? ''}
                  placeholder="Es. Bene culturale Parte II / Paesaggistico Parte III"
                  onChange={(e) =>
                    updateProcedimento({ tipoTutelaBeniCulturali: e.target.value })
                  }
                />
              </label>

              <label className="block">
                <span className="block font-semibold text-zinc-700 mb-1">
                  Estremi Autorizzazione / Parere / Istanza
                </span>
                <input
                  className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
                  value={rawDettagli.attoSoprintendenza ?? ''}
                  placeholder="N. protocollo, data o stato istruttoria Soprintendenza"
                  onChange={(e) => updateProcedimento({ attoSoprintendenza: e.target.value })}
                />
              </label>

              <label className="block">
                <span className="block font-semibold text-zinc-700 mb-1">
                  Prescrizioni &amp; Condizioni di Tutela
                </span>
                <input
                  className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-zinc-950 focus:outline-none focus:border-zinc-950"
                  value={rawDettagli.prescrizioniTutela ?? ''}
                  placeholder="Materiali, infissi, cromie o cautele operative"
                  onChange={(e) => updateProcedimento({ prescrizioniTutela: e.target.value })}
                />
              </label>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl bg-white border border-zinc-300 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-200 pb-2.5">
          <div className="flex items-center gap-2">
            <FileCheck2 size={15} className="text-zinc-800" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-900">
              Checklist Iter Operativo (6 Step)
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-zinc-900 tabular-nums">
            {completati}/6 completati ({pct}%)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {STEP_LABELS.map((label, idx) => {
            const done = steps[idx];
            return (
              <button
                key={idx}
                type="button"
                onClick={() => toggleStep(commessa.id, idx)}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-xs transition-colors ${
                  done
                    ? 'bg-zinc-950 text-white border-zinc-950 font-semibold'
                    : 'bg-zinc-50 text-zinc-800 border-zinc-300 hover:border-zinc-950'
                }`}
              >
                {done ? (
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                ) : (
                  <Circle size={15} className="text-zinc-400 shrink-0" />
                )}
                <span className="truncate">
                  {idx + 1}. {label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="pt-2 border-t border-zinc-200">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-700 mb-1.5">
            <span>Barra avanzamento commessa</span>
            <span className="font-bold text-zinc-950 tabular-nums">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
            <div
              className="h-full bg-zinc-950 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}