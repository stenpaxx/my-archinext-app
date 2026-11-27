import { useState } from 'react';
import { X, Lock, Mail, LogIn } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccessLocal: (label: string) => void;
}

export function LoginModal({ open, onClose, onSuccessLocal }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  if (!open) return null;

  const sb = getSupabase();

  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrore(null);

    if (!sb) {
      onSuccessLocal(email.trim() || 'Architetto Locale');
      onClose();
      return;
    }

    setLoading(true);
    try {
      const { error } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrore(error.message);
        return;
      }

      onClose();
    } catch {
      setErrore('Errore durante il collegamento con Supabase Auth.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccessoRapidoLocale = () => {
    onSuccessLocal(email.trim() || 'Direttore Tecnico (Locale)');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-zinc-300 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-zinc-900" />
            <h2 className="text-sm font-bold text-zinc-950">Accedi a My Archinext</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSupabaseLogin(e)} className="space-y-3">
          <label className="block space-y-1 text-xs">
            <span className="font-semibold text-zinc-700">Email</span>
            <div className="relative">
              <Mail
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="email"
                required={Boolean(sb)}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@studio.it"
                className="w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 py-2 text-xs text-zinc-950 focus:outline-none focus:border-zinc-950"
              />
            </div>
          </label>

          <label className="block space-y-1 text-xs">
            <span className="font-semibold text-zinc-700">Password</span>
            <input
              type="password"
              required={Boolean(sb)}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-950 focus:outline-none focus:border-zinc-950"
            />
          </label>

          {errore && (
            <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errore}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-2 text-xs font-mono font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <LogIn size={14} />
            <span>{loading ? 'Accesso in corso...' : 'Accedi'}</span>
          </button>
        </form>

        <div className="border-t border-zinc-200 pt-3 flex items-center justify-between gap-2">
          <span className="text-[11px] text-zinc-500">
            {sb ? 'Sessione Supabase Auth' : 'Modalità locale'}
          </span>
          <button
            type="button"
            onClick={handleAccessoRapidoLocale}
            className="text-[11px] font-mono font-semibold text-zinc-800 underline hover:text-zinc-950"
          >
            Entra in locale
          </button>
        </div>
      </div>
    </div>
  );
}