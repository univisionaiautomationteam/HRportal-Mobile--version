import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SIZES, TYPOGRAPHY } from '../constants/theme';

interface SourceItem {
  label: string;
  value: number;
  color: string;
}

interface SourceBarsProps {
  items: SourceItem[];
}

export const SourceBars: React.FC<SourceBarsProps> = ({ items }) => {
  const { theme } = useTheme();

  if (!items.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          No HR ownership data found. New candidates will populate this chart.
        </Text>
      </View>
    );
  }

  const maxValue = Math.max(...items.map((i) => i.value), 1);

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
    >
      <View style={styles.barsWrapper}>
        {items.map((item, idx) => {
          const heightPercent = `${(item.value / maxValue) * 100}%`;
          return (
            <View key={`${item.label}-${idx}`} style={styles.barGroup}>
              <Text style={[styles.barValue, { color: theme.text }]}>{item.value}</Text>
              
              <View style={[styles.track, { backgroundColor: theme.border }]}>
                <View 
                  style={[
                  styles.fill,
                    {
                     height: `${(item.value / maxValue) * 100}%` as any,
                     backgroundColor: item.color
                    }
                       ]}
                />
              </View>
              
              <Text 
                numberOfLines={1} 
                style={[styles.barLabel, { color: theme.textSecondary }]}
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Times New Roman',
    textAlign: 'center',
  },
  scrollContainer: {
    paddingVertical: 12,
  },
  barsWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 180,
    paddingHorizontal: 8,
  },
  barGroup: {
    alignItems: 'center',
    width: 75,
    marginHorizontal: 8,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValue: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
    marginBottom: 4,
  },
  track: {
    width: 24,
    height: 110,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 12,
    fontFamily: 'Times New Roman',
    fontWeight: '500',
    marginTop: 8,
    width: '100%',
    textAlign: 'center',
  },
});
export default SourceBars;
