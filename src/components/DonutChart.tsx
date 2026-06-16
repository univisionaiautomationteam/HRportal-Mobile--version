import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { SIZES, TYPOGRAPHY } from '../constants/theme';

interface DonutItem {
  label: string;
  value: number;
  percent: number;
  color: string;
}

interface DonutChartProps {
  total: number;
  items: DonutItem[];
}

export const DonutChart: React.FC<DonutChartProps> = ({ total, items }) => {
  const { theme } = useTheme();

  const radius = 50;
  const strokeWidth = 14;
  const size = 130;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const fallback: DonutItem[] = [{ label: 'No Data', value: 0, percent: 100, color: theme.border }];
  const chartItems = items.length ? items : fallback;

  let cumulativePercent = 0;

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G rotation="-90" origin={`${center}, ${center}`}>
            {/* Background circle */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={theme.border}
              strokeWidth={strokeWidth}
            />
            {/* Segments */}
            {chartItems.map((item, idx) => {
              const percentage = item.percent;
              const strokeDashoffset = circumference - (circumference * percentage) / 100;
              const rotationAngle = (cumulativePercent * 360) / 100;
              cumulativePercent += percentage;

              return (
                <Circle
                  key={`${item.label}-${idx}`}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  rotation={rotationAngle}
                  origin={`${center}, ${center}`}
                  strokeLinecap="round"
                />
              );
            })}
          </G>
        </Svg>
        
        {/* Total Center Hole Overlay */}
        <View style={[styles.hole, { backgroundColor: theme.surface }]}>
          <Text style={[styles.holeTotal, { color: theme.text }]}>{total}</Text>
          <Text style={[styles.holeLabel, { color: theme.textSecondary }]}>Total</Text>
        </View>
      </View>

      {/* Legend list */}
      <View style={styles.legend}>
        {chartItems.map((item, idx) => (
          <View key={`${item.label}-${idx}`} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={[styles.legendText, { color: theme.text }]}>{item.label}</Text>
            <Text style={[styles.legendValue, { color: theme.textSecondary }]}>
              {item.value} ({Math.round(item.percent)}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  chartWrapper: {
    position: 'relative',
    width: 130,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hole: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holeTotal: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
    lineHeight: 26,
  },
  holeLabel: {
    fontSize: 10,
    fontWeight: '400',
    fontFamily: 'Times New Roman',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  legend: {
    flex: 1,
    marginLeft: 24,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'Times New Roman',
    flex: 1,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
    marginLeft: 8,
  },
});
export default DonutChart;
