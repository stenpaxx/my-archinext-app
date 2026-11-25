import { useState } from 'react';
import { Lock, Mail, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ open, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');

    try {
      const sb = getSupabase();
      if (!sb) throw new Error('Client Supabase non disponibile.');

      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess?.();
        onClose();
      } else {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          onSuccess?.();
          onClose();
        } else {
          setInfoMsg('Registrazione completata. Controlla la tua email per confermare l’account.');
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Errore di autenticazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-sky-400" />
            <h2 className="text-sm font-semibold">
              {mode === 'login' ? 'Accesso Professionista — My Archinext' : 'Crea Account Professionista'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="inline-flex w-full rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); setInfoMsg(''); }}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Accedi
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(''); setInfoMsg(''); }}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === 'signup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Registrati
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">Email professionale</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@studioarchitettura.it"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 6 caratteri"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Continua in locale
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white transition-colors"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              <span>{mode === 'login' ? 'Accedi al Cloud' : 'Crea Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}