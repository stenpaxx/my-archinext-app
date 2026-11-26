import { useEffect, useRef, useState } from 'react';
import {
  Building2,
  ChevronDown,
  Upload,
  BadgeCheck,
  Landmark,
  AlertTriangle,
  Info,
  Compass,
  MapPin,
  FileText,
  Trash2,
  FolderUp,
  ExternalLink,
  Check,
} from 'lucide-react';
import { useStore, EMPTY_VANI } from '@/lib/store';
import { MUNICIPI, STEP_LABELS, TESSUTI_PRG, type Commessa, type TipologiaCommessa } from '@/lib/types';

declare global {
  interface Window {
    L?: {
      map: (el: HTMLElement, opts?: Record<string, unknown>) => LeafletMap;
      tileLayer: (url: string, opts?: Record<string, unknown>) => LeafletTileLayer;
      divIcon: (opts: Record<string, unknown>) => unknown;
      marker: (latlng: [number, number], opts?: Record<string, unknown>) => LeafletLayer;
      polygon: (latlngs: [number, number][], opts?: Record<string, unknown>) => LeafletLayer;
    };
  }
}

interface LeafletTileLayer {
  addTo: (m: LeafletMap) => LeafletTileLayer;
  remove: () => void;
  on: (event: string, fn: () => void) => LeafletTileLayer;
}

interface LeafletLayer {
  addTo: (m: LeafletMap) => LeafletLayer;
  bindPopup: (html: string) => LeafletLayer;
}

interface LeafletMap {
  setView: (latlng: [number, number], zoom?: number) => void;
  remove: () => void;
}

type OutputFormat = 'DWG' | 'DXF' | 'IFC' | 'PDF' | 'PNG' | 'JPG' | 'JPEG';

interface ImportedOutputFile {
  id: string;
  name: string;
  format: OutputFormat;
  sizeBytes: number;
  uploadedAt: string;
  metaSummary: string;
  previewUrl?: string;
}

const OUTPUT_ACCEPT = '.dwg,.dxf,.ifc,.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg';

const LEAFLET_CSS_ID = 'leaflet-cdn-css';
const LEAFLET_JS_ID = 'leaflet-cdn-js';

function ensureLeafletLoaded(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve();
      return;
    }

    if (!document.getElementById(LEAFLET_CSS_ID)) {
      const link = document.createElement('link');
      link.id = LEAFLET_CSS_ID;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById(LEAFLET_JS_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Errore caricamento Leaflet')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = LEAFLET_JS_ID;
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Errore caricamento Leaflet'));
    document.body.appendChild(script);
  });
}

const DEFAULT_ROMA_COORDS: [number, number] = [41.8975, 12.4904];

const TIPOLOGIE: TipologiaCommessa[] = [
  'Manutenzione Straordinaria CILA',
  'Frazionamento CILA',
  'Ristrutturazione SCIA',
  'Cambio d’uso SCIA',
];

const CATEGORIE_CATASTALI = ['A/2', 'A/3', 'A/4', 'A/7', 'A/8', 'A/9', 'A/10', 'A/11', 'C/1'];

const EMPTY_STEPS: boolean[] = [false, false, false, false, false, false, false];

interface NtaTessutoMeta {
  macroAmbito: string;
  attuazione: string;
  titoloIndicativo: string;
  prescrizioni: string;
  ammessiFallback: string[];
  noteFallback: string;
}

