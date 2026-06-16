import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SIZES, TYPOGRAPHY } from '../constants/theme';

interface UpcomingItem {
  id: string;
  role: string;
  name: string;
  date: string;
  time: string;
}

interface UpcomingInterviewsProps {
  items: UpcomingItem[];
  onViewAll: () => void;
}

export const UpcomingInterviews: React.FC<UpcomingInterviewsProps> = ({ items, onViewAll }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Schedule Feed</Text>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={[styles.link, { color: theme.primary }]}>View All</Text>
        </TouchableOpacity>
      </View>

      {!items.length ? (
        <Text style={[styles.empty, { color: theme.textSecondary }]}>
          No upcoming interviews.
        </Text>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <View key={item.id} style={[styles.item, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <View style={styles.leftCol}>
                <Text style={[styles.role, { color: theme.text }]}>{item.role}</Text>
                <Text style={[styles.name, { color: theme.textSecondary }]}>{item.name}</Text>
              </View>
              <View style={styles.rightCol}>
                <Text style={[styles.date, { color: theme.primary }]}>{item.date}</Text>
                <Text style={[styles.time, { color: theme.textSecondary }]}>{item.time}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  },
  link: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  },
  empty: {
    fontSize: 14,
    fontFamily: 'Times New Roman',
    textAlign: 'center',
    paddingVertical: 12,
  },
  list: {
    flexDirection: 'column',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  leftCol: {
    flex: 1,
    paddingRight: 8,
  },
  role: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Times New Roman',
  },
  name: {
    fontSize: 12,
    fontFamily: 'Times New Roman',
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  date: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  },
  time: {
    fontSize: 11,
    fontFamily: 'Times New Roman',
    marginTop: 2,
  },
});
export default UpcomingInterviews;
