import { BarChart3, ListTodo, Timer } from 'lucide-react';
import { cn } from '../lib/ui';
import { AppScreen } from '../lib/types';
import { useAppStore } from '../store/useAppStore';

const items: Array<{ screen: AppScreen; icon: typeof Timer; label: string }> = [
  { screen: 'timer', icon: Timer, label: 'Таймер' },
  { screen: 'tasks', icon: ListTodo, label: 'Задачи' },
  { screen: 'stats', icon: BarChart3, label: 'Статистика' }
];

export const FooterNav = () => {
  const selectedScreen = useAppStore((state) => state.selectedScreen);
  const setScreen = useAppStore((state) => state.setScreen);

  return (
    <footer className="grid h-16 shrink-0 grid-cols-3 border-t border-zinc-200 bg-white/96 px-8 py-2 dark:border-zinc-800 dark:bg-zinc-950/96">
      {items.map((item) => {
        const Icon = item.icon;
        const active = selectedScreen === item.screen;

        return (
          <button
            key={item.screen}
            type="button"
            onClick={() => setScreen(item.screen)}
            className={cn(
              'mx-auto grid h-11 w-11 place-items-center rounded-lg transition',
              active
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white'
            )}
            aria-label={item.label}
            title={item.label}
          >
            <Icon className="h-5 w-5" />
          </button>
        );
      })}
    </footer>
  );
};
