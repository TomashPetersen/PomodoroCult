import { useEffect, useRef } from 'react';
import { FOCUS_MUSIC_TRACKS } from '../lib/constants';
import { useAppStore } from '../store/useAppStore';

const getAudioUrl = (src: string): string => {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(src);
  }

  return `/${src}`;
};

export const FocusMusicController = () => {
  const settings = useAppStore((state) => state.settings);
  const timerState = useAppStore((state) => state.timerState);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldPlay =
    settings.focusMusicEnabled && timerState.isRunning && timerState.currentMode === 'work';
  const track = FOCUS_MUSIC_TRACKS.find((item) => item.id === settings.focusMusicTrack) ?? FOCUS_MUSIC_TRACKS[0];

  useEffect(() => {
    const audio = new Audio(getAudioUrl(track.src));
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = settings.focusMusicVolume;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [track.src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = settings.focusMusicVolume;
  }, [settings.focusMusicVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!shouldPlay) {
      audio.pause();
      return;
    }

    void audio.play().catch(() => {
      audio.pause();
    });
  }, [shouldPlay, track.src]);

  return null;
};
