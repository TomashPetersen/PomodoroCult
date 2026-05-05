const COMPLETION_CHIME_PATH = 'sounds/completion-chime.mp3';

let fallbackChimeUrl: string | null = null;

const createFallbackChimeUrl = (): string => {
  const sampleRate = 44100;
  const durationSeconds = 0.65;
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
    const envelope = Math.min(1, t / 0.04) * Math.min(1, (durationSeconds - t) / 0.16);
    const firstTone = Math.sin(2 * Math.PI * 660 * t);
    const secondTone = Math.sin(2 * Math.PI * 880 * t) * (t > 0.22 ? 0.72 : 0);
    const sample = Math.max(-1, Math.min(1, (firstTone + secondTone) * 0.26 * envelope));
    view.setInt16(headerBytes + frame * 2, sample * 0x7fff, true);
  }

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
};

const getCompletionChimeUrl = (): string =>
  chrome.runtime?.getURL?.(COMPLETION_CHIME_PATH) ?? COMPLETION_CHIME_PATH;

const playAudio = async (src: string, volume: number): Promise<void> => {
  const audio = new Audio(src);
  audio.volume = volume;
  await audio.play();
};

export const playCompletionChime = async (): Promise<void> => {
  try {
    await playAudio(getCompletionChimeUrl(), 0.92);
  } catch {
    fallbackChimeUrl ??= createFallbackChimeUrl();

    try {
      await playAudio(fallbackChimeUrl, 0.8);
    } catch {
      // Some extension states can still reject playback; timer completion should remain reliable.
    }
  }
};
