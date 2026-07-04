import { useEffect, useRef } from 'react';
import { FOCUS_MUSIC_TRACKS } from '../lib/constants';
import { useAppStore } from '../store/useAppStore';

const STREAM_CROSSFADE_SECONDS = 1.4;
const STREAM_FADE_STEP_MS = 80;

const getAudioUrl = (src: string): string => {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(src);
  }

  return `/${src}`;
};

const clampVolume = (volume: number): number => Math.min(1, Math.max(0, volume));

export const FocusMusicController = () => {
  const settings = useAppStore((state) => state.settings);
  const timerState = useAppStore((state) => state.timerState);
  const audiosRef = useRef<HTMLAudioElement[]>([]);
  const activeAudioIndexRef = useRef(0);
  const streamScheduleRef = useRef<number | null>(null);
  const streamFadeRef = useRef<number | null>(null);
  const volumeRef = useRef(settings.focusMusicVolume);
  const shouldPlay =
    settings.focusMusicEnabled && timerState.isRunning && timerState.currentMode === 'work';
  const track = FOCUS_MUSIC_TRACKS.find((item) => item.id === settings.focusMusicTrack) ?? FOCUS_MUSIC_TRACKS[0];
  const isStreamTrack = track.id === 'stream';

  const clearStreamTimers = () => {
    if (streamScheduleRef.current !== null) {
      window.clearTimeout(streamScheduleRef.current);
      streamScheduleRef.current = null;
    }

    if (streamFadeRef.current !== null) {
      window.clearInterval(streamFadeRef.current);
      streamFadeRef.current = null;
    }
  };

  const pauseAll = () => {
    clearStreamTimers();
    audiosRef.current.forEach((audio) => {
      audio.pause();
      audio.volume = clampVolume(volumeRef.current);
    });
  };

  useEffect(() => {
    clearStreamTimers();

    const audioUrl = getAudioUrl(track.src);
    const audioCount = isStreamTrack ? 2 : 1;
    const audios = Array.from({ length: audioCount }, () => {
      const audio = new Audio(audioUrl);
      audio.loop = !isStreamTrack;
      audio.preload = 'auto';
      audio.volume = clampVolume(volumeRef.current);
      return audio;
    });

    audiosRef.current = audios;
    activeAudioIndexRef.current = 0;

    return () => {
      clearStreamTimers();
      audios.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audiosRef.current = [];
    };
  }, [isStreamTrack, track.src]);

  useEffect(() => {
    volumeRef.current = settings.focusMusicVolume;
    const volume = clampVolume(settings.focusMusicVolume);

    audiosRef.current.forEach((audio, index) => {
      if (!isStreamTrack || index === activeAudioIndexRef.current || audio.paused) {
        audio.volume = volume;
      }
    });
  }, [settings.focusMusicVolume]);

  useEffect(() => {
    const scheduleStreamOverlap = () => {
      clearStreamTimers();

      const audios = audiosRef.current;
      const activeAudio = audios[activeAudioIndexRef.current];
      if (!activeAudio || activeAudio.paused) return;

      const duration = Number.isFinite(activeAudio.duration) ? activeAudio.duration : 0;
      if (duration <= 0) {
        streamScheduleRef.current = window.setTimeout(scheduleStreamOverlap, 350);
        return;
      }

      const delayMs = Math.max(
        250,
        (duration - activeAudio.currentTime - STREAM_CROSSFADE_SECONDS) * 1000
      );
      streamScheduleRef.current = window.setTimeout(() => {
        const nextIndex = activeAudioIndexRef.current === 0 ? 1 : 0;
        const current = audiosRef.current[activeAudioIndexRef.current];
        const next = audiosRef.current[nextIndex];

        if (!current || !next || current.paused) return;

        next.pause();
        next.currentTime = 0;
        next.volume = 0;

        void next.play().then(() => {
          const startedAt = performance.now();
          streamFadeRef.current = window.setInterval(() => {
            const progress = Math.min(
              1,
              (performance.now() - startedAt) / (STREAM_CROSSFADE_SECONDS * 1000)
            );
            const volume = clampVolume(volumeRef.current);

            current.volume = volume * (1 - progress);
            next.volume = volume * progress;

            if (progress >= 1) {
              if (streamFadeRef.current !== null) {
                window.clearInterval(streamFadeRef.current);
                streamFadeRef.current = null;
              }

              current.pause();
              current.currentTime = 0;
              current.volume = volume;
              activeAudioIndexRef.current = nextIndex;
              scheduleStreamOverlap();
            }
          }, STREAM_FADE_STEP_MS);
        }).catch(() => {
          next.pause();
          scheduleStreamOverlap();
        });
      }, delayMs);
    };

    const audio = audiosRef.current[activeAudioIndexRef.current];
    if (!audio) return;

    if (!shouldPlay) {
      pauseAll();
      return;
    }

    void audio.play().then(() => {
      if (isStreamTrack) {
        scheduleStreamOverlap();
      }
    }).catch(() => {
      pauseAll();
    });
  }, [isStreamTrack, shouldPlay, track.src]);

  return null;
};
