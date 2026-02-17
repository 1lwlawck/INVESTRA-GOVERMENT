/**
 * Design Tokens / Theme Constants
 *
 * Centralised colour & spacing references so that Tailwind classes can be
 * overridden in one place rather than hard-coded across components.
 */

export const COLORS = {
  /** Government blue (#002C5F) */
  primary: '#002C5F',
  /** Gold accent (#F9B233) */
  accent: '#F9B233',
  /** Error / danger (#DC2626) */
  danger: '#DC2626',
  /** Success (#059669) */
  success: '#059669',
  /** Info (#2563EB) */
  info: '#2563EB',
  /** Warning (#D97706) */
  warning: '#D97706',
} as const;

export const CHART_PALETTE = [
  COLORS.primary,
  COLORS.accent,
  COLORS.success,
  COLORS.danger,
  COLORS.info,
  COLORS.warning,
  '#6366F1', // indigo
  '#EC4899', // pink
] as const;
