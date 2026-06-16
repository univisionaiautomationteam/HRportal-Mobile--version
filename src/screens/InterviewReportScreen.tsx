import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,  } from 'react-native';
import { useTheme } from "../context/ThemeContext";
import { SIZES, TYPOGRAPHY } from "../constants/theme";
import { ChevronLeft, Download, CheckCircle, AlertTriangle, Star, FileText } from "lucide-react-native";
import apiClient from "../services/apiClient";

export const InterviewReportScreen = ({ route, navigation }: any) => {
  const { sessionId } = route.params;
  const { theme } = useTheme();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [sessionId]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      // Backend AI Interview API base
      const response = await apiClient.get(`/v1/sessions/${sessionId}/report`);
      setReport(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return theme.success;
    if (score >= 6) return theme.warning;
    return theme.danger;
  };

  if (loading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={[styles.errorCenter, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>Failed to load report</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.primary }]} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft color={theme.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Interview Report</Text>
        <TouchableOpacity>
           <Download size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.candidateHeader}>
           <Text style={[styles.candidateLabel, { color: theme.textSecondary }]}>Candidate Name</Text>
           <Text style={[styles.candidateName, { color: theme.text }]}>{report.candidate_name}</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.scoreRow}>
             <View style={styles.scoreCircle}>
                <Text style={[styles.scoreVal, { color: getScoreColor(report.summary.overall_score) }]}>
                    {report.summary.overall_score.toFixed(1)}
                </Text>
                <Text style={[styles.scoreOf, { color: theme.textSecondary }]}>/ 10</Text>
             </View>
             <View style={styles.recBox}>
                <Text style={[styles.recLabel, { color: theme.textSecondary }]}>Recommendation</Text>
                <View style={[styles.recBadge, { backgroundColor: getScoreColor(report.summary.overall_score) + "20" }]}>
                    <Text style={[styles.recText, { color: getScoreColor(report.summary.overall_score) }]}>
                        {report.summary.recommendation}
                    </Text>
                </View>
             </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.metaRow}>
             <View style={styles.metaItem}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Questions</Text>
                <Text style={[styles.value, { color: theme.text }]}>{report.answers.length}</Text>
             </View>
             <View style={styles.metaItem}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Date</Text>
                <Text style={[styles.value, { color: theme.text }]}>
                    {new Date(report.scheduled_at).toLocaleDateString()}
                </Text>
             </View>
          </View>
        </View>

        <View style={styles.sectionRow}>
           <View style={[styles.insightCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.insightHeader}>
                <CheckCircle size={16} color={theme.success} />
                <Text style={[styles.insightTitle, { color: theme.success }]}>Strengths</Text>
              </View>
              {report.summary.strengths.map((s: string, idx: number) => (
                <Text key={idx} style={[styles.insightItem, { color: theme.text }]}>• {s}</Text>
              ))}
           </View>

           <View style={[styles.insightCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.insightHeader}>
                <AlertTriangle size={16} color={theme.warning} />
                <Text style={[styles.insightTitle, { color: theme.warning }]}>Areas of Improvement</Text>
              </View>
              {report.summary.concerns.map((c: string, idx: number) => (
                <Text key={idx} style={[styles.insightItem, { color: theme.text }]}>• {c}</Text>
              ))}
           </View>
        </View>

        <Text style={[styles.sectionHeading, { color: theme.text }]}>Question Analysis</Text>

        {report.answers.map((answer: any, idx: number) => (
          <View key={idx} style={[styles.answerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
             <View style={styles.answerHeader}>
                <View style={styles.qNumBox}>
                    <Text style={styles.qNumText}>Q{idx + 1}</Text>
                </View>
                <View style={styles.answerScore}>
                   <Star size={14} color={getScoreColor(answer.score)} fill={getScoreColor(answer.score)} />
                   <Text style={[styles.answerScoreText, { color: getScoreColor(answer.score) }]}>
                      {answer.score.toFixed(1)} / 10
                   </Text>
                </View>
             </View>

             <Text style={[styles.questionText, { color: theme.text }]}>{answer.question}</Text>

             <View style={styles.tagRow}>
                <View style={[styles.tag, { backgroundColor: theme.border }]}>
                    <Text style={[styles.tagText, { color: theme.textSecondary }]}>
                        {answer.source === "audio" ? "Voice" : "Text"}
                    </Text>
                </View>
                <View style={[styles.tag, { backgroundColor: answer.cheating_risk === "low" ? theme.success + "15" : theme.danger + "15" }]}>
                    <Text style={[styles.tagText, { color: answer.cheating_risk === "low" ? theme.success : theme.danger }]}>
                        Risk: {answer.cheating_risk?.toUpperCase()}
                    </Text>
                </View>
             </View>

             <View style={styles.answerBox}>
                <Text style={[styles.boxLabel, { color: theme.textSecondary }]}>Candidate's Response</Text>
                <Text style={[styles.boxText, { color: theme.text }]}>{answer.answer_text}</Text>
             </View>

             <View style={[styles.feedbackBox, { backgroundColor: theme.background }]}>
                <Text style={[styles.boxLabel, { color: theme.textSecondary }]}>Feedback</Text>
                <Text style={[styles.boxText, { color: theme.textSecondary }]}>{answer.feedback}</Text>
             </View>
          </View>
        ))}
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
  },
  errorText: {
    ...TYPOGRAPHY.bodyMedium,
  },
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SIZES.lg,
    paddingBottom: SIZES.md,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
  },
  scrollContent: {
    padding: SIZES.lg,
    paddingBottom: 40,
  },
  candidateHeader: {
    marginBottom: SIZES.lg,
  },
  candidateLabel: {
    ...TYPOGRAPHY.captionBold,
    textTransform: "uppercase",
  },
  candidateName: {
    ...TYPOGRAPHY.h2,
    fontSize: 26,
  },
  summaryCard: {
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    padding: SIZES.lg,
    marginBottom: SIZES.lg,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  scoreVal: {
    fontSize: 24,
    fontWeight: "800",
  },
  scoreOf: {
    fontSize: 10,
    fontWeight: "600",
  },
  recBox: {
    flex: 1,
  },
  recLabel: {
    ...TYPOGRAPHY.captionBold,
    marginBottom: 4,
  },
  recBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  recText: {
    fontSize: 12,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    marginVertical: SIZES.lg,
  },
  metaRow: {
    flexDirection: "row",
  },
  metaItem: {
    flex: 1,
  },
  label: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 10,
    textTransform: "uppercase",
  },
  value: {
    ...TYPOGRAPHY.bodyMedium,
  },
  sectionRow: {
    flexDirection: "row",
    gap: SIZES.md,
    marginBottom: SIZES.lg,
  },
  insightCard: {
    flex: 1,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    padding: SIZES.md,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  insightTitle: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
  },
  insightItem: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
  sectionHeading: {
    ...TYPOGRAPHY.h3,
    marginBottom: SIZES.md,
  },
  answerCard: {
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    padding: SIZES.lg,
    marginBottom: SIZES.md,
  },
  answerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  qNumBox: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qNumText: {
    ...TYPOGRAPHY.captionBold,
    color: "#475569",
  },
  answerScore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  answerScoreText: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: "800",
  },
  questionText: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: "700",
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: SIZES.lg,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  answerBox: {
    marginBottom: SIZES.md,
  },
  boxLabel: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 10,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  boxText: {
    ...TYPOGRAPHY.body,
    lineHeight: 20,
  },
  feedbackBox: {
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
  }
});

export default InterviewReportScreen;
