import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SIZES, TYPOGRAPHY } from '../constants/theme';

interface ActivityItem {
  id: string;
  type: 'candidate' | 'interview' | 'offer' | string;
  title: string;
  timeAgo: string;
}

interface ActivityListProps {
  items: ActivityItem[];
}

export const ActivityList: React.FC<ActivityListProps> = ({ items }) => {
  const { theme } = useTheme();

  if (!items.length) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          No recent activities yet.
        </Text>
      </View>
    );
  }

  const getDotColor = (type: string) => {
    switch (type) {
      case 'candidate':
        return theme.primary;
      case 'interview':
        return theme.success;
      case 'offer':
        return theme.accent;
      default:
        return theme.textSecondary;
    }
  };

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item.id} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: getDotColor(item.type) }]} />
          <View style={styles.content}>
            <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
            <Text style={[styles.time, { color: theme.textSecondary }]}>{item.timeAgo}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  empty: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Times New Roman',
  },
  list: {
    flexDirection: 'column',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Times New Roman',
  },
  time: {
    fontSize: 12,
    fontFamily: 'Times New Roman',
    marginTop: 2,
  },
});
export default ActivityList;
