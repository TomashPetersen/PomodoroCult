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
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#f6f8fa] text-[#111827] dark:bg-[#0d1117] dark:text-[#f0f3f6]">
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
