import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';
import {pick,types,isErrorWithCode,errorCodes} from '@react-native-documents/picker';
import { useTheme } from '../context/ThemeContext';
import { SIZES, TYPOGRAPHY } from '../constants/theme';
import Button from '../components/Button';
import { ChevronLeft, Target, FileText, CheckCircle2, ShieldCheck, Clock, Info } from 'lucide-react-native';
import { AI_INTERVIEW_BASE_URL } from '../constants/config';

export const StartInterviewScreen = ({ navigation }: any) => {
  const { theme } = useTheme();

  const [formData, setFormData] = useState({
    candidateName: "",
    candidateEmail: "",
    resumeText: "",
    jobDescription: "",
  });
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async () => {
    try {
      const result = await pick({
        type: [types.plainText, types.pdf],
});

      if (result && result[0]) {
        setIsUploading(true);
        const file = result[0];
        setFormData(prev => ({ ...prev, resumeText: `Resume content from ${file.name}...` }));
        Alert.alert("Success", "Resume uploaded and text extracted.");
      }
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        // User cancelled
      } else {
        Alert.alert("Error", "Failed to upload file.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.candidateName.trim()) {
      Alert.alert("Required", "Candidate name is mandatory.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        candidate_name: formData.candidateName,
        candidate_email: formData.candidateEmail || undefined,
        resume_text: formData.resumeText || undefined,
        job_description: formData.jobDescription || undefined,
        scheduled_at: new Date().toISOString(),
        interview_type: "AI HR Interview",
      };

      const response = await fetch(`${AI_INTERVIEW_BASE_URL}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to create session");

      const data = await response.json();
      Alert.alert("Success", "Interview session initialized.");
      navigation.navigate("CandidateInterview", { sessionId: data.session_id });
    } catch (err) {
      Alert.alert("Error", "Could not connect to AI service. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Target size={24} color={theme.text} />
              <Text style={[styles.title, { color: theme.text }]}>AI Interview Assessment</Text>
            </View>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Welcome to the AI-powered interview. Provide your info to begin.
            </Text>
          </View>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Full Name *</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
              placeholder="Enter your full name"
              value={formData.candidateName}
              onChangeText={v => handleInputChange('candidateName', v)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
              placeholder="your.email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.candidateEmail}
              onChangeText={v => handleInputChange('candidateEmail', v)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Resume Content</Text>
            <TouchableOpacity
              style={[styles.uploadBox, { borderColor: theme.border, backgroundColor: theme.background }]}
              onPress={handleFileUpload}
              disabled={isUploading}
            >
              <FileText size={20} color={theme.primary} />
              <Text style={[styles.uploadText, { color: theme.textSecondary }]}>
                {isUploading ? "Uploading..." : "Tap to upload resume (.txt, .pdf)"}
              </Text>
            </TouchableOpacity>

            <TextInput
              style={[styles.textArea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
              placeholder="Or paste resume text here..."
              multiline
              numberOfLines={4}
              value={formData.resumeText}
              onChangeText={v => handleInputChange('resumeText', v)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Job Description (Optional)</Text>
            <TextInput
              style={[styles.textArea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
              placeholder="Paste job description for tailored questions..."
              multiline
              numberOfLines={3}
              value={formData.jobDescription}
              onChangeText={v => handleInputChange('jobDescription', v)}
            />
          </View>

          <View style={styles.termsBox}>
            <CheckCircle2 size={16} color={theme.success} />
            <Text style={[styles.termsText, { color: theme.textSecondary }]}>
              I understand this session is monitored for assessment quality.
            </Text>
          </View>

          <Button
            label={loading ? "Initializing..." : "Start Interview"}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
          />
        </View>

        {/* Info Cards */}
        <View style={styles.infoSection}>
          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.infoTitleRow}>
              <Target size={18} color={theme.primary} />
              <Text style={[styles.infoTitle, { color: theme.text }]}>What to Expect</Text>
            </View>
            <Text style={[styles.infoDesc, { color: theme.textSecondary }]}>
              5-10 targeted questions based on your background. Speak clearly into the mic.
            </Text>
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.infoTitleRow}>
              <Clock size={18} color={theme.primary} />
              <Text style={[styles.infoTitle, { color: theme.text }]}>Duration</Text>
            </View>
            <Text style={[styles.infoDesc, { color: theme.textSecondary }]}>
              Typically 15-20 minutes depending on your response depth.
            </Text>
          </View>

          <View style={[styles.infoCard, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
            <View style={styles.infoTitleRow}>
              <ShieldCheck size={18} color={theme.primary} />
              <Text style={[styles.infoTitle, { color: theme.text }]}>Technical Needs</Text>
            </View>
            <Text style={[styles.infoDesc, { color: theme.textSecondary }]}>
              • Microphone access required{"\n"}
              • Stable internet connection{"\n"}
              • Quiet environment
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 32,
    alignItems: 'flex-start',
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
    marginRight: 8,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Times New Roman',
    marginTop: 6,
    lineHeight: 20,
  },
  card: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 4,
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: 'Times New Roman',
  },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 10,
  },
  uploadText: {
    fontSize: 13,
    fontFamily: 'Times New Roman',
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 2,
    padding: 16,
    fontSize: 14,
    fontFamily: 'Times New Roman',
    textAlignVertical: 'top',
  },
  termsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    gap: 10,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Times New Roman',
    lineHeight: 16,
  },
  submitBtn: {
    height: 52,
    borderRadius: 10,
  },
  infoSection: {
    gap: 16,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
  },
  infoDesc: {
    fontSize: 13,
    fontFamily: 'Times New Roman',
    lineHeight: 18,
  }
});

export default StartInterviewScreen;
