import { BarChart3, ListTodo, Timer } from 'lucide-react';
import { t } from '../lib/i18n';
import { cn } from '../lib/ui';
import { AppScreen } from '../lib/types';
import { useAppStore } from '../store/useAppStore';

const items: Array<{ screen: AppScreen; icon: typeof Timer; labelKey: 'screenTimer' | 'screenTasks' | 'screenStats' }> = [
  { screen: 'timer', icon: Timer, labelKey: 'screenTimer' },
  { screen: 'tasks', icon: ListTodo, labelKey: 'screenTasks' },
  { screen: 'stats', icon: BarChart3, labelKey: 'screenStats' }
];

export const FooterNav = () => {
  const locale = useAppStore((state) => state.locale);
  const selectedScreen = useAppStore((state) => state.selectedScreen);
  const setScreen = useAppStore((state) => state.setScreen);

  return (
    <footer className="grid h-16 shrink-0 grid-cols-3 border-t border-zinc-200 bg-[#f6f8fa]/96 px-6 py-2 dark:border-zinc-800 dark:bg-[#0d1117]/96">
      {items.map((item) => {
        const Icon = item.icon;
        const active = selectedScreen === item.screen;
        const label = t(locale, item.labelKey);

        return (
          <button
            key={item.screen}
            type="button"
            onClick={() => setScreen(item.screen)}
            className={cn(
              'mx-auto grid h-11 w-11 place-items-center rounded-xl transition',
              active
                ? 'bg-[#24292f] text-[#f6f8fa] dark:bg-[#f0f3f6] dark:text-[#161b22]'
                : 'text-zinc-500 hover:bg-[#eef2f6] hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]'
            )}
            aria-label={label}
            title={label}
          >
            <Icon className="h-5 w-5" />
          </button>
        );
      })}
    </footer>
  );
};