const NTA_PROFILI: Record<string, NtaTessutoMeta> = {
  T1: {
    macroAmbito: 'Città Storica — Nucleo storico',
    attuazione: 'Intervento diretto con prescrizioni tipologiche/morfologiche stringenti',
    titoloIndicativo: 'CILA / SCIA / PdC (verificare tutela diretta/indiretta)',
    prescrizioni: 'Massima tutela dell’impianto distributivo, delle cortine edilizie e degli elementi architettonici originari; attenzione a frazionamenti e cambi d’uso.',
    ammessiFallback: ['Manutenzione Ordinaria', 'Manutenzione Straordinaria', 'Restauro e Risanamento Conservativo'],
    noteFallback: 'Verifica puntuale delle NTA Città Storica (Titolo III) e coerenza con l’impianto originario.',
  },
  T2: {
    macroAmbito: 'Città Storica — Tessuto storico',
    attuazione: 'Intervento diretto con controllo delle trasformazioni interne ed esterne',
    titoloIndicativo: 'CILA / SCIA + eventuale parere/autorizzazione',
    prescrizioni: 'Tutela dei caratteri morfologici e tipologici dell’edilizia storica; cautela su aperture prospettiche, soppalchi e frazionamenti.',
    ammessiFallback: ['Manutenzione Ordinaria', 'Manutenzione Straordinaria', 'Restauro e Risanamento Conservativo', 'Ristrutturazione Edilizia (nei limiti NTA)'],
    noteFallback: 'Controllo coerenza catastale/storica e rispetto delle prescrizioni del tessuto T2.',
  },
  T3: {
    macroAmbito: 'Città Storica — Tessuto di espansione novecentesca',
    attuazione: 'Intervento diretto ordinario / convenzionato ove previsto',
    titoloIndicativo: 'CILA / SCIA / PdC',
    prescrizioni: 'Attenzione ai caratteri architettonici dei quartieri novecenteschi, ai cortili/distacchi e agli eventuali riferimenti alla Carta per la Qualità.',
    ammessiFallback: ['Manutenzione Ordinaria', 'Manutenzione Straordinaria', 'Restauro e Risanamento Conservativo', 'Ristrutturazione Edilizia'],
    noteFallback: 'Verifica rapporti plano-volumetrici, superfici permeabili e prescrizioni di tessuto.',
  },
  T7: {
    macroAmbito: 'Città Consolidata — Tessuto urbano consolidato',
    attuazione: 'Intervento diretto',
    titoloIndicativo: 'CILA / SCIA / PdC / Cambio d’uso',
    prescrizioni: 'Rispetto dei parametri urbanistici/edilizi di zona, delle destinazioni d’uso ammesse e della dotazione di standard/parcheggi ove richiesta.',
    ammessiFallback: ['Manutenzione Ordinaria', 'Manutenzione Straordinaria', 'Ristrutturazione Edilizia', 'Cambio d’uso (negli ambiti previsti)'],
    noteFallback: 'Verifica ammissibilità funzionale e dotazioni urbanistiche in caso di cambio d’uso o frazionamento.',
  },
  T13: {
    macroAmbito: 'Città da Ristrutturare',
    attuazione: 'Intervento diretto o subordinato a strumenti attuativi/convenzioni',
    titoloIndicativo: 'SCIA / Permesso di Costruire / Piano Attuativo',
    prescrizioni: 'Verificare se l’intervento ricade in comparto/ambito con disciplina attuativa specifica, oneri/contributi e adeguamento delle opere di urbanizzazione.',
    ammessiFallback: ['Manutenzione Ordinaria', 'Manutenzione Straordinaria', 'Ristrutturazione Edilizia', 'Ristrutturazione Urbanistica (ove previsto)'],
    noteFallback: 'Controllo preliminare su eventuali ambiti di pianificazione esecutiva e contributi/standard.',
  },
};

const DEFAULT_NTA_META: NtaTessutoMeta = {
  macroAmbito: 'Sistemi e Regole del PRG di Roma Capitale',
  attuazione: 'Intervento diretto / verifica puntuale NTA',
  titoloIndicativo: 'CILA / SCIA / PdC (secondo categoria di intervento)',
  prescrizioni: 'Verificare l’articolo specifico delle NTA del PRG associato alla sigla di tessuto/ambito e l’eventuale sovrapposizione con Carta per la Qualità e vincoli.',
  ammessiFallback: ['Manutenzione Ordinaria', 'Manutenzione Straordinaria', 'Ristrutturazione Edilizia'],
  noteFallback: 'Aggiornamento dinamico collegato alla sigla del tessuto selezionato.',
};

