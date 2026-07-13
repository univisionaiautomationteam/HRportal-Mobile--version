import { moderateScale } from '../utils/responsive';

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
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(20),
  xxl: moderateScale(24),
  radiusSm: moderateScale(6),
  radiusMd: moderateScale(12),
  radiusLg: moderateScale(16),
  radiusRound: 9999,
};

export const TYPOGRAPHY = {
  h1: { fontSize: moderateScale(24), fontWeight: '700' as const, lineHeight: moderateScale(32), fontFamily: 'Times New Roman' },
  h2: { fontSize: moderateScale(20), fontWeight: '700' as const, lineHeight: moderateScale(28), fontFamily: 'Times New Roman' },
  h3: { fontSize: moderateScale(16), fontWeight: '600' as const, lineHeight: moderateScale(24), fontFamily: 'Times New Roman' },
  bodyLarge: { fontSize: moderateScale(16), fontWeight: '400' as const, lineHeight: moderateScale(24), fontFamily: 'Times New Roman' },
  body: { fontSize: moderateScale(14), fontWeight: '400' as const, lineHeight: moderateScale(20), fontFamily: 'Times New Roman' },
  bodyMedium: { fontSize: moderateScale(14), fontWeight: '500' as const, lineHeight: moderateScale(20), fontFamily: 'Times New Roman' },
  caption: { fontSize: moderateScale(12), fontWeight: '400' as const, lineHeight: moderateScale(16), fontFamily: 'Times New Roman' },
  captionBold: { fontSize: moderateScale(12), fontWeight: '600' as const, lineHeight: moderateScale(16), fontFamily: 'Times New Roman' },
  button: { fontSize: moderateScale(14), fontWeight: '600' as const, lineHeight: moderateScale(20), fontFamily: 'Times New Roman' },
};

export type ThemeType = typeof COLORS.light;
export type ColorKeys = keyof ThemeType;
