const COMPLETION_CHIME_PATH = 'sounds/completion-chime.mp3';
const COMPLETION_CHIME_ELEMENT_ID = 'completion-chime';

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

  const sequence = [
    { start: 0.0, duration: 0.5, frequency: 659, volume: 0.3 },
    { start: 0.62, duration: 0.5, frequency: 784, volume: 0.34 },
    { start: 1.32, duration: 0.64, frequency: 988, volume: 0.38 },
    { start: 2.18, duration: 0.92, frequency: 1175, volume: 0.42 }
  ];

  for (const tone of sequence) {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const toneStart = context.currentTime + tone.start;
    const toneEnd = toneStart + tone.duration;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(tone.frequency, toneStart);

    gainNode.gain.setValueAtTime(0.0001, toneStart);
    gainNode.gain.linearRampToValueAtTime(tone.volume, toneStart + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, toneEnd);

    oscillator.connect(gainNode);
    gainNode.connect(masterGain);
    oscillator.start(toneStart);
    oscillator.stop(toneEnd + 0.02);
  }

  masterGain.gain.linearRampToValueAtTime(0.62, context.currentTime + 0.05);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 3.18);

  await new Promise((resolve) => window.setTimeout(resolve, 3250));
};

const createFallbackChimeUrl = (): string => {
  const sampleRate = 44100;
  const durationSeconds = 3.25;
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
    const pulseA = t < 0.5 ? Math.sin(2 * Math.PI * 659 * t) * 0.58 : 0;
    const pulseB =
      t >= 0.62 && t < 1.12 ? Math.sin(2 * Math.PI * 784 * (t - 0.62)) * 0.66 : 0;
    const pulseC =
      t >= 1.32 && t < 1.96 ? Math.sin(2 * Math.PI * 988 * (t - 1.32)) * 0.74 : 0;
    const pulseD =
      t >= 2.18 && t < 3.1 ? Math.sin(2 * Math.PI * 1175 * (t - 2.18)) * 0.82 : 0;
    const envelope = Math.min(1, t / 0.06) * Math.min(1, (durationSeconds - t) / 0.28);
    const sample = Math.max(
      -1,
      Math.min(1, (pulseA + pulseB + pulseC + pulseD) * 0.24 * envelope)
    );
    view.setInt16(headerBytes + frame * 2, sample * 0x7fff, true);
  }

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
};

const getCompletionChimeUrl = (): string =>
  chrome.runtime?.getURL?.(COMPLETION_CHIME_PATH) ?? COMPLETION_CHIME_PATH;

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
};

const playPrimedMediaElement = async (): Promise<void> => {
  const audio = getPrimedAudioElement();
  await ensureAudioLoaded(audio);
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 0.96;
  await audio.play();
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
