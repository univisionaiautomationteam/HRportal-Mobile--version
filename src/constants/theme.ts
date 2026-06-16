export const COLORS = {
  light: {
    primary: '#2f7df6',
    primaryGradient: ['#2f7df6', '#1a66db'],
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    cardShadow: 'rgba(15, 23, 42, 0.05)',
    accent: '#7a5af8',
    success: '#22b573',
    warning: '#f59f00',
    danger: '#ef4444',
    info: '#0ea5e9',
    statusBar: 'dark-content',
    placeholder: '#94a3b8',
    transparent: 'transparent',
  },
  dark: {
    primary: '#3b82f6',
    primaryGradient: ['#3b82f6', '#1d4ed8'],
    background: '#090d16',
    surface: '#121826',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    border: '#1e293b',
    cardShadow: 'rgba(0, 0, 0, 0.3)',
    accent: '#9067f9',
    success: '#26c480',
    warning: '#f5a623',
    danger: '#f87171',
    info: '#38bdf8',
    statusBar: 'light-content',
    placeholder: '#475569',
    transparent: 'transparent',
  },
};

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  radiusSm: 6,
  radiusMd: 12,
  radiusLg: 16,
  radiusRound: 9999,
};

export const TYPOGRAPHY = {
  h1: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32, fontFamily: 'Times New Roman' },
  h2: { fontSize: 20, fontWeight: '700' as const, lineHeight: 28, fontFamily: 'Times New Roman' },
  h3: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24, fontFamily: 'Times New Roman' },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24, fontFamily: 'Times New Roman' },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, fontFamily: 'Times New Roman' },
  bodyMedium: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20, fontFamily: 'Times New Roman' },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16, fontFamily: 'Times New Roman' },
  captionBold: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16, fontFamily: 'Times New Roman' },
  button: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20, fontFamily: 'Times New Roman' },
};

export type ThemeType = typeof COLORS.light;
export type ColorKeys = keyof ThemeType;
