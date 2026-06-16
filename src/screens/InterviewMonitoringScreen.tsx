import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Switch,  } from 'react-native';
import { useTheme } from "../context/ThemeContext";
import { SIZES, TYPOGRAPHY } from "../constants/theme";
import { Eye, RefreshCcw, Clock, CheckCircle, Activity, ChevronRight } from "lucide-react-native";
import apiClient from "../services/apiClient";

export const InterviewMonitoringScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds

  const fetchLiveSessions = async () => {
    try {
      const response = await apiClient.get("/interviews/live/sessions");
      setActiveSessions(response.data.sessions || []);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveSessions();
  }, []);

  useEffect(() => {
    let interval: any;
    if (autoRefresh) {
      interval = setInterval(fetchLiveSessions, refreshInterval * 1000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLiveSessions();
  };

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

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading live sessions...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Live Monitoring</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Real-time interview tracking</Text>
        </View>
        <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: theme.surface }]} onPress={handleRefresh}>
          <RefreshCcw size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.controls, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.controlItem}>
          <Text style={[styles.controlLabel, { color: theme.text }]}>Auto Refresh</Text>
          <Switch
            value={autoRefresh}
            onValueChange={setAutoRefresh}
            trackColor={{ false: theme.border, true: theme.primary + "80" }}
            thumbColor={autoRefresh ? theme.primary : "#f4f3f4"}
          />
        </View>
        {autoRefresh && (
          <View style={styles.intervalPicker}>
            {[3, 5, 10].map((val) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.intervalBtn,
                  { borderColor: theme.border },
                  refreshInterval === val && { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}
                onPress={() => setRefreshInterval(val)}
              >
                <Text style={[styles.intervalText, { color: refreshInterval === val ? "#fff" : theme.textSecondary }]}>
                  {val}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
      >
        {activeSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Activity size={48} color={theme.border} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Active Interviews</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              No candidates are currently interviewing.
            </Text>
          </View>
        ) : (
          activeSessions.map((session) => (
            <TouchableOpacity
              key={session.session_id}
              style={[styles.sessionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => navigation.navigate("InterviewDetails", { sessionId: session.session_id })}
            >
              <View style={styles.cardHeader}>
                <View style={styles.candidateInfo}>
                  <Text style={[styles.candidateName, { color: theme.text }]}>{session.candidate_name || "Unknown"}</Text>
                  <Text style={[styles.candidateEmail, { color: theme.textSecondary }]}>{session.candidate_email}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(session.status) + "20" }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(session.status) }]}>
                    {session.status?.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.progressSection}>
                <View style={styles.progressInfo}>
                  <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>Progress</Text>
                  <Text style={[styles.progressText, { color: theme.text }]}>
                    Q{session.current_question || 0}/{session.total_questions || 0}
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                  <View
                    style={[styles.progressFill, { width: `${session.progress_percent || 0}%`, backgroundColor: theme.primary }]}
                  />
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.timeInfo}>
                  <Clock size={14} color={theme.textSecondary} />
                  <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                    Started: {new Date(session.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={styles.actionLink}>
                  <Text style={[styles.actionText, { color: theme.primary }]}>Details</Text>
                  <ChevronRight size={16} color={theme.primary} />
                </View>
              </View>

              {session.status?.toLowerCase() === "in_progress" && (
                <View style={styles.liveTag}>
                  <View style={[styles.liveDot, { backgroundColor: theme.danger }]} />
                  <Text style={[styles.liveText, { color: theme.danger }]}>LIVE</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
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
  loadingText: {
    marginTop: 10,
    ...TYPOGRAPHY.body,
  },
  header: {
    padding: SIZES.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    ...TYPOGRAPHY.h2,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    marginTop: 2,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  controls: {
    marginHorizontal: SIZES.lg,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.md,
  },
  controlItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  controlLabel: {
    ...TYPOGRAPHY.bodyMedium,
  },
  intervalPicker: {
    flexDirection: "row",
    gap: 6,
  },
  intervalBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  intervalText: {
    fontSize: 12,
    fontWeight: "600",
  },
  scrollContent: {
    padding: SIZES.lg,
    paddingTop: 0,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    marginTop: 16,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.body,
    marginTop: 8,
  },
  sessionCard: {
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    padding: SIZES.lg,
    marginBottom: SIZES.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SIZES.md,
  },
  candidateInfo: {
    flex: 1,
    marginRight: 8,
  },
  candidateName: {
    ...TYPOGRAPHY.h3,
  },
  candidateEmail: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  progressSection: {
    marginBottom: SIZES.md,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressLabel: {
    ...TYPOGRAPHY.captionBold,
  },
  progressText: {
    ...TYPOGRAPHY.captionBold,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    ...TYPOGRAPHY.caption,
  },
  actionLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  actionText: {
    ...TYPOGRAPHY.bodyMedium,
    fontSize: 13,
  },
  liveTag: {
    position: "absolute",
    top: -8,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "800",
  },
});

export default InterviewMonitoringScreen;