function estraiSiglaTessuto(valore?: string): string {
  if (!valore) return '';
  const match = valore.trim().match(/^([A-Za-z]+\d+)/);
  return match ? match[1].toUpperCase() : valore.trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function detectOutputFormat(fileName: string): OutputFormat | null {
  const ext = fileName.split('.').pop()?.toUpperCase();
  if (ext === 'DWG' || ext === 'DXF' || ext === 'IFC' || ext === 'PDF' || ext === 'PNG' || ext === 'JPG' || ext === 'JPEG') {
    return ext;
  }
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

async function analyzeOutputFile(file: File, format: OutputFormat): Promise<{ metaSummary: string; previewUrl?: string }> {
  if (format === 'PNG' || format === 'JPG' || format === 'JPEG') {
    const previewUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
    return {
      metaSummary: `Tavola / Immagine ${format} · Pronta per revisione`,
      previewUrl: previewUrl || undefined,
    };
  }

  if (format === 'PDF') {
    return { metaSummary: 'Documento PDF · Elaborato grafico / relazione' };
  }

  if (format === 'DWG') {
    return { metaSummary: 'CAD DWG · Interscambio planimetrico' };
  }

  if (format === 'DXF' || format === 'IFC') {
    const headText = await file.slice(0, 65536).text();
    if (format === 'IFC') {
      const spacesCount = (headText.match(/IFCSPACE/gi) ?? []).length;
      const wallsCount = (headText.match(/IFCWALL/gi) ?? []).length;
      return {
        metaSummary:
          spacesCount > 0 || wallsCount > 0
            ? `BIM IFC · ${spacesCount} vani (IfcSpace), ${wallsCount} pareti (IfcWall)`
            : 'Modello BIM IFC · Pronta estrazione entità',
      };
    }

    const layerMatches = headText.match(/LAYER\s+[\s\S]*?2\s*\n([^\r\n]+)/g) ?? [];
    const distinctLayers = new Set<string>();
    for (const block of layerMatches) {
      const parts = block.split(/\r?\n/);
      const name = parts[parts.length - 1]?.trim();
      if (name && name.length <= 32) distinctLayers.add(name);
    }
    return {
      metaSummary:
        distinctLayers.size > 0
          ? `CAD DXF · ${distinctLayers.size} layer rilevati`
          : 'CAD DXF · Interscambio vettoriale',
    };
  }

  return { metaSummary: `Formato ${format}` };
}

async function fetchBuildingFootprints(
  center: [number, number],
  signal: AbortSignal
): Promise<[number, number][][]> {
  const [lat, lon] = center;
  const query = `[out:json][timeout:10];way["building"](around:160,${lat},${lon});out body;>;out skel qt;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    signal,
  });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    elements?: Array<{
      type: string;
      id: number;
      lat?: number;
      lon?: number;
      nodes?: number[];
    }>;
  };

  const elements = data.elements ?? [];
  const nodes = new Map<number, [number, number]>();
  for (const el of elements) {
    if (el.type === 'node' && typeof el.lat === 'number' && typeof el.lon === 'number') {
      nodes.set(el.id, [el.lat, el.lon]);
    }
  }

  const polygons: [number, number][][] = [];
  for (const el of elements) {
    if (el.type === 'way' && Array.isArray(el.nodes)) {
      const coords: [number, number][] = [];
      for (const nid of el.nodes) {
        const pt = nodes.get(nid);
        if (pt) coords.push(pt);
      }
      if (coords.length >= 3) {
        polygons.push(coords);
      }
    }
  }

  return polygons;
}

const inputCls =
  'w-full bg-white border border-zinc-400 rounded-lg px-2.5 py-1.5 text-[13px] text-zinc-950 focus:outline-none focus:border-zinc-950 transition-colors';

function TextInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (val: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-zinc-700 mb-1">{label}</span>
      <input
        className={inputCls}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-zinc-700 mb-1">{label}</span>
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DueDiligence() {
  const attivaId = useStore((s) => s.attivaId);
  const commessa = useStore((s) => s.commesse.find((c) => c.id === s.attivaId));
  const vani = useStore((s) => (s.attivaId ? s.vani[s.attivaId] ?? EMPTY_VANI : EMPTY_VANI));
  const aggiornaCommessa = useStore((s) => s.aggiornaCommessa);
  const steps = useStore((s) => (attivaId ? s.steps[attivaId] ?? EMPTY_STEPS : EMPTY_STEPS));
  const toggleStep = useStore((s) => s.toggleStep);

  const [openDati, setOpenDati] = useState(false);
  const [coords, setCoords] = useState<[number, number]>(DEFAULT_ROMA_COORDS);
  const [geoStatus, setGeoStatus] = useState<string>('41.8975°N, 12.4904°E');
  const [formapsCopied, setFormapsCopied] = useState(false);
  const [importedFilesByCommessa, setImportedFilesByCommessa] = useState<Record<string, ImportedOutputFile[]>>({});
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);

  const indirizzoCommessa = commessa?.indirizzo ?? '';
  const municipioCommessa = commessa?.municipio ?? '';
  const titoloCommessa = commessa?.titolo ?? '';
  const foglioCommessa = commessa?.foglio ?? '';
  const particellaCommessa = commessa?.particella ?? '';
  const subalternoCommessa = commessa?.subalterno ?? '';

  useEffect(() => {
    const queryRaw = indirizzoCommessa.trim();
    if (!queryRaw) {
      setCoords(DEFAULT_ROMA_COORDS);
      setGeoStatus('41.8975°N, 12.4904°E');
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const q = queryRaw.toLowerCase().includes('roma') ? queryRaw : `${queryRaw}, Roma, Italia`;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const results = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (results.length > 0) {
          const lat = Number(results[0].lat);
          const lon = Number(results[0].lon);
          if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
            setCoords([lat, lon]);
            setGeoStatus(`${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`);
            return;
          }
        }
        setCoords(DEFAULT_ROMA_COORDS);
        setGeoStatus('41.8975°N, 12.4904°E');
      } catch {
        // ignora errori rete o abort
      }
    }, 500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [indirizzoCommessa, municipioCommessa]);

  useEffect(() => {
    if (!commessa) return;
    let cancelled = false;
    const overpassController = new AbortController();

    ensureLeafletLoaded()
      .then(async () => {
        if (cancelled || !mapContainerRef.current || !window.L) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const L = window.L;
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: true,
        });
        map.setView(coords, 18);

        const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 20,
          maxNativeZoom: 19,
          attribution: '&copy; OpenStreetMap',
        });

        osmLayer.on('tileerror', () => {
          L.tileLayer('https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 20,
            maxNativeZoom: 19,
            attribution: '&copy; OpenStreetMap',
          }).addTo(map);
        });

        osmLayer.addTo(map);

        try {
          const buildings = await fetchBuildingFootprints(coords, overpassController.signal);
          if (!cancelled && buildings.length > 0) {
            for (const polyCoords of buildings) {
              L.polygon(polyCoords, {
                color: '#52525b',
                weight: 1.1,
                fillColor: '#a1a1aa',
                fillOpacity: 0.36,
              }).addTo(map);
            }
          }
        } catch {
          // ignora eventuale timeout Overpass
        }

        const labelVia = escapeHtml(indirizzoCommessa.trim() || titoloCommessa || 'Immobile');
        const singleMarkIcon = L.divIcon({
          className: 'archinext-single-mark',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          html: `
            <div style="position:relative;width:18px;height:18px;display:flex;align-items:center;justify-content:center;">
              <span style="position:absolute;width:28px;height:28px;border-radius:9999px;background:rgba(9,9,11,0.12);border:1px dashed rgba(9,9,11,0.55);"></span>
              <span style="position:relative;width:11px;height:11px;border-radius:2px;background:#09090b;border:2px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></span>
              <span style="position:absolute;left:22px;white-space:nowrap;background:#ffffff;color:#09090b;border:1px solid #a1a1aa;border-radius:5px;padding:2px 7px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;font-weight:700;box-shadow:0 1px 3px rgba(0,0,0,0.12);">${labelVia}</span>
            </div>
          `,
        });

        L.marker(coords, { icon: singleMarkIcon })
          .addTo(map)
          .bindPopup(
            `<strong>${escapeHtml(titoloCommessa)}</strong><br/>${labelVia}<br/>Fg ${escapeHtml(foglioCommessa || '—')} · Part ${escapeHtml(particellaCommessa || '—')}${subalternoCommessa ? ` · Sub ${escapeHtml(subalternoCommessa)}` : ''}`
          );

        mapInstanceRef.current = map;
      })
      .catch(() => {
        // fallback gestito dal contenitore
      });

    return () => {
      cancelled = true;
      overpassController.abort();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [
    commessa,
    coords,
    indirizzoCommessa,
    titoloCommessa,
    foglioCommessa,
    particellaCommessa,
    subalternoCommessa,
  ]);

  if (!commessa) {
    return (
      <div className="p-10 text-sm text-zinc-700">
        Nessuna commessa attiva. Creane una dalla barra laterale.
      </div>
    );
  }

  const pct = Math.round((steps.filter(Boolean).length / 7) * 100);
  const upd = (patch: Partial<Commessa>) => aggiornaCommessa(commessa.id, patch);

  const mqVani = vani.reduce((acc, v) => acc + (Number(v.superficie) || 0), 0);
  const superficieMq = mqVani > 0 ? mqVani : 130;

  const siglaCorrente = estraiSiglaTessuto(commessa.tessutoPRG);
  const tessuto = TESSUTI_PRG.find((t) => t.sigla.toUpperCase() === siglaCorrente);
  const ntaMeta = NTA_PROFILI[siglaCorrente] ?? DEFAULT_NTA_META;
  const interventiAmmessi = tessuto?.ammessi?.length ? tessuto.ammessi : ntaMeta.ammessiFallback;
  const notaTessuto = tessuto?.note || ntaMeta.noteFallback;
  const etichettaTessuto = tessuto ? `${tessuto.sigla} — ${tessuto.nome}` : commessa.tessutoPRG || 'Non impostato';

  const foglioLabel = commessa.foglio || '—';
  const particellaLabel = commessa.particella || '—';
  const subLabel = commessa.subalterno || '—';

  const indirizzoPerFormaps = (commessa.indirizzo || commessa.titolo || 'Roma').trim();
  const formapsHref = `https://www.formaps.it/?q=${encodeURIComponent(indirizzoPerFormaps)}&lat=${coords[0].toFixed(6)}&lon=${coords[1].toFixed(6)}`;

  const handleOpenFormaps = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(indirizzoPerFormaps).catch(() => {});
    }
    setFormapsCopied(true);
    window.setTimeout(() => setFormapsCopied(false), 3000);
  };

  const importedFiles = importedFilesByCommessa[commessa.id] ?? [];

  const importaJSONMultipli = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    let importedCount = 0;
    for (const file of Array.from(fileList)) {
      try {
        const data = JSON.parse(await file.text());
        if (data && typeof data === 'object') {
          upd(data as Partial<Commessa>);
          importedCount += 1;
        }
      } catch {
        // file JSON non valido: ignorato
      }
    }
    if (importedCount > 0) {
      setImportNotice(
        `Importati ${importedCount} ${importedCount === 1 ? 'file JSON' : 'file JSON'} sulla commessa.`
      );
    }
  };

  const importaOutputMultipli = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const filesArray = Array.from(fileList);
    const added: ImportedOutputFile[] = [];
    const skipped: string[] = [];
    const nowLabel = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    for (const file of filesArray) {
      const fmt = detectOutputFormat(file.name);
      if (!fmt) {
        skipped.push(file.name);
        continue;
      }
      const analysis = await analyzeOutputFile(file, fmt);
      added.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        format: fmt,
        sizeBytes: file.size,
        uploadedAt: nowLabel,
        metaSummary: analysis.metaSummary,
        previewUrl: analysis.previewUrl,
      });
    }

    if (added.length > 0) {
      setImportedFilesByCommessa((prev) => ({
        ...prev,
        [commessa.id]: [...added, ...(prev[commessa.id] ?? [])],
      }));
    }

    if (skipped.length > 0) {
      setImportNotice(
        `Importati ${added.length} file. Ignorati formati non supportati: ${skipped.join(', ')}.`
      );
    } else if (added.length > 0) {
      setImportNotice(`Importati ${added.length} ${added.length === 1 ? 'file' : 'file'} sulla commessa.`);
    }
  };

  const rimuoviFileImportato = (fileId: string) => {
    setImportedFilesByCommessa((prev) => ({
      ...prev,
      [commessa.id]: (prev[commessa.id] ?? []).filter((f) => f.id !== fileId),
    }));
  };

  const svuotaFileImportati = () => {
    setImportedFilesByCommessa((prev) => ({
      ...prev,
      [commessa.id]: [],
    }));
    setImportNotice(null);
  };

  return (
    <div className="space-y-6">
      <style>{`
        .archinext-single-mark {
          background: transparent !important;
          border: none !important;
        }
        .archinext-clean-map .leaflet-container {
          background: #f4f4f5;
        }
        .archinext-clean-map .leaflet-tile-pane {
          filter: grayscale(100%) saturate(0%) contrast(0.88) brightness(1.08);
        }
        .archinext-clean-map .leaflet-marker-pane,
        .archinext-clean-map .leaflet-overlay-pane {
          filter: none;
        }
      `}</style>

      <header>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
          1. Due Diligence
        </h1>
        <p className="text-xs sm:text-sm text-zinc-700 mt-0.5">
          Inquadramento catastale, localizzazione puntuale dell’immobile e fattibilità PRG Roma Capitale.
        </p>
      </header>

      {/* Scheda commessa + Mappa */}
      <section className="bg-white rounded-xl border border-zinc-300 overflow-hidden shadow-xs">
        <div className="bg-zinc-950 px-5 sm:px-6 py-5 flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800">
          <div className="min-w-0">
            <p className="text-xs font-mono text-zinc-300">COMMESSA {commessa.codice}</p>
            <h2 className="text-white text-lg font-bold tracking-tight mt-0.5 truncate">
              {commessa.titolo}
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-[12px] text-zinc-200">
              <span className="inline-flex items-center gap-1.5">
                <Building2 size={13} className="text-zinc-300" />
                {commessa.indirizzo || 'Indirizzo non impostato'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Landmark size={13} className="text-zinc-300" />
                {commessa.municipio || '—'}
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-white">
                <Compass size={13} className="text-zinc-300" />
                {etichettaTessuto}
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-zinc-100">
                <MapPin size={13} className="text-zinc-300" />
                {superficieMq.toFixed(1)} m²
              </span>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-col gap-2 items-start sm:items-end">
            {commessa.cartaQualita && (
              <span className="inline-flex items-center gap-1.5 bg-zinc-800 text-emerald-300 border border-emerald-600/60 text-xs font-medium px-3 py-1 rounded-full">
                <BadgeCheck size={14} /> Carta per la Qualità
              </span>
            )}
            {commessa.vincoloSoprintendenza && (
              <span className="inline-flex items-center gap-1.5 bg-zinc-800 text-amber-300 border border-amber-600/60 text-xs font-medium px-3 py-1 rounded-full">
                <AlertTriangle size={14} /> Vincolo Soprintendenza
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-zinc-300 bg-zinc-100/80">
          <div className="lg:col-span-8 p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-zinc-300">
            <div className="flex items-center justify-between gap-2 mb-2 text-xs font-mono text-zinc-800">
              <span>{geoStatus}</span>
              {importedFiles.length > 0 && (
                <span className="text-[11px] text-zinc-600">
                  {importedFiles.length} {importedFiles.length === 1 ? 'file' : 'file'}
                </span>
              )}
            </div>

            <div className="relative rounded-xl border border-zinc-300 bg-white p-2 shadow-2xs">
              <div className="relative rounded-lg border border-zinc-300 overflow-hidden z-0 archinext-clean-map">
                <div ref={mapContainerRef} className="w-full h-56 sm:h-64" />
                <a
                  href={formapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleOpenFormaps}
                  title={`Apri FORMapS e copia "${indirizzoPerFormaps}" negli appunti`}
                  className="absolute top-2.5 right-2.5 z-[400] inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 font-mono text-[11px] font-bold tracking-wide text-white shadow-md hover:bg-zinc-800 transition-colors"
                >
                  {formapsCopied ? (
                    <>
                      <Check size={12} className="text-emerald-300" />
                      <span>Indirizzo copiato</span>
                    </>
                  ) : (
                    <>
                      <span>FORMapS</span>
                      <ExternalLink size={12} />
                    </>
                  )}
                </a>
                <div
                  className="pointer-events-none absolute inset-0 z-[350]"
                  style={{
                    boxShadow: 'inset 0 0 24px 8px rgba(255, 255, 255, 0.55)',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 p-5 bg-white flex flex-col justify-between gap-5">
            <div>
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-600">
                Superficie Riferimento
              </span>
              <p className="text-3xl font-mono font-bold text-zinc-950 mt-1 tabular-nums">
                {superficieMq.toFixed(1)} <span className="text-base font-medium text-zinc-700">m²</span>
              </p>
              <p className="text-xs text-zinc-700 mt-1.5 leading-relaxed">
                {vani.length > 0
                  ? `Somma superfici dei ${vani.length} vani censiti nella commessa.`
                  : 'Valore di riferimento iniziale; si aggiorna con i vani inseriti.'}
              </p>
            </div>

            <div className="space-y-2 pt-3 border-t border-zinc-300 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-600">FOGLIO</span>
                <span className="text-zinc-950 font-semibold">{foglioLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">PARTICELLA</span>
                <span className="text-zinc-950 font-semibold">{particellaLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">SUBALTERNO</span>
                <span className="text-zinc-950 font-semibold">{subLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">CATEGORIA</span>
                <span className="text-zinc-950 font-semibold">{commessa.categoriaCatastale || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">MUNICIPIO</span>
                <span className="text-zinc-950 font-semibold">{commessa.municipio || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpenDati(!openDati)}
          className="w-full px-5 sm:px-6 py-3 flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-900 hover:bg-zinc-100 border-b border-zinc-300 transition-colors"
        >
          <span>Modifica anagrafica, dati catastali e output</span>
          <ChevronDown
            size={16}
            className={`ml-auto text-zinc-700 transition-transform ${openDati ? 'rotate-180' : ''}`}
          />
        </button>

        {openDati && (
          <div className="p-5 sm:p-6 space-y-5 bg-zinc-100/90 border-b border-zinc-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TextInput label="Titolo" value={commessa.titolo} onChange={(v) => upd({ titolo: v })} />
              <TextInput
                label="Indirizzo (Roma)"
                value={commessa.indirizzo}
                placeholder="Via del Boschetto, 00184 Roma RM"
                onChange={(v) => upd({ indirizzo: v })}
              />
              <SelectInput
                label="Municipio"
                value={commessa.municipio}
                options={[...MUNICIPI]}
                onChange={(v) => upd({ municipio: v })}
              />
              <TextInput label="Foglio" value={commessa.foglio} onChange={(v) => upd({ foglio: v })} />
              <TextInput label="Particella" value={commessa.particella} onChange={(v) => upd({ particella: v })} />
              <TextInput label="Subalterno" value={commessa.subalterno} onChange={(v) => upd({ subalterno: v })} />
              <SelectInput
                label="Categoria catastale"
                value={commessa.categoriaCatastale}
                options={CATEGORIE_CATASTALI}
                onChange={(v) => upd({ categoriaCatastale: v })}
              />
              <TextInput
                label="Rendita catastale"
                value={commessa.rendita}
                placeholder="€ 0.000,00"
                onChange={(v) => upd({ rendita: v })}
              />
              <SelectInput
                label="Tipologia intervento"
                value={commessa.tipologia}
                options={TIPOLOGIE}
                onChange={(v) => upd({ tipologia: v as TipologiaCommessa })}
              />
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={commessa.cartaQualita}
                  onChange={(e) => upd({ cartaQualita: e.target.checked })}
                  className="w-4 h-4 accent-zinc-950 rounded"
                />
                <span className="text-[13px] font-medium text-zinc-800">Carta per la Qualità</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={commessa.vincoloSoprintendenza}
                  onChange={(e) => upd({ vincoloSoprintendenza: e.target.checked })}
                  className="w-4 h-4 accent-zinc-950 rounded"
                />
                <span className="text-[13px] font-medium text-zinc-800">Vincolo Soprintendenza (D.Lgs 42/2004)</span>
              </label>
              <div className="flex items-end justify-end">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-800 cursor-pointer hover:text-zinc-950 transition-colors">
                  <Upload size={13} /> Importa dati (.json)
                  <input
                    type="file"
                    multiple
                    accept=".json"
                    className="hidden"
                    onChange={async (e) => {
                      await importaJSONMultipli(e.target.files);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Importazione multipla output */}
            <div className="rounded-xl border border-zinc-300 bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-zinc-950">Importazione multipla output</p>
                  <p className="text-[11px] font-mono text-zinc-600 mt-0.5">
                    DWG · DXF · IFC · PDF · PNG · JPG / JPEG (selezione multipla)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {importedFiles.length > 0 && (
                    <button
                      type="button"
                      onClick={svuotaFileImportati}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-300 text-[11px] font-semibold text-zinc-700 hover:text-zinc-950 hover:border-zinc-950 transition-colors"
                    >
                      <Trash2 size={12} /> Svuota ({importedFiles.length})
                    </button>
                  )}

                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 text-white text-xs font-semibold cursor-pointer hover:bg-zinc-800 transition-colors">
                    <FolderUp size={13} /> Importa output
                    <input
                      type="file"
                      multiple
                      accept={OUTPUT_ACCEPT}
                      className="hidden"
                      onChange={async (e) => {
                        await importaOutputMultipli(e.target.files);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>

              {importNotice && (
                <p className="text-[11px] font-mono text-zinc-800 bg-zinc-100 border border-zinc-300 rounded-lg px-3 py-2">
                  {importNotice}
                </p>
              )}

              {importedFiles.length > 0 && (
                <ul className="divide-y divide-zinc-200 border border-zinc-200 rounded-lg overflow-hidden">
                  {importedFiles.map((item) => (
                    <li
                      key={item.id}
                      className="px-3 py-2.5 bg-zinc-50/70 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            className="w-10 h-10 rounded border border-zinc-300 object-cover shrink-0 grayscale"
                          />
                        ) : (
                          <span className="w-10 h-10 rounded border border-zinc-300 bg-white flex items-center justify-center font-mono text-[10px] font-bold text-zinc-900 shrink-0">
                            {item.format}
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText size={12} className="text-zinc-600 shrink-0" />
                            <span className="font-semibold text-zinc-950 truncate">{item.name}</span>
                          </div>
                          <p className="text-[11px] font-mono text-zinc-600 truncate mt-0.5">
                            {item.metaSummary} · {formatFileSize(item.sizeBytes)} · {item.uploadedAt}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => rimuoviFileImportato(item.id)}
                        className="p-1.5 rounded text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/70 transition-colors shrink-0"
                        title="Rimuovi file"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Tessuto PRG */}
      <section className="bg-white rounded-xl border border-zinc-300 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-sm font-bold text-zinc-950">Tessuto urbanistico PRG Roma Capitale</h3>
          <span className="text-[11px] font-mono font-semibold text-zinc-900 bg-zinc-100 border border-zinc-300 rounded-full px-3 py-0.5">
            {ntaMeta.macroAmbito}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="block">
              <span className="block text-[11px] font-semibold text-zinc-700 mb-1">Tessuto / Zona</span>
              <select
                className={inputCls}
                value={siglaCorrente}
                onChange={(e) => upd({ tessutoPRG: e.target.value })}
              >
                {TESSUTI_PRG.map((t) => (
                  <option key={t.sigla} value={t.sigla}>
                    {t.sigla} — {t.nome}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-lg bg-zinc-100 border border-zinc-300 p-3.5 text-xs space-y-1.5">
              <div>
                <span className="font-bold text-zinc-900">Modalità attuativa: </span>
                <span className="text-zinc-800">{ntaMeta.attuazione}</span>
              </div>
              <div>
                <span className="font-bold text-zinc-900">Titolo indicativo: </span>
                <span className="text-zinc-800">{ntaMeta.titoloIndicativo}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-zinc-100 border border-zinc-300 p-3.5 flex flex-col justify-between">
            <div>
              <p className="text-[11px] font-bold text-zinc-800 mb-1.5">Interventi ammessi</p>
              <div className="flex flex-wrap gap-1.5">
                {interventiAmmessi.map((a) => (
                  <span
                    key={a}
                    className="text-[11px] bg-white text-zinc-950 border border-zinc-400 rounded-full px-2.5 py-0.5 font-semibold"
                  >
                    {a}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-zinc-800 mt-2.5 leading-relaxed">{notaTessuto}</p>
            </div>
            <p className="text-[11px] text-zinc-700 mt-3 pt-2 border-t border-zinc-300 leading-relaxed">
              <strong className="text-zinc-950">Prescrizioni NTA:</strong> {ntaMeta.prescrizioni}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {commessa.cartaQualita && (
            <div className="flex items-start gap-2.5 rounded-lg border border-emerald-400/80 bg-emerald-50 px-3.5 py-2.5">
              <BadgeCheck size={16} className="text-emerald-800 mt-0.5 shrink-0" />
              <p className="text-[12px] text-emerald-950 leading-relaxed">
                <strong>Carta per la Qualità attiva.</strong> Verificare requisiti architettonici e morfologici per il tessuto di appartenenza.
              </p>
            </div>
          )}
          {commessa.vincoloSoprintendenza && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-400/80 bg-amber-50 px-3.5 py-2.5">
              <AlertTriangle size={16} className="text-amber-800 mt-0.5 shrink-0" />
              <p className="text-[12px] text-amber-950 leading-relaxed">
                <strong>Vincolo Soprintendenza.</strong> Necessaria acquisizione del parere/autorizzazione paesaggistica o di tutela.
              </p>
            </div>
          )}
          {!commessa.cartaQualita && !commessa.vincoloSoprintendenza && (
            <div className="flex items-start gap-2.5 rounded-lg border border-zinc-300 bg-zinc-100 px-3.5 py-2.5">
              <Info size={16} className="text-zinc-700 mt-0.5 shrink-0" />
              <p className="text-[12px] text-zinc-800">
                Nessun vincolo speciale attivo. Verificare comunque gli adempimenti ordinari (asseverazioni, impianti e L. 132/2025).
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Avanzamento */}
      <section className="bg-white rounded-xl border border-zinc-300 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-zinc-950">Avanzamento pratiche</h3>
          <span className="text-2xl font-bold text-zinc-950 tabular-nums">{pct}%</span>
        </div>
        <div className="h-2.5 bg-zinc-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-zinc-950 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs font-medium text-zinc-700 mt-2">
          {steps.filter(Boolean).length} di 7 step completati
        </p>
      </section>

      {/* Checklist 7 step */}
      <section className="space-y-2">
        {STEP_LABELS.map((label, i) => {
          const done = steps[i];
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggleStep(commessa.id, i)}
              className={`w-full text-left flex items-start gap-3 rounded-xl border px-4 py-3.5 transition-all group ${
                done
                  ? 'bg-emerald-50/90 border-emerald-400/80'
                  : 'bg-white border-zinc-300 hover:border-zinc-950 hover:shadow-xs'
              }`}
            >
              <span
                className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  done
                    ? 'bg-emerald-800 text-white'
                    : 'bg-zinc-200 text-zinc-900 group-hover:bg-zinc-950 group-hover:text-white'
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`block text-[13px] leading-snug ${
                  done ? 'text-emerald-950 line-through decoration-emerald-600' : 'text-zinc-900 font-medium'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </section>
    </div>
  );
}