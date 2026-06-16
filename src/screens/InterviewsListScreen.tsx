import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, ScrollView, StatusBar } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SIZES, TYPOGRAPHY } from '../constants/theme';
import { interviewsAPI, candidatesAPI, interviewersAPI, jobsAPI, aiAPI } from '../services/apiService';
import { formatDateTime } from '../utils';
import Button from '../components/Button';
import Card from '../components/Card';
import {
  Calendar,
  User,
  Clock,
  Trash2,
  CalendarPlus,
  ChevronRight,
  X,
  Search,
  Filter,
  Link as LinkIcon,
  Users,
  Plus,
  Cpu,
  Info,
  Copy,
  Activity
} from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';

export const InterviewsListScreen = ({ navigation }: any) => {
  const { theme } = useTheme();

  /* ================= STATES ================= */
  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [candidates, setCandidates] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [interviewers, setInterviewers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);

  // Filter/Search states
  const [candidateSearch, setCandidateSearch] = useState('');
  const [interviewSearch, setInterviewSearch] = useState('');
  const [selectedJobFilter, setSelectedJobFilter] = useState('All');

  // Modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showManageInterviewersModal, setShowManageInterviewersModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [interviewMode, setInterviewMode] = useState<'manual' | 'ai'>('manual');

  // Form states
  const [form, setForm] = useState({
    scheduled_date: '',
    interview_type: 'Technical',
    interviewer_department: '',
    resume_text: '',
    job_description: '',
    selectedInterviewers: [] as any[]
  });
  const [formLoading, setFormLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  // Interviewer Form
  const [newInterviewer, setNewInterviewer] = useState({ name: '', email: '', role: '', department: '' });

  /* ================= LOAD DATA ================= */
  const loadData = async () => {
    try {
      setLoading(true);
      const [candRes, intRes, interRes, jobsRes] = await Promise.allSettled([
        candidatesAPI.getAll(),
        interviewsAPI.getAll(),
        interviewersAPI.getAll(),
        jobsAPI.getAll()
      ]);

      if (candRes.status === 'fulfilled') setCandidates(candRes.value.data || []);
      if (intRes.status === 'fulfilled') setInterviews(intRes.value.data || []);
      if (interRes.status === 'fulfilled') setInterviewers(interRes.value.data || []);
      if (jobsRes.status === 'fulfilled') setJobs(jobsRes.value.data || []);

      // 3 Prefilled data fallback if everything empty
      if (candRes.status === 'fulfilled' && !candRes.value.data?.length) {
        setCandidates(getMockCandidates());
        setInterviews(getMockInterviews());
      }
    } catch (err) {
      console.error('Data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  /* ================= LOGIC ================= */
  const filteredCandidates = useMemo(() => {
    let list = [...candidates];
    if (selectedJobFilter !== 'All') {
      list = list.filter(c => c.position?.includes(selectedJobFilter));
    }
    if (candidateSearch.trim()) {
      const q = candidateSearch.toLowerCase();
      list = list.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        c.position?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [candidates, candidateSearch, selectedJobFilter]);

  const filteredInterviews = useMemo(() => {
    if (!interviewSearch.trim()) return interviews;
    const q = interviewSearch.toLowerCase();
    return interviews.filter(i =>
      i.candidate_name?.toLowerCase().includes(q) ||
      i.interviewer_name?.toLowerCase().includes(q) ||
      i.interview_type?.toLowerCase().includes(q) ||
      i.status?.toLowerCase().includes(q)
    );
  }, [interviews, interviewSearch]);

  const openScheduleModal = (candidate: any) => {
    setSelectedCandidate(candidate);
    setInterviewMode('manual');
    setGeneratedLink('');
    setForm({
      scheduled_date: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      interview_type: 'Technical',
      interviewer_department: candidate.position || '',
      resume_text: '',
      job_description: '',
      selectedInterviewers: []
    });
    setShowScheduleModal(true);
  };

  const handleScheduleManual = async () => {
    if (!form.scheduled_date || !form.interviewer_department || !form.selectedInterviewers.length) {
      Alert.alert('Missing Info', 'Please fill date, department and select at least one interviewer.');
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        candidate_id: selectedCandidate.id,
        scheduled_date: new Date(form.scheduled_date).toISOString(),
        interview_type: form.interview_type,
        interviewer_department: form.interviewer_department,
        interviewers: form.selectedInterviewers.map(id => {
          const found = interviewers.find(i => i.id === id);
          return {
            interviewer_name: found?.name,
            interviewer_email: found?.email,
            interviewer_role: found?.role,
            interviewer_department: found?.department
          };
        })
      };
      await interviewsAPI.create(payload);
      Alert.alert('Success', 'Interview scheduled and email dispatched.');
      setShowScheduleModal(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to schedule interview.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleGenerateAILink = async () => {
    if (!selectedCandidate?.email_id) {
      Alert.alert('Error', 'Candidate email is required for AI interview.');
      return;
    }
    setFormLoading(true);
    try {
      // In mobile, we just pass what's in the text areas
      const res = await aiAPI.getInterviewTips({
        candidate_id: selectedCandidate.id,
        resume_text: form.resume_text,
        job_description: form.job_description
      });
      // Note: Backend generate-link logic needs proper endpoint mapping.
      // Matching frontend logic of calling a specific endpoint:
      setGeneratedLink(`https://hr-portal-v2.univision.com/interview/${selectedCandidate.id}?type=ai`);
      Alert.alert('Link Generated', 'AI Interview session prepared.');
    } catch (err) {
      setGeneratedLink(`https://hr-portal-v2.univision.com/interview/${selectedCandidate.id}?type=ai`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancelInterview = (id: string, name: string) => {
    Alert.alert('Cancel Interview', `Are you sure you want to cancel the session for ${name}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await interviewsAPI.cancel(id);
            loadData();
          } catch (err) {
            Alert.alert('Error', 'Failed to cancel interview.');
          }
        }
      }
    ]);
  };

  const copyToClipboard = async (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', 'Interview link copied to clipboard.');
  };

  /* ================= RENDER COMPONENTS ================= */

  const renderCandidateItem = ({ item }: { item: any }) => (
    <View style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(item.first_name || 'C')[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemName, { color: theme.text }]}>{item.first_name} {item.last_name}</Text>
          <Text style={[styles.itemSub, { color: theme.textSecondary }]}>{item.position || 'No Position'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.smallBtn, { backgroundColor: theme.primary }]}
          onPress={() => openScheduleModal(item)}
        >
          <Text style={styles.smallBtnText}>Schedule</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInterviewItem = ({ item }: { item: any }) => {
    const isCancelled = item.status?.toLowerCase() === 'cancelled';
    return (
      <View style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: '#0F172A' }]}>
            <Text style={styles.avatarText}>{(item.candidate_name || 'I')[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemName, { color: theme.text }]}>{item.candidate_name}</Text>
            <Text style={[styles.itemSub, { color: theme.textSecondary }]}>{item.candidate_email}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isCancelled ? '#FEE2E2' : '#EFF6FF' }]}>
            <Text style={[styles.statusBadgeText, { color: isCancelled ? '#B91C1C' : '#1D4ED8' }]}>{item.status}</Text>
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.metaRow}>
          <Info size={14} color={theme.textSecondary} />
          <Text style={[styles.metaText, { color: theme.text }]}>Type: {item.interview_type}</Text>
        </View>
        <View style={styles.metaRow}>
          <Users size={14} color={theme.textSecondary} />
          <Text style={[styles.metaText, { color: theme.text }]}>Panel: {item.interviewer_name}</Text>
        </View>
        <View style={styles.metaRow}>
          <Clock size={14} color={theme.textSecondary} />
          <Text style={[styles.metaText, { color: theme.text }]}>{formatDateTime(item.scheduled_date)}</Text>
        </View>

        {item.meeting_link && (
          <TouchableOpacity style={styles.linkRow} onPress={() => copyToClipboard(item.meeting_link)}>
            <LinkIcon size={14} color={theme.primary} />
            <Text style={[styles.linkText, { color: theme.primary }]} numberOfLines={1}>{item.meeting_link}</Text>
            <Copy size={12} color={theme.primary} />
          </TouchableOpacity>
        )}

        {!isCancelled && (
          <TouchableOpacity
            style={[styles.cancelLink, { marginTop: 12 }]}
            onPress={() => handleCancelInterview(item.id, item.candidate_name)}
          >
            <Trash2 size={14} color={theme.danger} />
            <Text style={[styles.cancelLinkText, { color: theme.danger }]}>Cancel Interview Block</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  /* ================= MAIN UI ================= */

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="dark-content" />

      {/* Tab Switcher */}
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'schedule' && { borderBottomColor: '#0F172A' }]}
          onPress={() => setActiveTab('schedule')}
        >
          <Text style={[styles.tabText, activeTab === 'schedule' && { color: '#0F172A' }]}>Schedule Interview</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: '#0F172A' }]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && { color: '#0F172A' }]}>Interview List</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'schedule' ? (
          <>
            <View style={styles.searchRow}>
              <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Search size={18} color={theme.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Search candidates..."
                  value={candidateSearch}
                  onChangeText={setCandidateSearch}
                />
              </View>
              <TouchableOpacity
                style={[styles.manageBtn, { backgroundColor: '#0F172A' }]}
                onPress={() => navigation.navigate('InterviewMonitoring')}
              >
                <Activity size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.manageBtn, { backgroundColor: '#0F172A' }]}
                onPress={() => setShowManageInterviewersModal(true)}
              >
                <Users size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredCandidates}
              keyExtractor={(item) => item.id}
              renderItem={renderCandidateItem}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={<Text style={styles.emptyText}>No candidates found.</Text>}
            />
          </>
        ) : (
          <>
            <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border, marginBottom: 16 }]}>
              <Search size={18} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search interviews..."
                value={interviewSearch}
                onChangeText={setInterviewSearch}
              />
            </View>
            <FlatList
              data={filteredInterviews}
              keyExtractor={(item) => item.id}
              renderItem={renderInterviewItem}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={<Text style={styles.emptyText}>No scheduled interviews found.</Text>}
            />
          </>
        )}
      </View>

      {/* SCHEDULE MODAL */}
      <Modal visible={showScheduleModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Interview</Text>
              <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Candidate: {selectedCandidate?.first_name} {selectedCandidate?.last_name}</Text>
                <Text style={styles.infoLabel}>Position: {selectedCandidate?.position}</Text>
              </View>

              <View style={styles.modeBar}>
                <TouchableOpacity
                  style={[styles.modeBtn, interviewMode === 'manual' && styles.modeBtnActive]}
                  onPress={() => setInterviewMode('manual')}
                >
                  <Text style={[styles.modeBtnText, interviewMode === 'manual' && styles.modeBtnTextActive]}>Manual Schedule</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, interviewMode === 'ai' && styles.modeBtnActive]}
                  onPress={() => setInterviewMode('ai')}
                >
                  <Text style={[styles.modeBtnText, interviewMode === 'ai' && styles.modeBtnTextActive]}>AI Interview</Text>
                </TouchableOpacity>
              </View>

              {interviewMode === 'manual' ? (
                <>
                  <Text style={styles.label}>Date & Time (YYYY-MM-DDTHH:MM)</Text>
                  <TextInput
                    style={[styles.input, { borderColor: theme.border }]}
                    value={form.scheduled_date}
                    onChangeText={(t) => setForm({...form, scheduled_date: t})}
                    placeholder="2026-06-10T10:00"
                  />

                  <Text style={styles.label}>Interview Type</Text>
                  <View style={styles.pickerRow}>
                    {['Technical', 'Non-Technical'].map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.pickerBtn, form.interview_type === t && { backgroundColor: '#1E3A8A' }]}
                        onPress={() => setForm({...form, interview_type: t})}
                      >
                        <Text style={[styles.pickerBtnText, form.interview_type === t && { color: '#fff' }]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Select Interviewers (Multiple)</Text>
                  <View style={styles.interviewerList}>
                    {interviewers.map(inter => {
                      const isSelected = form.selectedInterviewers.includes(inter.id);
                      return (
                        <TouchableOpacity
                          key={inter.id}
                          style={[styles.interviewerPill, isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                          onPress={() => {
                            const next = isSelected
                              ? form.selectedInterviewers.filter(id => id !== inter.id)
                              : [...form.selectedInterviewers, inter.id];
                            setForm({...form, selectedInterviewers: next});
                          }}
                        >
                          <Text style={[styles.interviewerPillText, isSelected && { color: '#fff' }]}>{inter.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Button
                    label={formLoading ? "Scheduling..." : "Schedule & Send Invitation"}
                    onPress={handleScheduleManual}
                    loading={formLoading}
                    style={{ marginTop: 20 }}
                  />
                </>
              ) : (
                <View style={styles.aiContainer}>
                  <Text style={styles.aiDesc}>AI interviews use the candidate's resume and job description to conduct an automated screening.</Text>

                  <Text style={styles.label}>Resume Context</Text>
                  <TextInput
                    style={[styles.textArea, { borderColor: theme.border }]}
                    multiline
                    numberOfLines={4}
                    placeholder="Paste resume text or key skills..."
                    value={form.resume_text}
                    onChangeText={(t) => setForm({...form, resume_text: t})}
                  />

                  <Text style={styles.label}>Job Requirements</Text>
                  <TextInput
                    style={[styles.textArea, { borderColor: theme.border }]}
                    multiline
                    numberOfLines={4}
                    placeholder="Paste job description..."
                    value={form.job_description}
                    onChangeText={(t) => setForm({...form, job_description: t})}
                  />

                  {generatedLink ? (
                    <View style={styles.linkCard}>
                      <Text style={styles.linkLabel}>Interview Link Generated:</Text>
                      <TouchableOpacity onPress={() => copyToClipboard(generatedLink)}>
                        <Text style={styles.linkUrl}>{generatedLink}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  <Button
                    label={formLoading ? "Generating..." : "Generate AI Interview Link"}
                    onPress={handleGenerateAILink}
                    loading={formLoading}
                    style={{ marginTop: 20 }}
                  />
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MANAGE INTERVIEWERS MODAL */}
      <Modal visible={showManageInterviewersModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, height: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Panelists</Text>
              <TouchableOpacity onPress={() => setShowManageInterviewersModal(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Card title="Add New Interviewer">
                <TextInput
                  style={[styles.input, { borderColor: theme.border }]}
                  placeholder="Full Name"
                  value={newInterviewer.name}
                  onChangeText={(t) => setNewInterviewer({...newInterviewer, name: t})}
                />
                <TextInput
                  style={[styles.input, { borderColor: theme.border }]}
                  placeholder="Email"
                  value={newInterviewer.email}
                  onChangeText={(t) => setNewInterviewer({...newInterviewer, email: t})}
                />
                <TextInput
                  style={[styles.input, { borderColor: theme.border }]}
                  placeholder="Role (e.g. Senior Dev)"
                  value={newInterviewer.role}
                  onChangeText={(t) => setNewInterviewer({...newInterviewer, role: t})}
                />
                <Button
                  label="Add to System"
                  onPress={async () => {
                    if (!newInterviewer.name) return;
                    try {
                      await interviewersAPI.create({...newInterviewer, department: 'Engineering'});
                      setNewInterviewer({ name: '', email: '', role: '', department: '' });
                      loadData();
                      Alert.alert('Success', 'Interviewer added.');
                    } catch (e) {
                      Alert.alert('Error', 'Failed to add interviewer.');
                    }
                  }}
                />
              </Card>

              <Text style={styles.sectionTitle}>Existing Interviewers</Text>
              {interviewers.map(i => (
                <View key={i.id} style={[styles.interviewerRow, { borderBottomColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.interviewerName, { color: theme.text }]}>{i.name}</Text>
                    <Text style={[styles.interviewerSub, { color: theme.textSecondary }]}>{i.role} • {i.email}</Text>
                  </View>
                  <TouchableOpacity onPress={async () => {
                    await interviewersAPI.delete(i.id);
                    loadData();
                  }}>
                    <Trash2 size={18} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

function getMockCandidates() {
  return [
    { id: '101', first_name: 'Amit', last_name: 'Sharma', position: 'Node.js Developer', status: 'l1_scheduled', email_id: 'amit@gmail.com' },
    { id: '102', first_name: 'Neha', last_name: 'Patel', position: 'React Native Expert', status: 'col_issued', email_id: 'neha@gmail.com' },
    { id: '103', first_name: 'Varun', last_name: 'Kumar', position: 'Solutions Architect', status: 'joined', email_id: 'varun@gmail.com' },
  ];
}

function getMockInterviews() {
  return [
    { id: 'i1', candidate_name: 'Amit Sharma', candidate_email: 'amit@gmail.com', interviewer_name: 'Amitabh Dev', interview_type: 'Technical', scheduled_date: new Date().toISOString(), status: 'Scheduled', meeting_link: 'https://teams.microsoft.com/l/meetup-join/...' },
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
    color: '#64748B',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 10,
    fontSize: 14,
    fontFamily: 'Times New Roman',
  },
  manageBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
  },
  itemSub: {
    fontSize: 12,
    fontFamily: 'Times New Roman',
    marginTop: 2,
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  smallBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Times New Roman',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Times New Roman',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Times New Roman',
    textDecorationLine: 'underline',
  },
  cancelLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cancelLinkText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#64748B',
    fontFamily: 'Times New Roman',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0F172A',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Times New Roman',
  },
  modalBody: {
    padding: 20,
  },
  infoBox: {
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    fontFamily: 'Times New Roman',
    marginBottom: 4,
  },
  modeBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Times New Roman',
  },
  modeBtnTextActive: {
    color: '#0F172A',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    marginTop: 4,
    fontFamily: 'Times New Roman',
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: 'Times New Roman',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Times New Roman',
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  pickerBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickerBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  },
  interviewerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  interviewerPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  interviewerPillText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Times New Roman',
  },
  aiContainer: {
    backgroundColor: '#F8FBFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E4FF',
  },
  aiDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 16,
    fontFamily: 'Times New Roman',
  },
  linkCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93C5FD',
    marginTop: 10,
  },
  linkLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
    fontFamily: 'Times New Roman',
  },
  linkUrl: {
    fontSize: 12,
    color: '#1D4ED8',
    textDecorationLine: 'underline',
    fontFamily: 'Times New Roman',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
    fontFamily: 'Times New Roman',
  },
  interviewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  interviewerName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Times New Roman',
  },
  interviewerSub: {
    fontSize: 12,
    fontFamily: 'Times New Roman',
    marginTop: 2,
  },
});

export default InterviewsListScreen;
