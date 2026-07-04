import { APP_VERSION } from '../lib/version';
import { cn } from '../lib/ui';

interface AppVersionBadgeProps {
  className?: string;
}

export const AppVersionBadge = ({ className }: AppVersionBadgeProps) => (
  <div
    className={cn(
      'pointer-events-none select-none text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400/85 dark:text-zinc-600',
      className
    )}
  >
    v{APP_VERSION}
  </div>
);
