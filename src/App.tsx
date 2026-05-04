import { useEffect } from 'react';
import { t } from './lib/i18n';
import { FooterNav } from './components/FooterNav';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { SettingsModal } from './components/SettingsModal';
import { StatsScreen } from './components/StatsScreen';
import { TasksScreen } from './components/TasksScreen';
import { TimerScreen } from './components/TimerScreen';
import { useAppStore } from './store/useAppStore';

export const App = () => {
  const hydrated = useAppStore((state) => state.hydrated);
  const locale = useAppStore((state) => state.locale);
  const selectedScreen = useAppStore((state) => state.selectedScreen);
  const initialize = useAppStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <main className="min-h-0 flex-1 overflow-hidden px-4 pb-3 pt-4 sm:px-5">
        {!hydrated ? (
          <div className="grid h-full place-items-center text-sm text-zinc-500 dark:text-zinc-400">
            {t(locale, 'loading')}
          </div>
        ) : (
          <>
            {selectedScreen === 'timer' && <TimerScreen />}
            {selectedScreen === 'tasks' && <TasksScreen />}
            {selectedScreen === 'stats' && <StatsScreen />}
          </>
        )}
      </main>
      <FooterNav />
      <SettingsModal />
      <ResetConfirmModal />
    </div>
  );
};
