export const formatClock = (totalSeconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const formatHoursMinutes = (totalSeconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const formatHoursMinutesLabel = (totalSeconds: number, locale: 'ru' | 'en'): string => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (locale === 'ru') {
    return hours > 0 ? `${hours} ч ${String(minutes).padStart(2, '0')} мин` : `${minutes} мин`;
  }

  return hours > 0 ? `${hours} h ${String(minutes).padStart(2, '0')} min` : `${minutes} min`;
};

export const formatDateLabel = (dateKey: string): string => {
  const [year, month, day] = dateKey.split('-');
  if (!year || !month || !day) return dateKey;
  return `${day}.${month}.${year}`;
};

export const formatDateRange = (startDateKey: string, endDateKey: string): string => {
  if (startDateKey === endDateKey) {
    return formatDateLabel(startDateKey);
  }

  return `${formatDateLabel(startDateKey)} — ${formatDateLabel(endDateKey)}`;
};
