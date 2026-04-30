import { useEffect } from 'react';
import { SettingsModal } from './components/SettingsModal';
import { FooterNav } from './components/FooterNav';
import { StatsScreen } from './components/StatsScreen';
import { TasksScreen } from './components/TasksScreen';
import { TimerScreen } from './components/TimerScreen';
import { useAppStore } from './store/useAppStore';

export const App = () => {
  const hydrated = useAppStore((state) => state.hydrated);
  const selectedScreen = useAppStore((state) => state.selectedScreen);
  const initialize = useAppStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <div className="relative h-[600px] w-[400px] overflow-hidden bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <main className="h-[536px] overflow-hidden px-5 pb-2 pt-4">
        {!hydrated ? (
          <div className="grid h-full place-items-center text-sm text-zinc-500 dark:text-zinc-400">
            Pomodoro Cult
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
    </div>
  );
};
