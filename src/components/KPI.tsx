import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SIZES, TYPOGRAPHY } from '../constants/theme';

interface KPIProps {
  title: string;
  value: string | number;
  delta: number;
  color: 'blue' | 'green' | 'violet' | 'orange';
}

export const KPI: React.FC<KPIProps> = ({ title, value, delta, color }) => {
  const { theme } = useTheme();

  const getColorStyles = () => {
    switch (color) {
      case 'blue':
        return {
          bg: '#eff6ff',
          border: '#bfdbfe',
          text: '#1e40af',
        };
      case 'green':
        return {
          bg: '#ecfdf5',
          border: '#d1fae5',
          text: '#065f46',
        };
      case 'violet':
        return {
          bg: '#f5f3ff',
          border: '#ddd6fe',
          text: '#5b21b6',
        };
      case 'orange':
        return {
          bg: '#fff7ed',
          border: '#fed7aa',
          text: '#9a3412',
        };
    }
  };

  const colors = getColorStyles();

  return (
    <View style={[
      styles.card, 
      { 
        backgroundColor: colors.bg,
        borderColor: colors.border 
      }
    ]}>
      <Text style={[styles.title, { color: colors.text, opacity: 0.8 }]}>{title}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.deltaText, { color: colors.text }]}>
        {delta >= 0 ? `+${delta}` : delta} in this week
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    minWidth: 140,
    margin: SIZES.xs,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
    marginVertical: 4,
  },
  deltaText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Times New Roman',
    marginTop: 4,
  },
});
export default KPI;
