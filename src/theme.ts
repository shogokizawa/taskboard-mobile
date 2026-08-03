/**
 * 既存Webアプリ（taskboard）の tailwind.config.ts / globals.css と同じパレット。
 * 色を変えるときは両方を揃えること。
 */
export const colors = {
  bg: '#0F1117',
  surface: '#181C27',
  card: '#1E2335',
  elevated: '#252C42',

  border: '#2E3550',
  borderStrong: '#3D4668',

  accent: '#3B7DD8',
  accentPressed: '#2D6ABF',
  accentMuted: '#1A2A4A',

  textPrimary: '#E8ECF4',
  textSecondary: '#8B93B0',
  textMuted: '#545C7A',

  danger: '#F87171',
  dangerMuted: '#3A1B22',
  success: '#10B981',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const;

/** タッチ操作の最小サイズ（Material Design のガイドラインに合わせる） */
export const MIN_TOUCH = 48;

/**
 * タグ色などの単色から、背景に敷ける半透明色をつくる。
 * Webアプリの `bg-blue-950 / text-blue-400` のような組み合わせをRNで再現するため。
 */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}
