import { DEFAULT_FOCUS_REVIEW_GOALS, FocusReviewGoals } from './types';

export const FOCUS_REVIEW_GOAL_MIN = 1;
export const FOCUS_REVIEW_GOAL_MAX = 99;

const normalizeGoal = (value: unknown): number | null => {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && Number.isInteger(parsed) &&
    parsed >= FOCUS_REVIEW_GOAL_MIN && parsed <= FOCUS_REVIEW_GOAL_MAX
    ? parsed
    : null;
};

export const normalizeFocusReviewGoals = (value: unknown): FocusReviewGoals => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_FOCUS_REVIEW_GOALS };
  }

  const candidate = value as Partial<Record<keyof FocusReviewGoals, unknown>>;
  return {
    dailySessions: normalizeGoal(candidate.dailySessions),
    weeklySessions: normalizeGoal(candidate.weeklySessions)
  };
};

export const isFocusReviewGoalsPayload = (value: unknown): boolean =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
