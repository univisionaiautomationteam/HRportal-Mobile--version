import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, StatusBar, Dimensions,  } from 'react-native';
import { pick, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTheme } from '../context/ThemeContext';
import { SIZES, TYPOGRAPHY } from '../constants/theme';
import { aiAPI } from '../services/apiService';
import Button from '../components/Button';
import Card from '../components/Card';
import { Sparkles, FileText, Upload, CheckCircle, AlertCircle, Copy, FileDown, Briefcase } from 'lucide-react-native';

export const AIAssistantScreen = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'analyze' | 'suggestions' | 'format'>('analyze');
  const [loading, setLoading] = useState(false);

  /* ================= Resume vs JD ================= */
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [matchPercent, setMatchPercent] = useState(0);

  /* ================= JD Suggestions ================= */
  const [suggestions, setSuggestions] = useState<any>(null);

  /* ================= Format Resume ================= */
  const [formatFile, setFormatFile] = useState<any>(null);
  const [formatFileName, setFormatFileName] = useState("");
  const [resumeFields, setResumeFields] = useState<any>(null);
  const [downloadType, setDownloadType] = useState("pdf");

  /* ================= FILE UPLOAD ================= */

  const handleResumeFile = async () => {
    try {
      const result = await pick({
            type: [types.plainText, types.pdf, types.docx],
});

      if (result && result[0]) {
        const file = result[0];
        setResumeFileName(file.name || "resume");
        setLoading(true);

        const formData = new FormData();
        formData.append("resume", {
          uri: file.uri,
          name: file.name,
          type: file.type || 'application/octet-stream',
        } as any);

        const res = await aiAPI.parseResume(formData);
        setResumeText(res.data.rawText || "");
        Alert.alert("Success", "Resume parsed successfully");
      }
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        // User cancelled the picker
      } else {
        console.error(err);
        Alert.alert("Error", "Resume parsing failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFormatFile = async () => {
    try {
      const result = await pick({
           type: [types.pdf, types.docx, types.plainText],
});

      if (result && result[0]) {
        const file = result[0];
        setFormatFile(file);
        setFormatFileName(file.name || "resume");
        setResumeFields(null);
      }
    } catch (err) {
      if (!isErrorWithCode(err) || err.code !== errorCodes.OPERATION_CANCELED) {
        console.error(err);
        Alert.alert("Error", "File selection failed");
      }
    }
  };

  /* ================= ANALYZE RESUME ================= */

  const handleAnalyzeResume = async () => {
    if (!resumeText || !jobDescription) {
      return Alert.alert("Error", "Upload resume & job description");
    }

    setLoading(true);
    try {
      const res = await aiAPI.analyzeResume({
        resumeText,
        jobDescription,
      });

      const rawScore = res.data.analysis.matchScore ?? 0;
      const percent = rawScore <= 1 ? rawScore * 100 : rawScore;

      setAnalysis(res.data.analysis);
      setMatchPercent(Math.min(100, Math.round(percent)));
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= JD SUGGESTIONS ================= */

  const handleGetSuggestions = async () => {
    if (!jobDescription) return Alert.alert("Error", "Enter Job Description");

    setLoading(true);
    try {
      const res = await aiAPI.getJDSuggestions({ jobDescription });
      setSuggestions(res.data.suggestions);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to generate JD suggestions");
    } finally {
      setLoading(false);
    }
  };

  /* ================= FORMAT RESUME FLOW ================= */

  const handleConvertResume = async () => {
    if (!formatFile) return Alert.alert("Error", "Upload resume");

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("resume", {
        uri: formatFile.uri,
        name: formatFile.name,
        type: formatFile.type || 'application/octet-stream',
      } as any);

      const res = await aiAPI.convertResumeFormat(formData);
      setResumeFields(res.data.fields);
      Alert.alert("Success", "Fields extracted. Edit below.");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Extraction failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setResumeFields((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const candidateName = (resumeFields?.name || "Resume").trim().replace(/\s+/g, "_");
      await aiAPI.downloadFormattedResume({
        ...resumeFields,
        format: downloadType,
        originalFileName: `UTS_${candidateName}`,
      });

      Alert.alert("Download Initiated", `Your formatted resume (UTS_${candidateName}.${downloadType}) is being prepared. Check your email or downloads.`);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Download failed");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    Clipboard.setString(text);
    Alert.alert("Copied", "Text copied to clipboard");
  };

  /* ================= UI ================= */

  const getScoreColor = () => {
    if (matchPercent >= 75) return '#10b981';
    if (matchPercent >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>AI Assistant</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>AI-powered resume matching & job intelligence</Text>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: theme.surface }]}>
          {(['analyze', 'suggestions', 'format'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.tabActive
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === tab ? '#FFFFFF' : theme.textSecondary }
              ]}>
                {tab === 'analyze' ? 'Resume vs JD' : tab === 'suggestions' ? 'JD Suggestions' : 'Format Resume'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ================= Resume vs JD ================= */}
        {activeTab === 'analyze' && (
          <View style={styles.panel}>
            <View style={styles.uploadBox}>
              <TouchableOpacity
                style={[styles.uploadBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
                onPress={handleResumeFile}
                disabled={loading}
              >
                {loading && activeTab === 'analyze' ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <View style={styles.btnContent}>
                    <Upload size={18} color={theme.textSecondary} />
                    <Text style={[styles.uploadBtnText, { color: theme.textSecondary }]}>
                      {resumeFileName || "Upload Resume"}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              {resumeFileName ? <Text style={styles.fileNameBadge}>{resumeFileName}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Job Description</Text>
              <TextInput
                style={[styles.textarea, { color: theme.text, borderColor: theme.border, backgroundColor: '#fafbfc' }]}
                placeholder="Paste job description here..."
                multiline
                numberOfLines={6}
                value={jobDescription}
                onChangeText={setJobDescription}
              />
            </View>

            <Button
              label={loading ? "Analyzing..." : "Analyze Resume"}
              onPress={handleAnalyzeResume}
              disabled={loading}
              style={styles.primaryBtn}
            />

            {analysis && (
              <View style={styles.results}>
                <Text style={[styles.resultsTitle, { color: theme.text }]}>Match Score</Text>
                <View style={styles.scoreDisplay}>
                  <Text style={[styles.scoreNumber, { color: getScoreColor() }]}>{matchPercent}%</Text>
                  <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>
                    {matchPercent >= 75 ? "Excellent Match" : matchPercent >= 50 ? "Moderate Match" : "Room to Improve"}
                  </Text>
                </View>

                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${matchPercent}%`, backgroundColor: getScoreColor() }]} />
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Strengths</Text>
                  <View style={styles.tags}>
                    {analysis.strengths?.map((item: string, idx: number) => (
                      <View key={idx} style={[styles.tag, styles.tagGreen]}>
                        <Text style={styles.tagGreenText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Missing Skills</Text>
                  <View style={styles.tags}>
                    {analysis.missingSkills?.map((item: string, idx: number) => (
                      <View key={idx} style={[styles.tag, styles.tagYellow]}>
                        <Text style={styles.tagYellowText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>AI Recommendation</Text>
                  <View style={styles.recommendationBox}>
                    <Text style={styles.recommendationText}>{analysis.recommendation}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ================= JD Suggestions ================= */}
        {activeTab === 'suggestions' && (
          <View style={styles.panel}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>📋 Job Description</Text>
              <TextInput
                style={[styles.textarea, { color: theme.text, borderColor: theme.border, backgroundColor: '#fafbfc' }]}
                placeholder="Paste job description here..."
                multiline
                numberOfLines={6}
                value={jobDescription}
                onChangeText={setJobDescription}
              />
            </View>

            <Button
              label={loading ? "Generating..." : "Generate Suggestions"}
              onPress={handleGetSuggestions}
              disabled={loading}
              style={styles.primaryBtn}
            />

            {suggestions && (
              <View style={styles.results}>
                <Text style={[styles.resultsTitle, { color: theme.text }]}>JD Search Helper</Text>

                <View style={styles.actionBtns}>
                  <TouchableOpacity style={[styles.btnSmall, styles.btnOutline]} onPress={() => copyToClipboard(JSON.stringify(suggestions, null, 2))}>
                    <Text style={styles.btnOutlineText}>Copy All Keywords</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btnSmall, styles.btnSuccess]} onPress={() => copyToClipboard(suggestions.booleanSearch)}>
                    <Text style={styles.btnSuccessText}>Copy Boolean Search</Text>
                  </TouchableOpacity>
                </View>

                {[
                  { title: 'Job Titles', items: suggestions.jobTitles, color: 'blue' },
                  { title: 'Primary Skills', items: suggestions.primarySkills, color: 'purple' },
                  { title: 'Secondary Skills', items: suggestions.secondarySkills, color: 'gray' },
                  { title: 'Tools & Technologies', items: suggestions.toolsAndTechnologies, color: 'gray' },
                ].map((sec, idx) => (
                  <View key={idx} style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>{sec.title}</Text>
                    <View style={styles.tags}>
                      {sec.items?.map((item: string, i: number) => (
                        <View key={i} style={[styles.tag, sec.color === 'blue' ? styles.tagBlue : sec.color === 'purple' ? styles.tagPurple : styles.tagGray]}>
                          <Text style={sec.color === 'blue' ? styles.tagBlueText : sec.color === 'purple' ? styles.tagPurpleText : styles.tagGrayText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}

                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Boolean Search</Text>
                  <View style={styles.booleanBox}>
                    <Text style={styles.booleanText}>{suggestions.booleanSearch}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ================= Format Resume ================= */}
        {activeTab === 'format' && (
          <View style={styles.panel}>
            <View style={styles.uploadBox}>
              <TouchableOpacity
                style={[styles.uploadBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
                onPress={handleFormatFile}
                disabled={loading}
              >
                <View style={styles.btnContent}>
                  <FileText size={18} color={theme.textSecondary} />
                  <Text style={[styles.uploadBtnText, { color: theme.textSecondary }]}>
                    {formatFileName || "Upload Resume"}
                  </Text>
                </View>
              </TouchableOpacity>
              {formatFileName ? <Text style={styles.fileNameBadge}>{formatFileName}</Text> : null}
            </View>

            {formatFile && !resumeFields && (
              <Button
                label={loading ? "Extracting..." : "Extract Resume Data"}
                onPress={handleConvertResume}
                disabled={loading}
                style={styles.primaryBtn}
              />
            )}

            {resumeFields && (
              <View style={styles.results}>
                <Text style={[styles.resultsTitle, { color: theme.text }]}>Edit Resume Fields</Text>

                {(() => {
                  const FIELD_ORDER = [
                    'name', 'role', 'total_experience', 'objective',
                    'professional_summary', 'skills', 'technical_skills',
                    'work_experience', 'projects', 'professional_development', 'education'
                  ];
                  const multilineKeys = [
                    'skills', 'technical_skills', 'work_experience', 'projects',
                    'professional_development', 'education', 'professional_summary', 'objective'
                  ];
                  const orderedEntries = [
                    ...FIELD_ORDER.filter(k => k in resumeFields).map(k => [k, resumeFields[k]]),
                    ...Object.entries(resumeFields).filter(([k]) => !FIELD_ORDER.includes(k)),
                  ];

                  return orderedEntries.map(([key, value]) => (
                    <View key={key} style={styles.inputGroup}>
                      <Text style={[styles.label, { color: theme.text }]}>
                        {key.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </Text>
                      <TextInput
                        style={[styles.textarea, { color: theme.text, borderColor: theme.border, backgroundColor: '#fafbfc' }]}
                        multiline
                        numberOfLines={multilineKeys.includes(key) ? 6 : 2}
                        value={String(value || "")}
                        onChangeText={(t) => handleFieldChange(key, t)}
                      />
                    </View>
                  ));
                })()}

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Download Format</Text>
                  <View style={styles.pickerRow}>
                    {['pdf', 'docx'].map(f => (
                      <TouchableOpacity
                        key={f}
                        style={[styles.pickerBtn, downloadType === f && { backgroundColor: theme.primary }]}
                        onPress={() => setDownloadType(f)}
                      >
                        <Text style={[styles.pickerBtnText, downloadType === f && { color: '#fff' }]}>{f.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <Button
                  label={loading ? "Preparing..." : "Download Resume"}
                  onPress={handleDownload}
                  disabled={loading}
                  style={styles.successBtn}
                />
              </View>
            )}
          </View>
        )}
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
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Times New Roman',
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#4a5fda',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  },
  panel: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  uploadBox: {
    marginBottom: 20,
    alignItems: 'center',
  },
  uploadBtn: {
    width: '100%',
    height: 60,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadBtnText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  },
  fileNameBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e7f5ff',
    color: '#1971c2',
    fontSize: 13,
    borderRadius: 6,
    fontWeight: '500',
    fontFamily: 'Times New Roman',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
    marginBottom: 8,
  },
  textarea: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 14,
    fontFamily: 'Times New Roman',
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 10,
    backgroundColor: '#4a5fda',
  },
  results: {
    marginTop: 32,
    borderTopWidth: 2,
    borderTopColor: '#f1f3f5',
    paddingTop: 24,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
    marginBottom: 20,
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '800',
    fontFamily: 'Times New Roman',
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  },
  progressBar: {
    width: '100%',
    height: 12,
    backgroundColor: '#e9ecef',
    borderRadius: 6,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#fafbfc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f3f5',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
    marginBottom: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagGreen: { backgroundColor: '#d1fae5', borderColor: '#6ee7b7' },
  tagGreenText: { color: '#065f46', fontWeight: '600', fontSize: 13, fontFamily: 'Times New Roman' },
  tagYellow: { backgroundColor: '#fef3c7', borderColor: '#fcd34d' },
  tagYellowText: { color: '#92400e', fontWeight: '600', fontSize: 13, fontFamily: 'Times New Roman' },
  tagBlue: { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
  tagBlueText: { color: '#1e40af', fontWeight: '600', fontSize: 13, fontFamily: 'Times New Roman' },
  tagPurple: { backgroundColor: '#e0e7ff', borderColor: '#a5b4fc' },
  tagPurpleText: { color: '#4338ca', fontWeight: '600', fontSize: 13, fontFamily: 'Times New Roman' },
  tagGray: { backgroundColor: '#f1f3f5', borderColor: '#dee2e6' },
  tagGrayText: { color: '#495057', fontWeight: '600', fontSize: 13, fontFamily: 'Times New Roman' },
  recommendationBox: {
    padding: 16,
    backgroundColor: '#f0f4ff',
    borderLeftWidth: 4,
    borderLeftColor: '#4a5fda',
    borderRadius: 8,
  },
  recommendationText: {
    fontSize: 14,
    fontFamily: 'Times New Roman',
    lineHeight: 22,
  },
  actionBtns: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  btnSmall: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnOutline: {
    borderWidth: 2,
    borderColor: '#4a5fda',
  },
  btnOutlineText: { color: '#4a5fda', fontWeight: '600', fontFamily: 'Times New Roman' },
  btnSuccess: {
    backgroundColor: '#10b981',
  },
  btnSuccessText: { color: '#fff', fontWeight: '600', fontFamily: 'Times New Roman' },
  booleanBox: {
    padding: 16,
    backgroundColor: '#1e293b',
    borderRadius: 10,
  },
  booleanText: {
    color: '#10b981',
    fontFamily: 'Courier',
    fontSize: 13,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  },
  successBtn: {
    backgroundColor: '#10b981',
    height: 52,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Times New Roman',
    color: '#6c757d',
  }
});

export default AIAssistantScreen;
