import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, AppState, Platform, Dimensions, StatusBar, PermissionsAndroid } from 'react-native';
import AudioRecorderPlayer from 'react-native-nitro-sound';
import { useTheme } from "../context/ThemeContext";
import { SIZES, TYPOGRAPHY } from "../constants/theme";
import { Mic, Square, CheckCircle, AlertTriangle, ChevronLeft } from "lucide-react-native";
import apiClient from "../services/apiClient";
import Button from "../components/Button";

const AI_API_BASE = "http://10.0.2.2:8000"; // Default for Android Emulator

export const CandidateInterviewScreen = ({ route, navigation }: any) => {
  const { sessionId } = route.params;
  const { theme } = useTheme();

  const audioRecorderPlayer = AudioRecorderPlayer;

  // State Management
  const [session, setSession] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cheatingWarning, setCheatingWarning] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  /* ================= API CALLS ================= */

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${AI_API_BASE}/api/v1/sessions/${sessionId}`);
      if (!response.ok) throw new Error("Failed to fetch session");
      const data = await response.json();
      setSession(data);

      const qRes = await fetch(`${AI_API_BASE}/api/v1/sessions/${sessionId}/next-question`);
      if (!qRes.ok) throw new Error("Failed to fetch question");
      const qData = await qRes.json();
      setCurrentQuestion(qData.question);
    } catch (error: any) {
      console.error("Fetch error:", error);
      Alert.alert("Connection Error", "Unable to load interview session. Ensure AI service is running.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchData();

    // Monitoring app state for cheating detection (switching apps)
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState !== "active" && !isSubmitting && session?.status !== 'completed') {
        setCheatingWarning(true);
        Alert.alert("Security Warning", "Switching apps is monitored and logged as potential cheating.");
      }
    });

    return () => {
      subscription.remove();
      audioRecorderPlayer.stopRecorder().catch(() => {});
      audioRecorderPlayer.removeRecordBackListener();
    };
  }, [fetchData]);

  /* ================= AUDIO LOGIC ================= */

  const startRecording = async () => {
    try {
      if (Platform.OS === 'android') {
        const grants = await Promise.all([
          PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO),
          PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE),
          PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE),
        ]);

        if (grants[0] !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert("Permission Denied", "Microphone access is required for the interview.");
          return;
        }
      }

      const result = await audioRecorderPlayer.startRecorder();
      console.log('Recording started:', result);
      setIsRecording(true);
    } catch (err: any) {
      console.error("Start recording failed:", err);
      Alert.alert("Error", "Failed to initialize microphone.");
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      setIsSubmitting(true);

      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      console.log('Recording stopped:', result);

      if (result) {
        await uploadAnswer(result);
      }
    } catch (err) {
      console.error("Stop recording failed:", err);
      setIsSubmitting(false);
    }
  };

  const uploadAnswer = async (uri: string) => {
    try {
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: `answer-${Date.now()}.m4a`,
        type: "audio/m4a",
      } as any);

      const response = await fetch(`${AI_API_BASE}/api/v1/sessions/${sessionId}/answers/audio`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const updatedSession = await response.json();
      setSession(updatedSession);

      if (updatedSession.status !== "completed") {
        const nextQRes = await fetch(`${AI_API_BASE}/api/v1/sessions/${sessionId}/next-question`);
        const nextQData = await nextQRes.json();
        setCurrentQuestion(nextQData.question);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      Alert.alert("Error", "Failed to save response. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ================= RENDER ================= */

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Preparing session...</Text>
      </View>
    );
  }

  const isComplete = session?.status === "completed";
  const totalQuestions = session?.questions?.length || 0;
  const currentQIndex = session?.current_question_index ?? 0;
  const progress = totalQuestions > 0 ? ((currentQIndex + 1) / totalQuestions) * 100 : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.title, { color: theme.text }]}>AI Interview</Text>
          <Text style={[styles.candidateName, { color: theme.textSecondary }]}>{session?.candidate_name}</Text>
        </View>
        {cheatingWarning && (
          <View style={styles.warningBadge}>
            <AlertTriangle size={12} color="#fff" />
            <Text style={styles.warningText}>SECURITY ALERT</Text>
          </View>
        )}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: '#E2E8F0' }]}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.primary }]} />
        </View>
        <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
          Question {currentQIndex + 1} of {totalQuestions}
        </Text>
      </View>

      <View style={styles.main}>
        {isComplete ? (
          <View style={styles.completeCard}>
            <CheckCircle size={80} color={theme.success} />
            <Text style={[styles.completeTitle, { color: theme.text }]}>Assessment Finished</Text>
            <Text style={[styles.completeDesc, { color: theme.textSecondary }]}>
              Thank you for participating. Your responses have been processed and sent to the recruitment team for evaluation.
            </Text>
            <Button label="Return to Dashboard" onPress={() => navigation.navigate("Dashboard")} style={styles.finishBtn} />
          </View>
        ) : (
          <View style={[styles.questionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.qLabel, { color: theme.primary }]}>TECHNICAL ASSESSMENT</Text>
            <Text style={[styles.qText, { color: theme.text }]}>{currentQuestion?.question}</Text>

            <View style={styles.recordingSection}>
              {isSubmitting ? (
                <View style={styles.submittingView}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={[styles.instruction, { color: theme.text, marginTop: 16 }]}>Uploading your response...</Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.recordBtn, { backgroundColor: isRecording ? theme.danger : theme.primary }]}
                    onPress={isRecording ? stopRecording : startRecording}
                    activeOpacity={0.8}
                  >
                    {isRecording ? <Square size={32} color="#fff" /> : <Mic size={32} color="#fff" />}
                    {isRecording && <View style={styles.pulseRing} />}
                  </TouchableOpacity>

                  <Text style={[styles.instruction, { color: theme.textSecondary }]}>
                    {isRecording ? "Listening... Tap to stop" : "Tap to record your answer"}
                  </Text>
                </>
              )}
            </View>

            {isRecording && (
              <View style={styles.liveIndicator}>
                <View style={styles.dot} />
                <Text style={styles.liveText}>LIVE RECORDING</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerWarning, { color: theme.textSecondary }]}>
          ⚠️ Secure session. Do not close this app or switch screens.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 15, fontFamily: 'Times New Roman', marginTop: 12 },
  header: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  title: { fontSize: 24, fontWeight: '700', fontFamily: 'Times New Roman' },
  candidateName: { fontSize: 14, fontFamily: 'Times New Roman', marginTop: 2 },
  warningBadge: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6
  },
  warningText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  progressContainer: { paddingHorizontal: 24, marginBottom: 24 },
  progressBar: { height: 6, borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  progressFill: { height: '100%' },
  progressLabel: { fontSize: 12, fontWeight: '700', fontFamily: 'Times New Roman' },
  main: { flex: 1, padding: 24, justifyContent: 'center' },
  completeCard: { alignItems: 'center', padding: 24 },
  completeTitle: { fontSize: 28, fontWeight: '700', fontFamily: 'Times New Roman', marginTop: 24, textAlign: 'center' },
  completeDesc: { fontSize: 14, fontFamily: 'Times New Roman', textAlign: 'center', marginTop: 12, lineHeight: 22 },
  finishBtn: { width: '100%', marginTop: 32, height: 52 },
  questionCard: {
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 4,
  },
  qLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 20, textTransform: 'uppercase' },
  qText: { fontSize: 22, fontWeight: '700', fontFamily: 'Times New Roman', textAlign: 'center', lineHeight: 30, marginBottom: 40 },
  recordingSection: { alignItems: 'center', width: '100%' },
  recordBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 2,
    elevation: 5,
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#ef4444',
    opacity: 0.3
  },
  instruction: { fontSize: 14, fontFamily: 'Times New Roman', textAlign: 'center' },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 8
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  liveText: { color: '#ef4444', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  submittingView: { height: 120, justifyContent: 'center' },
  footer: { padding: 24, alignItems: 'center' },
  footerWarning: { fontSize: 12, textAlign: 'center', fontFamily: 'Times New Roman' },
});

export default CandidateInterviewScreen;
