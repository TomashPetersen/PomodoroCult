import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/ui';
import { TooltipBubble } from './TooltipBubble';

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
    <TooltipBubble
      className={cn(
        'group-hover/action:block group-focus-visible/action:block',
        tooltipSide === 'top' && 'bottom-[calc(100%+0.35rem)]',
        tooltipSide === 'bottom' && 'top-[calc(100%+0.35rem)]',
        tooltipAlign === 'left' && 'left-0',
        tooltipAlign === 'right' && 'right-0',
        tooltipAlign === 'center' && 'left-1/2 -translate-x-1/2'
      )}
    >
      {label}
    </TooltipBubble>
  </button>
);
