import { useState, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import { classNames } from '@/lib/helpers';

interface ReloadButtonProps {
  onClick: () => void | Promise<void>;
  className?: string;
}

export function ReloadButton({ onClick, className }: ReloadButtonProps) {
  const [spinning, setSpinning] = useState(false);

  const handleClick = useCallback(async () => {
    if (spinning) return;
    setSpinning(true);
    try {
      await onClick();
    } finally {
      setTimeout(() => setSpinning(false), 400);
    }
  }, [onClick, spinning]);

  return (
    <button
      onClick={handleClick}
      disabled={spinning}
      className={classNames(
        'inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-95 disabled:opacity-60',
        className,
      )}
    >
      <RotateCcw size={15} className={classNames('transition-transform', spinning && 'animate-spin')} />
      <span>Recarregar</span>
    </button>
  );
}
