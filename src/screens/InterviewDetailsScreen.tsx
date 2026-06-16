import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform,  } from 'react-native';
import { useTheme } from "../context/ThemeContext";
import { SIZES, TYPOGRAPHY } from "../constants/theme";
import { ChevronLeft, Clock, Activity, CheckCircle, AlertTriangle, BookOpen } from "lucide-react-native";
import apiClient from "../services/apiClient";
import Button from "../components/Button";

export const InterviewDetailsScreen = ({ route, navigation }: any) => {
  const { sessionId } = route.params;
  const { theme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSessionDetails = async () => {
    try {
      const response = await apiClient.get(`/interviews/live/${sessionId}`);
      setSession(response.data);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessionDetails();
    const interval = setInterval(fetchSessionDetails, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "in_progress":
        return theme.success;
      case "completed":
        return theme.primary;
      case "scheduled":
        return theme.warning;
      default:
        return theme.textSecondary;
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.errorCenter, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>Session not found</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.primary }]} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQ = session.current_question_index !== null ? session.questions?.[session.current_question_index] : null;
  const progressPercent = session.questions?.length ? Math.round(((session.current_question_index + 1) / session.questions.length) * 100) : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{session.candidate_name}</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>{session.candidate_email}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.statusCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.statusRow}>
            <View>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Current Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(session.status) + "20" }]}>
                <Text style={[styles.statusText, { color: getStatusColor(session.status) }]}>{session.status?.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.progressCircleContainer}>
               <Text style={[styles.progressVal, { color: theme.primary }]}>{progressPercent}%</Text>
               <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>Progress</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Type</Text>
              <Text style={[styles.value, { color: theme.text }]}>{session.interview_type || "Standard"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Started At</Text>
              <Text style={[styles.value, { color: theme.text }]}>
                {new Date(session.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        </View>

        {session.cheating_detected && (
          <View style={[styles.warningBox, { backgroundColor: theme.danger + "10", borderColor: theme.danger + "30" }]}>
            <AlertTriangle size={20} color={theme.danger} />
            <Text style={[styles.warningText, { color: theme.danger }]}>Cheating attempt detected</Text>
          </View>
        )}

        {currentQ && (
          <View style={[styles.questionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.sectionHeader}>
              <BookOpen size={20} color={theme.primary} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Current Question</Text>
              <View style={[styles.qIndex, { backgroundColor: theme.primary }]}>
                <Text style={styles.qIndexText}>Q{session.current_question_index + 1}</Text>
              </View>
            </View>
            <Text style={[styles.questionBody, { color: theme.text }]}>{currentQ.question}</Text>
          </View>
        )}

        {session.status?.toLowerCase() === "completed" && (
            <Button
                label="View Full Report"
                onPress={() => navigation.navigate("InterviewReport", { sessionId })}
                style={{ marginBottom: SIZES.lg }}
            />
        )}

        <View style={styles.timelineSection}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 12 }]}>Interview Roadmap</Text>
          {session.questions?.map((q: any, idx: number) => {
            const isCompleted = idx < session.current_question_index;
            const isCurrent = idx === session.current_question_index;
            return (
              <View key={idx} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.timelineDot,
                    { backgroundColor: isCompleted ? theme.success : isCurrent ? theme.primary : theme.border }
                  ]}>
                    {isCompleted && <CheckCircle size={12} color="#fff" />}
                  </View>
                  {idx < session.questions.length - 1 && <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />}
                </View>
                <View style={[
                  styles.timelineContent,
                  { backgroundColor: theme.surface, borderColor: isCurrent ? theme.primary : theme.border },
                  isCurrent && { borderWidth: 1 }
                ]}>
                  <Text style={[styles.timelineTitle, { color: isCurrent ? theme.primary : theme.text }]}>Question {idx + 1}</Text>
                  <Text style={[styles.timelineText, { color: theme.textSecondary }]} numberOfLines={2}>{q.question}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SIZES.xl,
  },
  errorText: {
    ...TYPOGRAPHY.h3,
    marginBottom: 20,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: SIZES.lg,
    paddingBottom: SIZES.md,
  },
  headerTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
  },
  scrollContent: {
    padding: SIZES.lg,
  },
  statusCard: {
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    padding: SIZES.lg,
    marginBottom: SIZES.lg,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    ...TYPOGRAPHY.captionBold,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  progressCircleContainer: {
    alignItems: "center",
  },
  progressVal: {
    fontSize: 24,
    fontWeight: "800",
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginVertical: SIZES.lg,
  },
  infoGrid: {
    flexDirection: "row",
  },
  infoItem: {
    flex: 1,
  },
  value: {
    ...TYPOGRAPHY.bodyMedium,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    marginBottom: SIZES.lg,
    gap: 10,
  },
  warningText: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: "700",
  },
  questionCard: {
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    padding: SIZES.lg,
    marginBottom: SIZES.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: "700",
    flex: 1,
  },
  qIndex: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qIndexText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  questionBody: {
    ...TYPOGRAPHY.h3,
    lineHeight: 24,
  },
  timelineSection: {
    marginBottom: 40,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 0,
  },
  timelineLeft: {
    width: 30,
    alignItems: "center",
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    zIndex: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 10,
    marginBottom: 16,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
  },
  timelineTitle: {
    ...TYPOGRAPHY.captionBold,
    marginBottom: 2,
  },
  timelineText: {
    ...TYPOGRAPHY.caption,
  }
});

export default InterviewDetailsScreen;
