import { useEffect, useState, useRef } from 'react';

export function CopyButton({ text, label = 'Copia' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
        copied
          ? 'bg-emerald-700 text-white'
          : 'bg-slate-800 text-white hover:bg-slate-700'
      }`}
    >
      {copied ? 'Copiato!' : label}
    </button>
  );
}
