import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Calendar, HeartHandshake, Maximize2, Minimize2 } from 'lucide-react';
import { AppWindowTodayWidget } from './components/AppWindowTodayWidget';
import { FocusMusicPanel } from './components/FocusMusicPanel';
import { FocusModePanel } from './components/FocusModePanel';
import { FocusSummaryCards } from './components/FocusSummaryCards';
import { DONATION_URL, QUICK_STATS_PERIODS } from './lib/constants';
import { getStatsPeriodLabel, t } from './lib/i18n';
import { FooterNav } from './components/FooterNav';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { SettingsModal } from './components/SettingsModal';
import { StatsJournalChart } from './components/StatsJournalChart';
import { StatsRangeModal } from './components/StatsRangeModal';
import { StatsScreen } from './components/StatsScreen';
import { TasksScreen } from './components/TasksScreen';
import { TimerScreen } from './components/TimerScreen';
import { TooltipBubble } from './components/TooltipBubble';
import { ActionIconButton } from './components/ActionIconButton';
import { AppVersionBadge } from './components/AppVersionBadge';
import { formatDateRange } from './lib/format';
import { cn } from './lib/ui';
import { AppScreen, RuntimeMessage } from './lib/types';
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
  const statsView = useAppStore((state) => state.statsView);
  const setStatsView = useAppStore((state) => state.setStatsView);
  const statsPeriod = useAppStore((state) => state.statsPeriod);
  const statsRangeStart = useAppStore((state) => state.statsRangeStart);
  const statsRangeEnd = useAppStore((state) => state.statsRangeEnd);
  const setStatsPeriod = useAppStore((state) => state.setStatsPeriod);
  const openStatsRangeModal = useAppStore((state) => state.openStatsRangeModal);
  const [maximized, setMaximized] = useState(false);
  const workspaceScreen = selectedScreen === 'stats' ? 'stats' : 'tasks';
  const hasDonationUrl = DONATION_URL.length > 0;
  const showChartPage = workspaceScreen === 'stats' && statsView === 'chart';
  const backLabel = locale === 'ru' ? 'Назад' : 'Back';

  const registerAppWindow = useCallback(() => {
    if (!chrome.windows?.getCurrent) {
      return;
    }

    chrome.windows.getCurrent((currentWindow) => {
      if (typeof currentWindow?.id !== 'number') {
        return;
      }

      void chrome.runtime.sendMessage({
        type: 'APP_WINDOW_READY',
        payload: { windowId: currentWindow.id }
      });
    });
  }, []);

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

  useEffect(() => {
    const applyNavigation = (payload?: { screen?: AppScreen; statsView?: 'list' | 'chart' }) => {
      if (!payload) return;
      if (payload.screen) {
        setScreen(payload.screen);
      }
      if (payload.statsView) {
        setStatsView(payload.statsView);
      }
    };

    const params = new URLSearchParams(window.location.search);
    applyNavigation({
      screen: params.get('screen') === 'stats' ? 'stats' : params.get('screen') === 'tasks' ? 'tasks' : undefined,
      statsView: params.get('statsView') === 'chart' ? 'chart' : params.get('statsView') === 'list' ? 'list' : undefined
    });

    const handleMessage = (message: RuntimeMessage) => {
      if (message?.type !== 'APP_WINDOW_NAVIGATE') {
        return;
      }

      applyNavigation(message.payload);
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [setScreen, setStatsView]);

  useEffect(() => {
    registerAppWindow();

    const intervalId = window.setInterval(registerAppWindow, 5000);
    window.addEventListener('focus', registerAppWindow);
    document.addEventListener('visibilitychange', registerAppWindow);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', registerAppWindow);
      document.removeEventListener('visibilitychange', registerAppWindow);
    };
  }, [registerAppWindow]);

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[#f6f8fa] text-[#111827] dark:bg-[#0d1117] dark:text-[#f0f3f6]">
      {!hydrated ? (
        <div className="grid h-full w-full place-items-center text-sm text-zinc-500 dark:text-zinc-400">
          {t(locale, 'loading')}
        </div>
      ) : (
        showChartPage ? (
          <main className="flex h-full w-full flex-col gap-4 overflow-hidden p-4">
            <header className="flex min-h-12 flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <ActionIconButton
                  type="button"
                  onClick={() => setStatsView('list')}
                  label={backLabel}
                  tooltipSide="bottom"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-[#fcfcfb] text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-[#f5f7fa] hover:text-zinc-950 dark:border-[#30363d] dark:bg-[#161b22] dark:text-zinc-300 dark:hover:border-[#484f58] dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </ActionIconButton>
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-semibold tracking-normal text-zinc-950 dark:text-white">
                    {t(locale, 'statsChartView')}
                  </h1>
                  <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                    {formatDateRange(statsRangeStart, statsRangeEnd)}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={openStatsRangeModal}
                  className="flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-[#fcfcfb] px-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-[#f5f7fa] dark:border-[#30363d] dark:bg-[#161b22] dark:text-zinc-200 dark:hover:border-[#484f58] dark:hover:bg-[#21262d]"
                >
                  <Calendar className="h-4 w-4" />
                  {t(locale, 'range')}
                </button>
                <div className="grid grid-cols-3 rounded-2xl bg-[#eef2f6] p-1 dark:bg-[#161b22]">
                  {QUICK_STATS_PERIODS.map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setStatsPeriod(period)}
                      className={cn(
                        'h-9 rounded-xl px-4 text-sm font-semibold transition',
                        statsPeriod === period
                          ? 'bg-[#24292f] text-[#f6f8fa] shadow-sm dark:bg-[#f0f3f6] dark:text-[#161b22]'
                          : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
                      )}
                    >
                      {getStatsPeriodLabel(locale, period)}
                    </button>
                  ))}
                </div>
                <nav className="grid grid-cols-2 rounded-2xl bg-[#eef2f6] p-1 dark:bg-[#161b22]">
                  {workspaceScreens.map((item) => {
                    const active = workspaceScreen === item.screen;

                    return (
                      <button
                        key={item.screen}
                        type="button"
                        onClick={() => {
                          setScreen(item.screen);
                          if (item.screen === 'stats') {
                            setStatsView('list');
                          }
                        }}
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
                <ActionIconButton
                  type="button"
                  onClick={() => void toggleMaximized()}
                  label={maximized ? t(locale, 'exitFullscreen') : t(locale, 'fullscreen')}
                  tooltipAlign="right"
                  tooltipSide="bottom"
                  className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 bg-[#fcfcfb] text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-[#f5f7fa] hover:text-zinc-950 dark:border-[#30363d] dark:bg-[#161b22] dark:text-zinc-300 dark:hover:border-[#484f58] dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]"
                >
                  {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </ActionIconButton>
              </div>
            </header>

            <FocusSummaryCards />
            <StatsJournalChart className="min-h-0 flex-1" />
          </main>
        ) : (
        <main
          className="grid h-full w-full grid-cols-[minmax(380px,0.82fr)_minmax(410px,1.18fr)] gap-4 overflow-hidden p-4"
        >
          <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
            <div className="min-h-0 flex-[0_1_33rem] overflow-hidden rounded-2xl border border-zinc-200 bg-[#fcfcfb] p-4 shadow-sm dark:border-zinc-800 dark:bg-[#0b1016]">
              <TimerScreen surface="appWindow" />
            </div>
            <div className="shrink-0">
              <AppWindowTodayWidget />
            </div>
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
                  <TooltipBubble className="right-0 top-[calc(100%+0.4rem)] group-hover/support:block group-focus-visible/support:block">
                    {hasDonationUrl ? t(locale, 'supportProject') : t(locale, 'supportComingSoon')}
                  </TooltipBubble>
                </button>
                <ActionIconButton
                  type="button"
                  onClick={() => void toggleMaximized()}
                  label={maximized ? t(locale, 'exitFullscreen') : t(locale, 'fullscreen')}
                  tooltipAlign="right"
                  className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 bg-[#fcfcfb] text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-[#f5f7fa] hover:text-zinc-950 dark:border-[#30363d] dark:bg-[#161b22] dark:text-zinc-300 dark:hover:border-[#484f58] dark:hover:bg-[#21262d] dark:hover:text-[#f0f3f6]"
                >
                  {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </ActionIconButton>
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

            <FocusModePanel />
            <FocusMusicPanel />

            <div
              className={cn(
                'min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-200 bg-[#fcfcfb] shadow-sm dark:border-zinc-800 dark:bg-[#0b1016]',
                workspaceScreen === 'stats' ? 'p-3' : 'p-4'
              )}
            >
              {workspaceScreen === 'tasks' ? (
                <TasksScreen />
              ) : (
                <StatsScreen surface="appWindow" />
              )}
            </div>
          </section>
        </main>
        )
      )}
      <SettingsModal />
      {showChartPage && <StatsRangeModal />}
      <ResetConfirmModal />
      <AppVersionBadge className="pointer-events-none absolute bottom-3 left-4 z-10" />
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
