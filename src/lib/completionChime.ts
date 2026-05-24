const COMPLETION_CHIME_ELEMENT_ID = 'completion-chime';
const FIREFOX_COMPLETION_CHIME_PATH = 'sounds/completion-chime.mp3';
export const COMPLETION_CHIME_DURATION_MS = 11800;

const COMPLETION_CHIME_SEQUENCE = [
  { start: 0.0, duration: 0.42, frequency: 523, volume: 0.18 },
  { start: 0.5, duration: 0.42, frequency: 659, volume: 0.2 },
  { start: 1.0, duration: 0.42, frequency: 784, volume: 0.22 },
  { start: 1.5, duration: 0.42, frequency: 1047, volume: 0.24 },
  { start: 2.12, duration: 0.48, frequency: 988, volume: 0.22 },
  { start: 2.72, duration: 0.48, frequency: 1175, volume: 0.24 },
  { start: 3.34, duration: 0.54, frequency: 1319, volume: 0.26 },
  { start: 4.04, duration: 0.56, frequency: 1568, volume: 0.28 },
  { start: 4.84, duration: 0.44, frequency: 1175, volume: 0.22 },
  { start: 5.36, duration: 0.44, frequency: 1319, volume: 0.24 },
  { start: 5.9, duration: 0.6, frequency: 1760, volume: 0.3 },
  { start: 6.68, duration: 0.58, frequency: 1568, volume: 0.28 },
  { start: 7.42, duration: 0.58, frequency: 1319, volume: 0.26 },
  { start: 8.18, duration: 0.72, frequency: 1047, volume: 0.24 },
  { start: 9.1, duration: 0.76, frequency: 1319, volume: 0.28 },
  { start: 10.02, duration: 1.32, frequency: 1568, volume: 0.3 }
] as const;

let fallbackChimeUrl: string | null = null;
let sharedAudioContext: AudioContext | null = null;
let primedAudioElement: HTMLAudioElement | null = null;
let lastCompletionChimeError: string | null = null;

const getAudioContextCtor = () =>
  globalThis.AudioContext ??
  (
    globalThis as typeof globalThis & {
      webkitAudioContext?: typeof AudioContext;
    }
  ).webkitAudioContext;

const getSharedAudioContext = async (): Promise<AudioContext> => {
  const AudioContextCtor = getAudioContextCtor();

  if (!AudioContextCtor) {
    throw new Error('AudioContext is not available');
  }

  sharedAudioContext ??= new AudioContextCtor();

  if (sharedAudioContext.state === 'suspended') {
    await sharedAudioContext.resume();
  }

  return sharedAudioContext;
};

export const primeCompletionAudio = async (): Promise<void> => {
  const results = await Promise.allSettled([primeAudioContext(), primeMediaElement()]);

  if (results.every((result) => result.status === 'rejected')) {
    throw new Error('Unable to prime completion audio');
  }
};

export const getLastCompletionChimeError = (): string | null => lastCompletionChimeError;

const getExtensionAssetUrl = (path: string): string => {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(path);
  }

  return `/${path}`;
};

const primeAudioContext = async (): Promise<void> => {
  const context = await getSharedAudioContext();
  const gainNode = context.createGain();
  const oscillator = context.createOscillator();
  const startAt = context.currentTime;

  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.linearRampToValueAtTime(0.0002, startAt + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.03);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(440, startAt);
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.035);

  await new Promise((resolve) => window.setTimeout(resolve, 45));
};

const playAudioContextChime = async (): Promise<void> => {
  const context = await getSharedAudioContext();
  const masterGain = context.createGain();
  masterGain.gain.setValueAtTime(0.0001, context.currentTime);
  masterGain.connect(context.destination);

  for (const tone of COMPLETION_CHIME_SEQUENCE) {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const toneStart = context.currentTime + tone.start;
    const toneEnd = toneStart + tone.duration;

    oscillator.type = tone.frequency >= 1200 ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(tone.frequency, toneStart);
    oscillator.frequency.linearRampToValueAtTime(
      tone.frequency * 1.018,
      toneStart + Math.min(tone.duration * 0.42, 0.22)
    );

    gainNode.gain.setValueAtTime(0.0001, toneStart);
    gainNode.gain.linearRampToValueAtTime(tone.volume, toneStart + 0.028);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, toneEnd);

    oscillator.connect(gainNode);
    gainNode.connect(masterGain);
    oscillator.start(toneStart);
    oscillator.stop(toneEnd + 0.02);
  }

  masterGain.gain.linearRampToValueAtTime(0.6, context.currentTime + 0.08);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 11.54);

  await new Promise((resolve) => window.setTimeout(resolve, COMPLETION_CHIME_DURATION_MS));
};

