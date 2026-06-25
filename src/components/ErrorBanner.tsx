import { X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorBanner({ message, onDismiss, className }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-900 text-xs font-serif leading-relaxed',
        className,
      )}
    >
      <div className="flex-1">{message}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1 hover:bg-rose-100 rounded-sm"
          aria-label="关闭错误提示"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
