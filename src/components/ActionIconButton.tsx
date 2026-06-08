import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/ui';

interface ActionIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  tooltipAlign?: 'left' | 'right' | 'center';
  tooltipSide?: 'top' | 'bottom';
}

export const ActionIconButton = ({
  label,
  children,
  className,
  tooltipAlign = 'right',
  tooltipSide = 'top',
  ...props
}: ActionIconButtonProps) => (
  <button
    {...props}
    aria-label={label}
    className={cn('group/action relative', className)}
  >
    {children}
    <span
      className={cn(
        'pointer-events-none absolute z-40 hidden whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-medium leading-none shadow-soft',
        'border-zinc-200 bg-[#fcfcfb] text-zinc-700 dark:border-[#30363d] dark:bg-[#24292f] dark:text-[#f0f3f6]',
        'group-hover/action:block group-focus-visible/action:block',
        tooltipSide === 'top' && 'bottom-[calc(100%+0.35rem)]',
        tooltipSide === 'bottom' && 'top-[calc(100%+0.35rem)]',
        tooltipAlign === 'left' && 'left-0',
        tooltipAlign === 'right' && 'right-0',
        tooltipAlign === 'center' && 'left-1/2 -translate-x-1/2'
      )}
    >
      {label}
    </span>
  </button>
);
