import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SIZES, TYPOGRAPHY } from '../constants/theme';
import { UserPlus, CalendarPlus, Sparkles } from 'lucide-react-native';

interface QuickActionsProps {
  onAddCandidate: () => void;
  onScheduleInterview: () => void;
  onAIAssistant: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onAddCandidate,
  onScheduleInterview,
  onAIAssistant,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.grid}>
      <TouchableOpacity 
        style={[styles.btn, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '20' }]}
        onPress={onAddCandidate}
      >
        <UserPlus color={theme.primary} size={24} />
        <Text style={[styles.label, { color: theme.text }]}>Add Candidate</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.btn, { backgroundColor: theme.success + '12', borderColor: theme.success + '20' }]}
        onPress={onScheduleInterview}
      >
        <CalendarPlus color={theme.success} size={24} />
        <Text style={[styles.label, { color: theme.text }]}>Schedule Intv</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.btn, { backgroundColor: theme.accent + '12', borderColor: theme.accent + '20' }]}
        onPress={onAIAssistant}
      >
        <Sparkles color={theme.accent} size={24} />
        <Text style={[styles.label, { color: theme.text }]}>AI Assistant</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  btn: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
    marginTop: 8,
    textAlign: 'center',
  },
});
export default QuickActions;
