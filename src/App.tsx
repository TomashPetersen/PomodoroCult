import { useEffect, useState } from 'react';
import { HeartHandshake, Maximize2, Minimize2 } from 'lucide-react';
import { AppWindowTodayWidget } from './components/AppWindowTodayWidget';
import { FocusMusicController } from './components/FocusMusicController';
import { FocusMusicPanel } from './components/FocusMusicPanel';
import { DONATION_URL } from './lib/constants';
import { t } from './lib/i18n';
import { FooterNav } from './components/FooterNav';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { SettingsModal } from './components/SettingsModal';
import { StatsScreen } from './components/StatsScreen';
import { TasksScreen } from './components/TasksScreen';
import { TimerScreen } from './components/TimerScreen';
import { cn } from './lib/ui';
import { AppScreen } from './lib/types';
import { useAppStore } from './store/useAppStore';

type AppSurface = 'popup' | 'appWindow';

interface AppProps {
  surface?: AppSurface;
}

const workspaceScreens: Array<{ screen: Extract<AppScreen, 'tasks' | 'stats'>; labelKey: 'screenTasks' | 'screenStats' }> = [
  { screen: 'tasks', labelKey: 'screenTasks' },
  { screen: 'stats', labelKey: 'screenStats' }
];

const PopupShell = ({ hydrated }: { hydrated: boolean }) => {
  const locale = useAppStore((state) => state.locale);
  const selectedScreen = useAppStore((state) => state.selectedScreen);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#f6f8fa] text-[#111827] dark:bg-[#0d1117] dark:text-[#f0f3f6]">
      <main className="min-h-0 flex-1 overflow-hidden px-4 pb-3 pt-4 sm:px-5">
        {!hydrated ? (
          <div className="grid h-full place-items-center text-sm text-zinc-500 dark:text-zinc-400">
            {t(locale, 'loading')}
          </div>
        ) : (
          <>
            {selectedScreen === 'timer' && <TimerScreen surface="popup" />}
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

const AppWindowShell = ({ hydrated }: { hydrated: boolean }) => {
  const locale = useAppStore((state) => state.locale);
  const selectedScreen = useAppStore((state) => state.selectedScreen);
  const setScreen = useAppStore((state) => state.setScreen);
  const [maximized, setMaximized] = useState(false);
  const workspaceScreen = selectedScreen === 'stats' ? 'stats' : 'tasks';
  const hasDonationUrl = DONATION_URL.length > 0;

  const toggleMaximized = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'TOGGLE_APP_WINDOW_MAXIMIZED' });
      if (typeof response?.maximized === 'boolean') {
        setMaximized(response.maximized);
      }
    } catch {
      setMaximized((current) => !current);
    }
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[#f6f8fa] text-[#111827] dark:bg-[#0d1117] dark:text-[#f0f3f6]">
      <FocusMusicController />
      {!hydrated ? (
        <div className="grid h-full w-full place-items-center text-sm text-zinc-500 dark:text-zinc-400">
          {t(locale, 'loading')}
        </div>
      ) : (
        <main className="grid h-full w-full grid-cols-[minmax(380px,0.82fr)_minmax(410px,1.18fr)] gap-4 overflow-hidden p-4">
          <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
            <div className="min-h-0 flex-[1_1_auto] overflow-hidden rounded-2xl border border-zinc-200 bg-[#fcfcfb] p-4 shadow-sm dark:border-zinc-800 dark:bg-[#0b1016]">
              <TimerScreen surface="appWindow" />
            </div>
            <AppWindowTodayWidget />
          </section>

          <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
            <header className="flex h-11 items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold tracking-normal text-zinc-950 dark:text-white">
                  {t(locale, 'appWindowTitle')}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (hasDonationUrl) {
                      window.open(DONATION_URL, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="group/support relative grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 bg-[#fcfcfb] text-zinc-500 shadow-sm transition hover:border-zinc-300 hover:bg-[#f5f7fa] hover:text-amber-500 dark:border-[#30363d] dark:bg-[#161b22] dark:text-zinc-400 dark:hover:border-[#484f58] dark:hover:bg-[#21262d] dark:hover:text-amber-300"
                  aria-label={hasDonationUrl ? t(locale, 'supportProject') : t(locale, 'supportComingSoon')}
                >
                  <HeartHandshake className="h-4 w-4" />
                  <span className="pointer-events-none absolute right-0 top-[calc(100%+0.4rem)] z-50 hidden whitespace-nowrap rounded-md border border-zinc-200 bg-[#fcfcfb] px-2 py-1 text-[11px] font-medium text-zinc-700 shadow-soft group-hover/support:block group-focus-visible/support:block dark:border-[#30363d] dark:bg-[#24292f] dark:text-[#f0f3f6]">
                    {hasDonationUrl ? t(locale, 'supportProject') : t(locale, 'supportComingSoon')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void toggleMaximized()}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 bg-[#fcfcfb] text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-[#f5f7fa] hover:text-zinc-950 dark:border-[#30363d] dark:bg-[#161b22] dark:text-zinc-300 dark:hover:border-[#484f58] dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]"
                  aria-label={maximized ? t(locale, 'exitFullscreen') : t(locale, 'fullscreen')}
                  title={maximized ? t(locale, 'exitFullscreen') : t(locale, 'fullscreen')}
                >
                  {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <nav className="grid grid-cols-2 rounded-2xl bg-[#eef2f6] p-1 dark:bg-[#161b22]">
                  {workspaceScreens.map((item) => {
                    const active = workspaceScreen === item.screen;

                    return (
                      <button
                        key={item.screen}
                        type="button"
                        onClick={() => setScreen(item.screen)}
                        className={cn(
                          'h-9 rounded-xl px-5 text-sm font-semibold transition',
                          active
                            ? 'bg-[#24292f] text-[#f6f8fa] shadow-sm dark:bg-[#f0f3f6] dark:text-[#161b22]'
                            : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
                        )}
                      >
                        {t(locale, item.labelKey)}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </header>

            <FocusMusicPanel />

            <div
              className={cn(
                'min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-200 bg-[#fcfcfb] shadow-sm dark:border-zinc-800 dark:bg-[#0b1016]',
                workspaceScreen === 'stats' ? 'p-3' : 'p-4'
              )}
            >
              {workspaceScreen === 'tasks' ? <TasksScreen /> : <StatsScreen surface="appWindow" />}
            </div>
          </section>
        </main>
      )}
      <SettingsModal />
      <ResetConfirmModal />
    </div>
  );
};

export const App = ({ surface = 'popup' }: AppProps) => {
  const hydrated = useAppStore((state) => state.hydrated);
  const initialize = useAppStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return surface === 'appWindow' ? <AppWindowShell hydrated={hydrated} /> : <PopupShell hydrated={hydrated} />;
};
