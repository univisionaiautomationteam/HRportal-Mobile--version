import { useColorScheme as useRNColorScheme } from 'react-native';
import { COLORS } from '../constants/theme';

export function useTheme() {
  const scheme = useRNColorScheme();
  const theme = scheme === 'dark' ? 'dark' : 'light';

  return COLORS[theme];
}