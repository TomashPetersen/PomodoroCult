import { CSSProperties, ReactNode } from 'react';
import { cn } from '../lib/ui';

interface TooltipBubbleProps {
  children: ReactNode;
  className?: string;
  multiline?: boolean;
  maxWidth?: string;
}

export const TooltipBubble = ({
  children,
  className,
  multiline = false,
  maxWidth
}: TooltipBubbleProps) => {
  const style: CSSProperties | undefined = maxWidth ? { maxWidth } : undefined;

  return (
    <span
      role="tooltip"
      style={style}
      className={cn(
        'pointer-events-none absolute z-40 hidden rounded-md border border-zinc-200 bg-[#fcfcfb] px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 shadow-soft dark:border-[#30363d] dark:bg-[#24292f] dark:text-[#f0f3f6]',
        multiline ? 'whitespace-normal break-words text-center leading-4' : 'whitespace-nowrap leading-[1.15]',
        className
      )}
    >
      {children}
    </span>
  );
};
