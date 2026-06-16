import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SIZES, TYPOGRAPHY } from '../constants/theme';

interface CardProps {
  title?: string;
  error?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  title,
  error,
  action,
  children,
  style,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>
      {title && (
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {action && <View style={styles.action}>{action}</View>}
        </View>
      )}
      {error ? (
        <View style={[styles.errorBox, { backgroundColor: theme.danger + '15' }]}>
          <Text style={[styles.errorText, { color: theme.danger }]}>⚠️ {error}</Text>
        </View>
      ) : null}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
    flex: 1,
  },
  action: {
    marginLeft: SIZES.sm,
  },
  errorBox: {
    padding: SIZES.sm,
    borderRadius: SIZES.radiusSm,
    marginBottom: SIZES.md,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  },
  content: {
    flexDirection: 'column',
  },
});
export default Card;