const createFallbackChimeUrl = (): string => {
  const sampleRate = 44100;
  const durationSeconds = COMPLETION_CHIME_DURATION_MS / 1000;
  const frameCount = Math.floor(sampleRate * durationSeconds);
  const headerBytes = 44;
  const dataBytes = frameCount * 2;
  const buffer = new ArrayBuffer(headerBytes + dataBytes);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string): void => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataBytes, true);

  for (let frame = 0; frame < frameCount; frame += 1) {
    const t = frame / sampleRate;
    let sampleSum = 0;

    for (const tone of COMPLETION_CHIME_SEQUENCE) {
      const toneOffset = t - tone.start;
      if (toneOffset < 0 || toneOffset >= tone.duration) {
        continue;
      }

      const toneProgress = toneOffset / tone.duration;
      const vibrato = 1 + 0.01 * Math.sin(2 * Math.PI * 5.2 * toneOffset);
      const base = Math.sin(2 * Math.PI * tone.frequency * vibrato * toneOffset);
      const harmonic2 = Math.sin(2 * Math.PI * tone.frequency * 2 * toneOffset) * 0.18;
      const harmonic3 = Math.sin(2 * Math.PI * tone.frequency * 3 * toneOffset) * 0.08;
      const localEnvelope = Math.sin(Math.PI * Math.min(1, toneProgress)) ** 1.08;
      sampleSum += (base + harmonic2 + harmonic3) * tone.volume * localEnvelope;
    }

    const envelope = Math.min(1, t / 0.06) * Math.min(1, (durationSeconds - t) / 0.28);
    const sample = Math.max(-1, Math.min(1, sampleSum * 0.18 * envelope));
    view.setInt16(headerBytes + frame * 2, sample * 0x7fff, true);
  }

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
};

const getCompletionChimeUrl = (): string => {
  return getExtensionAssetUrl(FIREFOX_COMPLETION_CHIME_PATH);
};

const getDocumentAudioElement = (): HTMLAudioElement | null => {
  if (typeof document === 'undefined') return null;

  const element = document.getElementById(COMPLETION_CHIME_ELEMENT_ID);
  return element instanceof HTMLAudioElement ? element : null;
};

const getPrimedAudioElement = (): HTMLAudioElement => {
  primedAudioElement ??= getDocumentAudioElement() ?? new Audio(getCompletionChimeUrl());
  primedAudioElement.preload = 'auto';
  primedAudioElement.loop = false;
  return primedAudioElement;
};

const ensureAudioLoaded = async (audio: HTMLAudioElement): Promise<void> => {
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const onReady = (): void => {
      cleanup();
      resolve();
    };

    const onError = (): void => {
      cleanup();
      reject(new Error('Unable to load completion audio'));
    };

    const cleanup = (): void => {
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('loadeddata', onReady);
      audio.removeEventListener('error', onError);
    };

    audio.addEventListener('canplaythrough', onReady, { once: true });
    audio.addEventListener('loadeddata', onReady, { once: true });
    audio.addEventListener('error', onError, { once: true });
    audio.load();
  });
};

const primeMediaElement = async (): Promise<void> => {
  const audio = getPrimedAudioElement();
  await ensureAudioLoaded(audio);
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 0.01;
  await audio.play();
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 1;
};

const playAudio = async (src: string, volume: number): Promise<void> => {
  const audio = new Audio(src);
  audio.volume = volume;
  await audio.play();
  await new Promise<void>((resolve) => {
    const cleanup = (): void => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onEnded);
    };

    const onEnded = (): void => {
      cleanup();
      resolve();
    };

    audio.addEventListener('ended', onEnded, { once: true });
    audio.addEventListener('error', onEnded, { once: true });

    window.setTimeout(() => {
      cleanup();
      resolve();
    }, COMPLETION_CHIME_DURATION_MS + 250);
  });
};

const playPrimedMediaElement = async (): Promise<void> => {
  const audio = getPrimedAudioElement();
  await ensureAudioLoaded(audio);
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 0.96;
  await audio.play();
  await new Promise<void>((resolve) => {
    const cleanup = (): void => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onEnded);
    };

    const onEnded = (): void => {
      cleanup();
      resolve();
    };

    audio.addEventListener('ended', onEnded, { once: true });
    audio.addEventListener('error', onEnded, { once: true });

    window.setTimeout(() => {
      cleanup();
      resolve();
    }, COMPLETION_CHIME_DURATION_MS + 250);
  });
};

export const playCompletionChime = async (): Promise<void> => {
  const failures: string[] = [];

  try {
    await playPrimedMediaElement();
    lastCompletionChimeError = null;
    return;
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }

  try {
    await playAudio(getCompletionChimeUrl(), 0.92);
    lastCompletionChimeError = null;
    return;
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }

  try {
    fallbackChimeUrl ??= createFallbackChimeUrl();
    await playAudio(fallbackChimeUrl, 0.8);
    lastCompletionChimeError = null;
    return;
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }

  try {
    await playAudioContextChime();
    lastCompletionChimeError = null;
    return;
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }

  lastCompletionChimeError = failures.filter(Boolean).join(' | ') || 'Unknown completion audio error';
  throw new Error(lastCompletionChimeError);
};
