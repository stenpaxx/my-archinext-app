import { useEffect, useState } from 'react';
import { BookOpen, Upload, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

type CatalogoTab = 'regolamento' | 'nta' | 'prezzari';

interface Props {
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

const ESEMPIO_REC: string = JSON.stringify(
  [
    {
      articolo: 'Art. 40',
      titolo: 'Abitazioni - Superfici, altezze minime e RAI',
      categoria: 'Requisiti igienico-sanitari',
      parametri_json: {
        altezza_min_abitabili_m: 2.7,
        sup_min_camera_singola_mq: 9,
        sup_min_camera_doppia_mq: 14,
        rai_minimo: 0.125,
      },
      testo_sintesi: 'Altezza minima 2,70 m; RAI >= 1/8; camera singola >= 9 mq, doppia >= 14 mq.',
      note_operative: 'Verificare preesistenze legittimate e novita Titolo III bis (DAC 90/2026).',
      versione: 'REC-5261+DAC90-2026',
    },
  ],
  null,
  2
);

const ESEMPIO_NTA: string = JSON.stringify(
  [
    {
      sigla: 'T1',
      nome: 'Tessuto di origine medievale',
      macro_ambito: 'Citta Storica',
      attuazione: 'Intervento diretto',
      titolo_indicativo: 'CILA / SCIA / PdC',
      ammessi: ['MO', 'MS', 'RC', 'RE1'],
      prescrizioni: 'Tutela impianto tipologico e strutturale storico.',
      note: 'Verificare Carta per la Qualita e vincoli D.Lgs. 42/2004.',
      versione: 'NTA-PRG-Roma',
    },
  ],
  null,
  2
);

const ESEMPIO_PREZZARI: string = JSON.stringify(
  [
    {
      codice: 'RM26-001',
      descrizione: 'Demolizione tramezzi in laterizio sp. 12 cm con trasporto a discarica',
      unita_misura: 'mq',
      prezzo_unitario: 18.5,
      incidenza_manodopera: 62.0,
      categoria: 'Demolizioni',
      fonte: 'Prezzario Regionale Lazio',
      versione: '2026',
      attivo: true,
    },
  ],
  null,
  2
);

export function CatalogoAdminModal({ open, onClose, onUpdated }: Props) {
  const [tab, setTab] = useState<CatalogoTab>('regolamento');
  const [jsonText, setJsonText] = useState<string>(ESEMPIO_REC);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    setStatus('idle');
    setMessage('');
    if (tab === 'regolamento') setJsonText(ESEMPIO_REC);
    if (tab === 'nta') setJsonText(ESEMPIO_NTA);
    if (tab === 'prezzari') setJsonText(ESEMPIO_PREZZARI);
  }, [tab]);

  if (!open) return null;

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setStatus('idle');
    setMessage('');
    try {
      const content = await file.text();
      JSON.parse(content);
      setJsonText(content);
      setMessage(`File "${file.name}" caricato e validato.`);
      setStatus('success');
    } catch {
      setMessage('Il file selezionato non contiene JSON valido.');
      setStatus('error');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus('idle');
    setMessage('');

    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Client Supabase non inizializzato in src/lib/supabase.ts.');
      }

      const parsed = JSON.parse(jsonText);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      if (rows.length === 0) {
        throw new Error('Il JSON non contiene elementi da importare.');
      }

      const table =
        tab === 'regolamento'
          ? 'catalogo_regolamento_edilizio'
          : tab === 'nta'
            ? 'catalogo_nta'
            : 'catalogo_prezzari';

      const onConflict =
        tab === 'regolamento'
          ? 'articolo'
          : tab === 'nta'
            ? 'sigla'
            : 'codice';

      const { error } = await supabase
        .from(table)
        .upsert(rows, { onConflict });

      if (error) {
        throw new Error(error.message);
      }

      setStatus('success');
      setMessage(`Aggiornate ${rows.length} voci su "${table}".`);
      onUpdated?.();
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen size={17} className="text-emerald-400" />
            <div>
              <h2 className="text-sm font-semibold">Cassetto Documentale Normativo</h2>
              <p className="text-[11px] text-slate-400">
                Aggiorna cataloghi REC Roma 2026, NTA PRG e Prezzari su Supabase senza toccare il codice
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setTab('regolamento')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  tab === 'regolamento' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Regolamento Edilizio
              </button>
              <button
                type="button"
                onClick={() => setTab('nta')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  tab === 'nta' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                NTA PRG Roma
              </button>
              <button
                type="button"
                onClick={() => setTab('prezzari')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  tab === 'prezzari' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Prezzari
              </button>
            </div>

            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium cursor-pointer transition-colors">
              <Upload size={13} />
              <span>Scegli file JSON</span>
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />
            </label>
          </div>

          <textarea
            rows={12}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
            className="w-full font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg p-3 focus:outline-none focus:border-emerald-600"
          />

          {message && (
            <div
              className={`flex items-center gap-2 text-xs px-3 py-2.5 rounded-lg border ${
                status === 'error'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              {status === 'error' ? (
                <AlertCircle size={15} className="shrink-0 text-red-600" />
              ) : (
                <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
              )}
              <span>{message}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Chiudi
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              <span>{saving ? 'Salvataggio...' : 'Aggiorna su Supabase'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}